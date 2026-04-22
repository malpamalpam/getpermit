import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
