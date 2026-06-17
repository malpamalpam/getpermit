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
  await requireAdmin();

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
      return NextResponse.json({ error: "Nie udało się wyciągnąć danych z PDF. Sprawdź czy to oświadczenie." }, { status: 422 });
    }

    const foreigner = await db.fdkForeigner.findUnique({ where: { id: attachment.foreignerId } });
    if (!foreigner) {
      return NextResponse.json({ error: "Foreigner not found" }, { status: 404 });
    }

    // Auto-fill foreigner data if fields are empty
    const updateData: Record<string, unknown> = {};
    if (parsed.imie && !foreigner.imie) updateData.imie = parsed.imie;
    if (parsed.nazwisko && foreigner.nazwisko === "Nowy") updateData.nazwisko = parsed.nazwisko;
    if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) updateData.dataUrodzenia = new Date(parsed.dataUrodzenia);
    if (parsed.obywatelstwo && !foreigner.obywatelstwo) updateData.obywatelstwo = parsed.obywatelstwo;
    if (parsed.nrPaszportu && !foreigner.nrPaszportu) updateData.nrPaszportu = parsed.nrPaszportu;

    if (Object.keys(updateData).length > 0) {
      await db.fdkForeigner.update({ where: { id: attachment.foreignerId }, data: updateData });
    }

    // Always create employment base from scraped data
    const base = await db.fdkEmploymentBase.create({
      data: {
        foreignerId: attachment.foreignerId,
        typ: "OSWIADCZENIE",
        status: "BRAK_DANYCH",
        dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
        dataDo: parsed.dataDo ? new Date(parsed.dataDo) : null,
        rodzajUmowy: parsed.rodzajUmowy || null,
        podjeciePracy: parsed.rodzajPracy || null,
        nrOswiadczenia: null,
      },
    });
    const baseId = base.id;

    return NextResponse.json({
      ok: true,
      extracted: parsed,
      foreignerUpdated: Object.keys(updateData),
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
