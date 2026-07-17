import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseOswiadczeniePdf } from "@/lib/pdf-parser";

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
      return NextResponse.json({ error: "Only PDF" }, { status: 400 });
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

  // Scrape — parse PDF and auto-fill foreigner + create employment base
  if (action === "scrape") {
    if (attachment.typPliku !== "pdf") {
      return NextResponse.json({ error: "Only PDF files can be scraped" }, { status: 400 });
    }

    const { data: fileData, error: dlError } = await supabase.storage
      .from("fdk-attachments")
      .download(attachment.storagePath);

    if (dlError || !fileData) {
      return NextResponse.json({ error: "Could not download file for parsing" }, { status: 500 });
    }

    const buffer = await fileData.arrayBuffer();
    const parsed = await parseOswiadczeniePdf(buffer);

    if (!parsed) {
      return NextResponse.json({ error: "Nie udało się wyciągnąć danych z PDF. Sprawdź czy plik zawiera tekst lub ustaw klucz ANTHROPIC_API_KEY aby włączyć OCR dla skanów." }, { status: 422 });
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
    }

    // === ODWOŁANIE / ZAŻALENIE — do NOT create employment base ===
    if (parsed.detectedType === "ODWOLANIE") {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: attachment.foreignerId,
          changedBy,
          field: "scrape",
          oldValue: null,
          newValue: `Wgrano dokument: odwołanie/zażalenie (${attachment.nazwaPliku}) — nie utworzono podstawy zatrudnienia`,
        },
      });
      return NextResponse.json({
        ok: true,
        extracted: parsed,
        message: "Dokument jest odwołaniem lub zażaleniem — nie utworzono podstawy zatrudnienia.",
        foreignerUpdated: Object.keys(foreignerUpdateData),
      });
    }

    // Determine document type — require positive detection, don't default to OSWIADCZENIE
    const docType = parsed.detectedType ?? "OSWIADCZENIE";

    // Check for duplicate: same foreigner + type (+ dates if available).
    // Also check for any existing base with same type to update instead of creating duplicates.
    let existingBase = await db.fdkEmploymentBase.findFirst({
      where: {
        foreignerId: attachment.foreignerId,
        typ: docType,
        ...(parsed.dataOd && parsed.dataDo
          ? { dataOd: new Date(parsed.dataOd), dataDo: new Date(parsed.dataDo) }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    // Fallback: if no exact date match, find any base with same type for this foreigner
    if (!existingBase) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: {
          foreignerId: attachment.foreignerId,
          typ: docType,
          status: "BRAK_DANYCH",
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Build type-specific data — don't mix zezwolenie and oświadczenie fields
    const baseData: Record<string, unknown> = {
      foreignerId: attachment.foreignerId,
      typ: docType,
      status: "BRAK_DANYCH" as const,
      dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
      dataDo: parsed.dataDo ? new Date(parsed.dataDo) : null,
      rodzajUmowy: parsed.rodzajUmowy || null,
      stanowisko: parsed.stanowisko || null,
      firma: parsed.firma || null,
    };

    if (docType === "OSWIADCZENIE") {
      baseData.nrOswiadczenia = parsed.nrOswiadczenia || null;
      baseData.podjeciePracy = parsed.rodzajPracy || null;
      // Ensure zezwolenie fields are cleared
      baseData.nrDecyzji = null;
    } else {
      // ZEZWOLENIE, KARTA_POBYTU — no oświadczenie fields
      baseData.nrDecyzji = parsed.nrDecyzji || null;
      // Ensure oświadczenie fields are cleared
      baseData.nrOswiadczenia = null;
    }

    // Store wynagrodzenie as text
    if (parsed.wynagrodzenie) {
      baseData.wynagrodzenie = parsed.wynagrodzenie;
    }

    let baseId: number;
    let scrapeAction: string;
    if (existingBase) {
      // Update existing record instead of creating duplicate
      const { foreignerId: _fid, ...updateFields } = baseData;
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

    // Also update foreigner's decyzjaPobytowaDo if this is a residence permit
    if (docType === "KARTA_POBYTU" && parsed.dataDo) {
      const dataDo = new Date(parsed.dataDo);
      if (!foreigner.decyzjaPobytowaDo || dataDo > foreigner.decyzjaPobytowaDo) {
        await db.fdkForeigner.update({
          where: { id: attachment.foreignerId },
          data: { decyzjaPobytowaDo: dataDo },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      extracted: parsed,
      foreignerUpdated: Object.keys(foreignerUpdateData),
      employmentBaseCreated: baseId,
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
