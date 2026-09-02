import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";
import { parseOswiadczeniePdf } from "@/lib/pdf-parser";
import { deactivatePreviousResidencePermits, namesMatch } from "@/lib/fdk-queries";

// Allow up to 60s for upload (large scanned documents from phones can be 5-10 MB)
export const maxDuration = 60;

/**
 * POST /api/fdk/attachments/upload
 *
 * Upload załącznika do Supabase Storage + zapis metadanych w DB.
 * FormData: file, foreignerId, kategoria, nazwaWyswietlana, opis?
 */
export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin();
  const changedBy = adminUser.email ?? adminUser.id ?? "system";

  // Check if this is a presigned upload request (JSON body, for large files)
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return handlePresignedUpload(request, changedBy);
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const foreignerIdStr = formData.get("foreignerId") as string | null;
  const kategoria = (formData.get("kategoria") as string) ?? "glowne";
  const nazwaWyswietlana = (formData.get("nazwaWyswietlana") as string) ?? file?.name ?? "Bez nazwy";
  const opis = (formData.get("opis") as string) || null;

  if (!file || !foreignerIdStr) {
    return NextResponse.json({ error: "file and foreignerId required" }, { status: 400 });
  }

  const foreignerId = parseInt(foreignerIdStr, 10);
  if (isNaN(foreignerId)) {
    return NextResponse.json({ error: "Invalid foreignerId" }, { status: 400 });
  }

  // Verify foreigner exists
  const foreigner = await db.fdkForeigner.findUnique({ where: { id: foreignerId } });
  if (!foreigner) {
    return NextResponse.json({ error: "Foreigner not found" }, { status: 404 });
  }

  // Determine file type
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const typPliku = ext === "jpg" ? "jpeg" : ext;

  // Upload to Supabase Storage
  const storagePath = `${foreignerId}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const supabase = createSupabaseAdminClient();

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("fdk-attachments")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[fdk/upload] Storage error:", uploadError.message);
    return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
  }

  // Save metadata to DB
  const attachment = await db.fdkAttachment.create({
    data: {
      foreignerId,
      kategoria,
      nazwaWyswietlana,
      nazwaPliku: file.name,
      opis,
      typPliku,
      storagePath,
      rozmiarBytes: file.size,
    },
  });

  // Log upload to history
  await db.fdkChangeLog.create({
    data: {
      foreignerId,
      changedBy,
      field: "attachment_upload",
      oldValue: null,
      newValue: `Wgrano załącznik: ${nazwaWyswietlana} (${kategoria})`,
    },
  });

  // Auto-extract data from PDF attachments (text layer only — no OCR on upload for speed).
  // Use the Scrape button to trigger full OCR for scanned PDFs.
  let extracted = null;
  if (typPliku === "pdf") {
    try {
      const parsed = await parseOswiadczeniePdf(arrayBuffer, { ocrFallback: false, filename: file.name });
      if (parsed) {
        extracted = parsed;

        // Auto-fill foreigner data if fields are empty
        const updateData: Record<string, unknown> = {};
        if (parsed.imie && !foreigner.imie) updateData.imie = parsed.imie;
        if (parsed.nazwisko && foreigner.nazwisko === "Nowy") updateData.nazwisko = parsed.nazwisko;
        if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) updateData.dataUrodzenia = new Date(parsed.dataUrodzenia);
        if (parsed.obywatelstwo && !foreigner.obywatelstwo) updateData.obywatelstwo = parsed.obywatelstwo;
        if (parsed.nrPaszportu && !foreigner.nrPaszportu) updateData.nrPaszportu = parsed.nrPaszportu;

        if (Object.keys(updateData).length > 0) {
          await db.fdkForeigner.update({ where: { id: foreignerId }, data: updateData });
          // Log auto-filled foreigner fields
          for (const [key, value] of Object.entries(updateData)) {
            await db.fdkChangeLog.create({
              data: {
                foreignerId,
                changedBy,
                field: key,
                oldValue: null,
                newValue: value instanceof Date ? value.toISOString().slice(0, 10) : String(value),
              },
            });
          }
        }

        // Check if document belongs to a different person
        const extractedFullName = `${parsed.imie ?? ""} ${parsed.nazwisko ?? ""}`.trim();
        const profileFullName = `${foreigner.imie ?? ""} ${foreigner.nazwisko ?? ""}`.trim();
        const isDifferentPerson = extractedFullName.length > 2
          && profileFullName.length > 2
          && foreigner.nazwisko !== "Nowy"
          && !namesMatch(extractedFullName, profileFullName);

        if (isDifferentPerson) {
          // Flag the attachment — do NOT create employment base
          await db.fdkAttachment.update({
            where: { id: attachment.id },
            data: { opis: `\u26a0 Dokument innej osoby: ${extractedFullName}` },
          });
          await db.fdkChangeLog.create({
            data: {
              foreignerId,
              changedBy,
              field: "scrape",
              oldValue: null,
              newValue: `Upload ${file.name}: rozpoznano INNA OSOBE (${extractedFullName}) — podstawa NIE utworzona. Profil: ${profileFullName}.`,
            },
          });
          // Skip employment base creation but still return extracted data
        } else if (parsed.detectedType === "ODWOLANIE") {
          // ODWOLANIE: do NOT create employment base on upload either
          // Skip — just keep the attachment and foreigner data updates above
        } else if (!parsed.detectedType) {
          // Unknown document type — do NOT create employment base with a guessed type
          // Skip — just keep the attachment and foreigner data updates above
        } else {
        // Create employment base for recognized types
        const docType = parsed.detectedType as "ZEZWOLENIE" | "OSWIADCZENIE" | "KARTA_POBYTU" | "BLUE_CARD" | "ZGLOSZENIE_UA";

        // Match existing base by DOCUMENT NUMBER first, then by dates
        let existingBase = null;
        if (docType === "OSWIADCZENIE" && parsed.nrOswiadczenia) {
          existingBase = await db.fdkEmploymentBase.findFirst({
            where: { foreignerId, typ: docType, nrOswiadczenia: parsed.nrOswiadczenia },
          });
        } else if (docType !== "OSWIADCZENIE" && parsed.nrDecyzji) {
          existingBase = await db.fdkEmploymentBase.findFirst({
            where: { foreignerId, typ: docType, nrDecyzji: parsed.nrDecyzji },
          });
        }
        // Fallback: match by exact dates (both must be present and match)
        if (!existingBase && parsed.dataOd && parsed.dataDo) {
          existingBase = await db.fdkEmploymentBase.findFirst({
            where: {
              foreignerId,
              typ: docType,
              dataOd: new Date(parsed.dataOd),
              dataDo: new Date(parsed.dataDo),
            },
          });
        }

        // Build type-specific data
        const baseData: Record<string, unknown> = {
          foreignerId,
          typ: docType,
          status: "BRAK_DANYCH",
          dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
          dataDo: parsed.dataDo ? new Date(parsed.dataDo) : null,
          rodzajUmowy: parsed.rodzajUmowy || null,
          stanowisko: parsed.stanowisko || null,
          firma: parsed.firma || null,
        };

        if (docType === "OSWIADCZENIE") {
          baseData.nrOswiadczenia = parsed.nrOswiadczenia || null;
          baseData.podjeciePracy = parsed.rodzajPracy || null;
          baseData.nrDecyzji = null;
        } else {
          baseData.nrDecyzji = parsed.nrDecyzji || null;
          baseData.nrOswiadczenia = null;
        }

        // Map wynagrodzenie to stawka if available
        if (parsed.wynagrodzenie) {
          const numMatch = parsed.wynagrodzenie.match(/([0-9]+[.,]?\d*)/);
          if (numMatch) {
            baseData.stawka = parseFloat(numMatch[1].replace(",", "."));
          }
        }

        let baseId: number;
        if (existingBase) {
          // Only update fields that have new non-null values — never null-out existing data
          const updateFields: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(baseData)) {
            if (key === "foreignerId") continue; // skip FK
            if (value !== null && value !== undefined) {
              updateFields[key] = value;
            }
          }
          await db.fdkEmploymentBase.update({
            where: { id: existingBase.id },
            data: updateFields,
          });
          baseId = existingBase.id;
        } else {
          const base = await db.fdkEmploymentBase.create({ data: baseData as never });
          baseId = base.id;
        }

        // Log auto-created/updated employment base
        await db.fdkChangeLog.create({
          data: {
            foreignerId,
            changedBy,
            field: "employment_base_auto",
            oldValue: null,
            newValue: existingBase
              ? `Zaktualizowano podstawę #${baseId} (${docType}) przy wgraniu: ${file.name}`
              : `Utworzono podstawę #${baseId} (${docType}) przy wgraniu: ${file.name}`,
          },
        });

        // Update decyzjaPobytowaDo for residence permits (Karta pobytu + Blue Card)
        if ((docType === "KARTA_POBYTU" || docType === "BLUE_CARD") && parsed.dataDo) {
          const dataDo = new Date(parsed.dataDo);
          if (!foreigner.decyzjaPobytowaDo || dataDo > foreigner.decyzjaPobytowaDo) {
            await db.fdkForeigner.update({
              where: { id: foreignerId },
              data: { decyzjaPobytowaDo: dataDo },
            });
          }
          // Deactivate other active residence permits — only one can be active
          await deactivatePreviousResidencePermits(foreignerId, baseId, changedBy);
        }
        } // end else (non-ODWOLANIE)
      }
    } catch (err) {
      console.error("[fdk/upload] PDF parsing error (non-fatal):", err);
    }
  }

  // Build info about partial extraction
  let extractionMessage: string | undefined;
  if (extracted) {
    const expectedFields = ["detectedType", "dataOd", "dataDo"];
    const missing = expectedFields.filter((f) => !extracted[f as keyof typeof extracted]);
    if (missing.length > 0) {
      extractionMessage = `Ekstrakcja częściowa — nie odczytano: ${missing.join(", ")}. Uzupełnij dane ręcznie w zakładce „Podstawy zatrudnienia".`;
    }
  }

  return NextResponse.json({ ok: true, id: attachment.id, extracted, message: extractionMessage });
}

/**
 * Handle presigned upload for large files (>4 MB).
 * Step 1: Create DB record + generate Supabase signed upload URL.
 * Step 2: Client uploads directly to Supabase Storage using the signed URL.
 * Step 3: Client calls confirm-upload to trigger parsing.
 */
async function handlePresignedUpload(request: NextRequest, changedBy: string) {
  const body = await request.json();
  const { foreignerId, kategoria, nazwaWyswietlana, opis, fileName, fileSize, fileType } = body;

  if (!foreignerId || !fileName) {
    return NextResponse.json({ error: "foreignerId and fileName required" }, { status: 400 });
  }

  const fid = parseInt(String(foreignerId), 10);
  if (isNaN(fid)) {
    return NextResponse.json({ error: "Invalid foreignerId" }, { status: 400 });
  }

  const foreigner = await db.fdkForeigner.findUnique({ where: { id: fid } });
  if (!foreigner) {
    return NextResponse.json({ error: "Foreigner not found" }, { status: 404 });
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin";
  const typPliku = ext === "jpg" ? "jpeg" : ext;
  const storagePath = `${fid}/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const supabase = createSupabaseAdminClient();

  // Generate signed upload URL (valid 10 minutes)
  const { data: signedData, error: signError } = await supabase.storage
    .from("fdk-attachments")
    .createSignedUploadUrl(storagePath);

  if (signError || !signedData) {
    console.error("[fdk/upload] Signed URL error:", signError?.message);
    return NextResponse.json({ error: "Could not generate upload URL" }, { status: 500 });
  }

  // Create DB record (file not yet uploaded — will be confirmed in step 3)
  const attachment = await db.fdkAttachment.create({
    data: {
      foreignerId: fid,
      kategoria: kategoria ?? "glowne",
      nazwaWyswietlana: nazwaWyswietlana ?? fileName,
      nazwaPliku: fileName,
      opis: opis || null,
      typPliku,
      storagePath,
      rozmiarBytes: fileSize ?? 0,
    },
  });

  await db.fdkChangeLog.create({
    data: {
      foreignerId: fid,
      changedBy,
      field: "attachment_upload",
      oldValue: null,
      newValue: `Wgrano załącznik (presigned): ${nazwaWyswietlana ?? fileName} (${kategoria ?? "glowne"})`,
    },
  });

  return NextResponse.json({
    ok: true,
    attachmentId: attachment.id,
    signedUrl: signedData.signedUrl,
    storagePath,
  });
}
