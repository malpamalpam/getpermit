import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minut
const STORAGE_BUCKET = "case-documents";

/**
 * Pobiera dokument: weryfikuje że user ma do niego dostęp (właściciel sprawy
 * lub staff/admin), generuje krótko żyjący signed URL ze Supabase Storage,
 * loguje access do AccessLog i przekierowuje przeglądarkę na signed URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Pobierz dokument + powiązaną sprawę żeby sprawdzić własność
  const doc = await db.document.findUnique({
    where: { id },
    include: { case: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isOwner = doc.case.userId === user.id;
  const isStaff = user.role === "STAFF" || user.role === "ADMIN";
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Generuj signed URL przez admin client (omija RLS storage)
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.storagePath, SIGNED_URL_TTL_SECONDS, {
      download: doc.fileName,
    });

  if (error || !data?.signedUrl) {
    console.error("[documents/download] signed URL error:", error?.message);
    return NextResponse.json({ error: "storage_error" }, { status: 500 });
  }

  // Log dostępu (fire-and-forget — nie blokuje pobrania)
  void db.accessLog
    .create({
      data: {
        userId: user.id,
        caseId: doc.caseId,
        action: "DOWNLOAD_DOCUMENT",
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          request.headers.get("x-real-ip") ??
          null,
        userAgent: request.headers.get("user-agent"),
        metadata: { documentId: doc.id, fileName: doc.fileName },
      },
    })
    .catch((e) => console.error("[documents/download] AccessLog failed:", e));

  return NextResponse.redirect(data.signedUrl);
}
