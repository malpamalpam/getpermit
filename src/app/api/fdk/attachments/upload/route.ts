import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

/**
 * POST /api/fdk/attachments/upload
 *
 * Upload załącznika do Supabase Storage + zapis metadanych w DB.
 * FormData: file, foreignerId, kategoria, nazwaWyswietlana, opis?
 */
export async function POST(request: NextRequest) {
  await requireAdmin();

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

  return NextResponse.json({ ok: true, id: attachment.id });
}
