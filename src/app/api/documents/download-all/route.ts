import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import archiver from "archiver";
import { PassThrough } from "stream";

const STORAGE_BUCKET = "case-documents";

/**
 * Pobiera wszystkie dokumenty sprawy jako archiwum ZIP.
 * Wymaga autoryzacji: właściciel sprawy lub staff/admin.
 */
export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get("caseId");
  if (!caseId) {
    return NextResponse.json({ error: "missing_caseId" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Pobierz sprawę + dokumenty
  const caseRecord = await db.case.findUnique({
    where: { id: caseId },
    include: { documents: true },
  });

  if (!caseRecord) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Autoryzacja
  const isOwner = caseRecord.userId === user.id;
  const isStaff = user.role === "STAFF" || user.role === "ADMIN";
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (caseRecord.documents.length === 0) {
    return NextResponse.json({ error: "no_documents" }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();

  // Buduj ZIP w memory stream
  const archive = archiver("zip", { zlib: { level: 5 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  // Dodaj każdy dokument do archiwum
  for (const doc of caseRecord.documents) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(doc.storagePath);

    if (error || !data) {
      console.error(
        `[download-all] Failed to download ${doc.storagePath}:`,
        error?.message
      );
      continue;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    archive.append(buffer, { name: doc.fileName });
  }

  archive.finalize();

  // Konwertuj Node stream na Web ReadableStream
  const readable = new ReadableStream({
    start(controller) {
      passthrough.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      passthrough.on("end", () => {
        controller.close();
      });
      passthrough.on("error", (err) => {
        controller.error(err);
      });
    },
  });

  const safeTitle = caseRecord.title
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 50);

  return new Response(readable, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="dokumenty-${safeTitle}.zip"`,
    },
  });
}
