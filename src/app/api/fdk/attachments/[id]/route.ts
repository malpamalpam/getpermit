import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseOswiadczeniePdf, ocrExtractStructured, getLastOcrError } from "@/lib/pdf-parser";
import { deactivatePreviousResidencePermits } from "@/lib/fdk-queries";

// Allow up to 120s for scrape action (OCR via Claude can take 30-60s for large multi-page scans)
export const maxDuration = 120;

/**
 * GET /api/fdk/attachments/[id]?action=download|preview
 *
 * Pobiera plik z Supabase Storage. Preview generuje signed URL (redirect),
 * download streamuje plik z nagłówkiem Content-Disposition.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdmin();
  const changedBy = adminUser.email ?? adminUser.id ?? "system";

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const attachment = await db.fdkAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const action = request.nextUrl.searchParams.get("action") ?? "preview";
  const supabase = createSupabaseAdminClient();

  if (action === "preview") {
    // Signed URL — redirect do Supabase (60 min)
    const { data, error } = await supabase.storage
      .from("fdk-attachments")
      .createSignedUrl(attachment.storagePath, 3600);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Could not generate preview URL" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(data.signedUrl);
  }

  // Debug — show raw text extracted from PDF (for debugging parser)
  if (action === "debug-text") {
    if (attachment.typPliku !== "pdf") {
      return NextResponse.json({ error: "Only PDF files support debug-text (use scrape for images)" }, { status: 400 });
    }
    const { data: fileData, error: dlError } = await supabase.storage
      .from("fdk-attachments")
      .download(attachment.storagePath);
    if (dlError || !fileData) {
      return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(Buffer.from(await fileData.arrayBuffer()));
      return NextResponse.json({ text: pdfData.text, length: pdfData.text?.length ?? 0 });
    } catch (err) {
      return NextResponse.json({ error: "PDF parse failed", details: String(err) }, { status: 500 });
    }
  }

  // Scrape — parse PDF/image and auto-fill foreigner + create employment base
  if (action === "scrape") {
    const scrapableTypes = ["pdf", "jpeg", "jpg", "png"];
    if (!scrapableTypes.includes(attachment.typPliku)) {
      return NextResponse.json({ error: "Only PDF and image files (JPG, PNG) can be scraped" }, { status: 400 });
    }

    const { data: fileData, error: dlError } = await supabase.storage
      .from("fdk-attachments")
      .download(attachment.storagePath);

    if (dlError || !fileData) {
      return NextResponse.json({ error: "Could not download file for parsing" }, { status: 500 });
    }

    const buffer = await fileData.arrayBuffer();
    const isImage = ["jpeg", "jpg", "png"].includes(attachment.typPliku);
    let parsed;
    if (isImage) {
      // Images go directly to structured OCR extraction (Claude Vision)
      const mediaType = attachment.typPliku === "png" ? "image/png" as const : "image/jpeg" as const;
      parsed = await ocrExtractStructured(buffer, mediaType, attachment.nazwaPliku);
    } else {
      parsed = await parseOswiadczeniePdf(buffer, { filename: attachment.nazwaPliku });
    }

    if (!parsed) {
      const ocrErr = getLastOcrError();
      let errorMsg: string;
      if (ocrErr?.type === "no_key") {
        errorMsg = "Brak klucza ANTHROPIC_API_KEY w srodowisku serwera. OCR nie moze dzialac bez niego. Skontaktuj sie z administratorem.";
      } else if (ocrErr?.type === "api_error") {
        errorMsg = `OCR nie powiodl sie: ${ocrErr.message}. Sprobuj ponownie lub wprowadz dane recznie.`;
      } else {
        errorMsg = "Nie udalo sie wyciagnac danych z PDF (brak warstwy tekstowej i OCR nie zwrocil danych). Wprowadz dane recznie w zakladce Podstawy zatrudnienia.";
      }
      return NextResponse.json({
        error: errorMsg,
        manualEntryRequired: true,
        ocrDiagnostic: ocrErr?.type ?? "no_text_layer",
      }, { status: 422 });
    }

    const foreigner = await db.fdkForeigner.findUnique({ where: { id: attachment.foreignerId } });
    if (!foreigner) {
      return NextResponse.json({ error: "Foreigner not found" }, { status: 404 });
    }

    // Auto-fill foreigner data if fields are empty
    const foreignerUpdateData: Record<string, unknown> = {};
    if (parsed.imie && !foreigner.imie) foreignerUpdateData.imie = parsed.imie;
    if (parsed.nazwisko && foreigner.nazwisko === "Nowy") foreignerUpdateData.nazwisko = parsed.nazwisko;
    if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) foreignerUpdateData.dataUrodzenia = new Date(parsed.dataUrodzenia);
    if (parsed.obywatelstwo && !foreigner.obywatelstwo) foreignerUpdateData.obywatelstwo = parsed.obywatelstwo;
    if (parsed.nrPaszportu && !foreigner.nrPaszportu) foreignerUpdateData.nrPaszportu = parsed.nrPaszportu;

    if (Object.keys(foreignerUpdateData).length > 0) {
      await db.fdkForeigner.update({ where: { id: attachment.foreignerId }, data: foreignerUpdateData });
      // Log auto-filled foreigner fields from scrape
      for (const [key, value] of Object.entries(foreignerUpdateData)) {
        await db.fdkChangeLog.create({
          data: {
            foreignerId: attachment.foreignerId,
            changedBy,
            field: key,
            oldValue: null,
            newValue: value instanceof Date ? (value as Date).toISOString().slice(0, 10) : String(value),
          },
        });
      }
    }

    // ODWOLANIE: do NOT create an employment base — just log and return extracted data
    if (parsed.detectedType === "ODWOLANIE") {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy,
          field: "scrape",
          oldValue: null,
          newValue: `Rozpoznano odwolanie od decyzji w pliku: ${attachment.nazwaPliku}. Podstawa zatrudnienia NIE utworzona.`,
        },
      });

      return NextResponse.json({
        ok: true,
        extracted: parsed,
        foreignerUpdated: Object.keys(foreignerUpdateData),
        employmentBaseCreated: null,
      });
    }

    // All other detected types create/update employment base
    const docType = (parsed.detectedType ?? "OSWIADCZENIE") as "ZEZWOLENIE" | "OSWIADCZENIE" | "KARTA_POBYTU" | "BLUE_CARD";

    // Match existing base by DOCUMENT NUMBER first, then by dates
    let existingBase = null;
    if (docType === "OSWIADCZENIE" && parsed.nrOswiadczenia) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: attachment.foreignerId, typ: docType, nrOswiadczenia: parsed.nrOswiadczenia },
      });
    } else if (docType !== "OSWIADCZENIE" && parsed.nrDecyzji) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: attachment.foreignerId, typ: docType, nrDecyzji: parsed.nrDecyzji },
      });
    }
    // Fallback: match by exact dates (both must be present and match)
    if (!existingBase && parsed.dataOd && parsed.dataDo) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: {
          foreignerId: attachment.foreignerId,
          typ: docType,
          dataOd: new Date(parsed.dataOd),
          dataDo: new Date(parsed.dataDo),
        },
      });
    }

    // Build type-specific data
    const baseData: Record<string, unknown> = {
      foreignerId: attachment.foreignerId,
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
      // ZEZWOLENIE, KARTA_POBYTU, BLUE_CARD
      baseData.nrDecyzji = parsed.nrDecyzji || null;
      baseData.nrOswiadczenia = null;
    }

    // Store wynagrodzenie as text
    if (parsed.wynagrodzenie) {
      baseData.wynagrodzenie = parsed.wynagrodzenie;
    }

    let baseId: number;
    let scrapeAction: string;
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
      scrapeAction = `Zaktualizowano podstawę zatrudnienia #${baseId} (${docType}) na podstawie pliku: ${attachment.nazwaPliku}`;
    } else {
      const base = await db.fdkEmploymentBase.create({ data: baseData as never });
      baseId = base.id;
      scrapeAction = `Utworzono podstawę zatrudnienia #${baseId} (${docType}) na podstawie pliku: ${attachment.nazwaPliku}`;
    }

    // Log the scrape action to history
    await db.fdkChangeLog.create({
      data: {
        foreignerId: attachment.foreignerId,
        changedBy,
        field: "scrape",
        oldValue: null,
        newValue: scrapeAction,
      },
    });

    // For residence permits: update decyzjaPobytowaDo + deactivate previous active permits
    if ((docType === "KARTA_POBYTU" || docType === "BLUE_CARD") && parsed.dataDo) {
      const dataDo = new Date(parsed.dataDo);
      if (!foreigner.decyzjaPobytowaDo || dataDo > foreigner.decyzjaPobytowaDo) {
        await db.fdkForeigner.update({
          where: { id: attachment.foreignerId },
          data: { decyzjaPobytowaDo: dataDo },
        });
      }
      // Deactivate other active residence permits — only one can be active
      await deactivatePreviousResidencePermits(attachment.foreignerId, baseId, changedBy);
    }

    // Build list of fields that could NOT be extracted (for user feedback)
    const expectedFields = ["detectedType", "dataOd", "dataDo", "imie", "nazwisko"];
    const missingFields = expectedFields.filter((f) => !parsed[f as keyof typeof parsed]);

    return NextResponse.json({
      ok: true,
      extracted: parsed,
      foreignerUpdated: Object.keys(foreignerUpdateData),
      employmentBaseCreated: baseId,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      message: missingFields.length > 0
        ? `Ekstrakcja częściowa — nie udało się odczytać: ${missingFields.join(", ")}. Uzupełnij brakujące dane ręcznie.`
        : undefined,
    });
  }

  // Download — stream file
  const { data, error } = await supabase.storage
    .from("fdk-attachments")
    .download(attachment.storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not download file" },
      { status: 500 }
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", attachment.typPliku === "pdf" ? "application/pdf" : `image/${attachment.typPliku}`);
  headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.nazwaPliku)}"`);
  if (attachment.rozmiarBytes) {
    headers.set("Content-Length", attachment.rozmiarBytes.toString());
  }

  return new NextResponse(data, { headers });
}

/**
 * POST /api/fdk/attachments/[id]?action=confirm-upload
 *
 * Confirms a presigned upload completed — triggers text-layer parsing (no OCR).
 * Called after the client uploads a large file directly to Supabase Storage.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdmin();
  const changedBy = adminUser.email ?? adminUser.id ?? "system";

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const action = request.nextUrl.searchParams.get("action");
  if (action !== "confirm-upload") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const attachment = await db.fdkAttachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only run text-layer parsing for PDFs (no OCR — user can trigger via Scrape button)
  let extracted = null;
  if (attachment.typPliku === "pdf") {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: fileData } = await supabase.storage
        .from("fdk-attachments")
        .download(attachment.storagePath);

      if (fileData) {
        const buffer = await fileData.arrayBuffer();
        const parsed = await parseOswiadczeniePdf(buffer, { ocrFallback: false, filename: attachment.nazwaPliku });
        if (parsed) {
          extracted = parsed;

          // Auto-fill foreigner data
          const foreigner = await db.fdkForeigner.findUnique({ where: { id: attachment.foreignerId } });
          if (foreigner) {
            const updateData: Record<string, unknown> = {};
            if (parsed.imie && !foreigner.imie) updateData.imie = parsed.imie;
            if (parsed.nazwisko && foreigner.nazwisko === "Nowy") updateData.nazwisko = parsed.nazwisko;
            if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) updateData.dataUrodzenia = new Date(parsed.dataUrodzenia);
            if (parsed.obywatelstwo && !foreigner.obywatelstwo) updateData.obywatelstwo = parsed.obywatelstwo;
            if (parsed.nrPaszportu && !foreigner.nrPaszportu) updateData.nrPaszportu = parsed.nrPaszportu;

            if (Object.keys(updateData).length > 0) {
              await db.fdkForeigner.update({ where: { id: attachment.foreignerId }, data: updateData });
            }
          }
        }
      }
    } catch (err) {
      console.error("[fdk/confirm-upload] PDF parsing error (non-fatal):", err);
    }
  }

  return NextResponse.json({
    ok: true,
    id: attachment.id,
    extracted,
    message: attachment.typPliku !== "pdf"
      ? "Plik wgrany. Uzyj przycisku Zescrapuj dane aby odczytac tresc dokumentu."
      : extracted
        ? undefined
        : "Plik wgrany (brak warstwy tekstowej). Uzyj przycisku Zescrapuj dane aby uruchomic OCR.",
  });
}
