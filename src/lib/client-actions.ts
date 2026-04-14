"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DocumentType } from "@prisma/client";
import { logAccess } from "@/lib/access-log";
import {
  notifyAdminNewClientDocument,
  notifyClientNewMessage,
  notifyAdminNewMessage,
} from "@/lib/email/notifications";

/* ============================================================================ */
/*                          CLIENT DOCUMENT UPLOAD                              */
/* ============================================================================ */

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadClientDocumentAction(formData: FormData) {
  const user = await requireUser();

  const caseId = formData.get("caseId") as string;
  const file = formData.get("file") as File | null;
  const documentType = formData.get("documentType") as string;
  const customDescription = (formData.get("customDescription") as string) || null;

  if (!caseId || !file || !documentType) {
    return { ok: false as const, error: "missing_data" };
  }

  // Weryfikacja własności sprawy
  const caseRecord = await db.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || caseRecord.userId !== user.id) {
    return { ok: false as const, error: "forbidden" };
  }

  // Walidacja typu pliku
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { ok: false as const, error: "invalid_file_type" };
  }

  // Walidacja rozmiaru
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false as const, error: "file_too_large" };
  }

  // Walidacja documentType
  if (!Object.values(DocumentType).includes(documentType as DocumentType)) {
    return { ok: false as const, error: "invalid_document_type" };
  }

  // Upload do Supabase Storage
  const supabase = createSupabaseAdminClient();
  const storagePath = `${caseId}/client/${crypto.randomUUID()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("case-documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[uploadClientDocument] storage error:", uploadError.message);
    return { ok: false as const, error: uploadError.message };
  }

  const description =
    documentType === "OTHER" && customDescription
      ? customDescription
      : null;

  await db.document.create({
    data: {
      caseId,
      fileName: file.name,
      storagePath,
      fileSize: file.size,
      mimeType: file.type,
      description,
      documentType: documentType as DocumentType,
      uploadedByUserId: user.id,
      verificationStatus: "PENDING",
    },
  });

  void logAccess({
    userId: user.id,
    caseId,
    action: "UPLOAD_CLIENT_DOCUMENT",
    metadata: { fileName: file.name, documentType },
  });

  void notifyAdminNewClientDocument(caseId, file.name, documentType);

  revalidatePath(`/panel/sprawa/${caseId}`);
  revalidatePath(`/admin/sprawa/${caseId}`);
  return { ok: true as const };
}

/* ============================================================================ */
/*                         CLIENT DOCUMENT DELETE                               */
/* ============================================================================ */

export async function deleteClientDocumentAction(
  documentId: string,
  caseId: string
) {
  const user = await requireUser();

  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, error: "not_found" };

  // Klient może usunąć tylko swoje dokumenty
  if (doc.uploadedByUserId !== user.id) {
    return { ok: false as const, error: "forbidden" };
  }

  const supabase = createSupabaseAdminClient();
  await supabase.storage.from("case-documents").remove([doc.storagePath]);
  await db.document.delete({ where: { id: documentId } });

  void logAccess({
    userId: user.id,
    caseId,
    action: "DELETE_CLIENT_DOCUMENT",
    metadata: { documentId, fileName: doc.fileName },
  });

  revalidatePath(`/panel/sprawa/${caseId}`);
  revalidatePath(`/admin/sprawa/${caseId}`);
  return { ok: true as const };
}

/* ============================================================================ */
/*                              MESSAGES                                        */
/* ============================================================================ */

const messageSchema = z.object({
  caseId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export async function sendMessageAction(input: z.infer<typeof messageSchema>) {
  const user = await requireUser();

  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "validation" };
  }

  // Sprawdź dostęp do sprawy
  const caseRecord = await db.case.findUnique({
    where: { id: parsed.data.caseId },
    include: { user: true, assignedStaff: true },
  });
  if (!caseRecord) return { ok: false as const, error: "not_found" };

  const isOwner = caseRecord.userId === user.id;
  const isStaff = user.role === "STAFF" || user.role === "ADMIN";
  if (!isOwner && !isStaff) {
    return { ok: false as const, error: "forbidden" };
  }

  await db.message.create({
    data: {
      caseId: parsed.data.caseId,
      senderId: user.id,
      body: parsed.data.body,
    },
  });

  void logAccess({
    userId: user.id,
    caseId: parsed.data.caseId,
    action: "SEND_MESSAGE",
  });

  // Powiadomienia email
  const summary = parsed.data.body.slice(0, 100);
  if (isStaff) {
    // Staff wysyła → powiadom klienta
    void notifyClientNewMessage(parsed.data.caseId, summary);
  } else {
    // Klient wysyła → powiadom staff
    const clientName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
    void notifyAdminNewMessage(parsed.data.caseId, clientName, summary);
  }

  revalidatePath(`/panel/sprawa/${parsed.data.caseId}`);
  revalidatePath(`/admin/sprawa/${parsed.data.caseId}`);
  return { ok: true as const };
}
