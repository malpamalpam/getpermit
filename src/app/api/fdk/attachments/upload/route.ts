import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";
import { parseOswiadczeniePdf } from "@/lib/pdf-parser";

/**
 * POST /api/fdk/attachments/upload
 *
 * Upload załącznika do Supabase Storage + zapis metadanych w DB.
 * FormData: file, foreignerId, kategoria, nazwaWyswietlana, opis?
 */
export async function POST(request: NextRequest) {
  const adminUser = await requireAdmin();
  const changedBy = adminUser.email ?? adminUser.id ?? "system";

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
      const parsed = await parseOswiadczeniePdf(arrayBuffer, { ocrFallback: false });
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
        }

        // Create employment base with detected type (prevent duplicates)
        // ODWOLANIE = appeal/complaint — skip employment base creation
        if (parsed.detectedType !== "ODWOLANIE") {
          const docType = (parsed.detectedType ?? "OSWIADCZENIE") as "ZEZWOLENIE" | "OSWIADCZENIE" | "KARTA_POBYTU" | "BLUE_CARD";

          const existingBase = await db.fdkEmploymentBase.findFirst({
            where: {
              foreignerId,
              typ: docType,
              ...(parsed.dataOd ? { dataOd: new Date(parsed.dataOd) } : {}),
              ...(parsed.dataDo ? { dataDo: new Date(parsed.dataDo) } : {}),
            },
          });

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
          } else {
            baseData.nrDecyzji = parsed.nrDecyzji || null;
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
            await db.fdkEmploymentBase.update({
              where: { id: existingBase.id },
              data: baseData,
            });
            baseId = existingBase.id;
          } else {
            const base = await db.fdkEmploymentBase.create({ data: baseData as never });
            baseId = base.id;
          }

          // Log auto-created employment base
          await db.fdkChangeLog.create({
            data: {
              foreignerId,
              changedBy,
              field: "scrape",
              oldValue: null,
              newValue: existingBase
                ? `Zaktualizowano podstawę zatrudnienia #${baseId} (${docType}) przy wgraniu: ${file.name}`
                : `Utworzono podstawę zatrudnienia #${baseId} (${docType}) przy wgraniu: ${file.name}`,
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
          }
        } else {
          // ODWOLANIE — log that it was recognized as appeal
          await db.fdkChangeLog.create({
            data: {
              foreignerId,
              changedBy,
              field: "scrape",
              oldValue: null,
              newValue: `Rozpoznano odwołanie/zażalenie przy wgraniu: ${file.name} — nie utworzono podstawy zatrudnienia`,
            },
          });
        }
      }
    } catch (err) {
      console.error("[fdk/upload] PDF parsing error (non-fatal):", err);
    }
  }

  return NextResponse.json({ ok: true, id: attachment.id, extracted });
}
