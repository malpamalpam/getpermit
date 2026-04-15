"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CaseType, CaseStatus, EventType, VerificationStatus } from "@prisma/client";
import { siteConfig } from "@/config/site";
import {
  notifyCaseStatusChanged,
  notifyNewEvent,
  notifyNewDocument,
  notifyDocumentVerified,
  notifyDocumentNeedsCorrection,
} from "@/lib/email/notifications";
import { logAccess } from "@/lib/access-log";

/* ============================================================================ */
/*                                   CASES                                      */
/* ============================================================================ */

const caseSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(CaseType),
  status: z.nativeEnum(CaseStatus),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  submittedAt: z.string().optional().or(z.literal("")),
  expectedDecisionAt: z.string().optional().or(z.literal("")),
  assignedStaffId: z.string().uuid().optional().or(z.literal("")),
});

export type CaseFormValues = z.infer<typeof caseSchema>;

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createCaseAction(input: CaseFormValues) {
  const staff = await requireStaff();

  const parsed = caseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "validation" };
  }

  const created = await db.case.create({
    data: {
      userId: parsed.data.userId,
      type: parsed.data.type,
      status: parsed.data.status,
      title: parsed.data.title,
      description: parsed.data.description || null,
      submittedAt: parseDate(parsed.data.submittedAt),
      expectedDecisionAt: parseDate(parsed.data.expectedDecisionAt),
      assignedStaffId: parsed.data.assignedStaffId || null,
    },
  });

  void logAccess({
    userId: staff.id,
    caseId: created.id,
    action: "CREATE_CASE",
  });

  revalidatePath("/admin");
  revalidatePath("/panel");
  return { ok: true as const, id: created.id };
}

export async function updateCaseAction(id: string, input: CaseFormValues) {
  const staff = await requireStaff();

  const parsed = caseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "validation" };
  }

  // Pobierz poprzedni stan, żeby wykryć zmianę statusu
  const before = await db.case.findUnique({ where: { id } });
  if (!before) return { ok: false as const, error: "not_found" };

  await db.case.update({
    where: { id },
    data: {
      userId: parsed.data.userId,
      type: parsed.data.type,
      status: parsed.data.status,
      title: parsed.data.title,
      description: parsed.data.description || null,
      submittedAt: parseDate(parsed.data.submittedAt),
      expectedDecisionAt: parseDate(parsed.data.expectedDecisionAt),
      assignedStaffId: parsed.data.assignedStaffId || null,
    },
  });

  void logAccess({
    userId: staff.id,
    caseId: id,
    action: "UPDATE_CASE",
    metadata: { statusBefore: before.status, statusAfter: parsed.data.status },
  });

  // Notyfikacja przy zmianie statusu (fire-and-forget)
  if (before.status !== parsed.data.status) {
    void notifyCaseStatusChanged(id);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/sprawa/${id}`);
  revalidatePath("/panel");
  revalidatePath(`/panel/sprawa/${id}`);
  return { ok: true as const };
}

export async function deleteCaseAction(id: string) {
  await requireStaff();

  // Pobierz dokumenty żeby usunąć też pliki ze Storage
  const docs = await db.document.findMany({ where: { caseId: id } });
  if (docs.length > 0) {
    const supabase = createSupabaseAdminClient();
    await supabase.storage
      .from("case-documents")
      .remove(docs.map((d) => d.storagePath));
  }

  await db.case.delete({ where: { id } });

  revalidatePath("/admin");
  redirect("/admin");
}

/* ============================================================================ */
/*                                   EVENTS                                     */
/* ============================================================================ */

const eventSchema = z.object({
  caseId: z.string().uuid(),
  eventType: z.nativeEnum(EventType),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  eventDate: z.string().min(1),
});

export async function createEventAction(input: z.infer<typeof eventSchema>) {
  const staff = await requireStaff();

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "validation" };
  }

  await db.caseEvent.create({
    data: {
      caseId: parsed.data.caseId,
      eventType: parsed.data.eventType,
      title: parsed.data.title,
      description: parsed.data.description || null,
      eventDate: new Date(parsed.data.eventDate),
      createdByStaffId: staff.id,
    },
  });

  void logAccess({
    userId: staff.id,
    caseId: parsed.data.caseId,
    action: "CREATE_EVENT",
    metadata: { eventType: parsed.data.eventType, title: parsed.data.title },
  });

  void notifyNewEvent(parsed.data.caseId, parsed.data.title);

  revalidatePath(`/admin/sprawa/${parsed.data.caseId}`);
  revalidatePath(`/panel/sprawa/${parsed.data.caseId}`);
  return { ok: true as const };
}

export async function deleteEventAction(eventId: string, caseId: string) {
  await requireStaff();
  await db.caseEvent.delete({ where: { id: eventId } });
  revalidatePath(`/admin/sprawa/${caseId}`);
  revalidatePath(`/panel/sprawa/${caseId}`);
  return { ok: true as const };
}

/* ============================================================================ */
/*                                  DOCUMENTS                                   */
/* ============================================================================ */

/**
 * Upload dokumentu — przyjmuje FormData (multipart) z plikiem.
 * Zapisuje do Supabase Storage (bucket: case-documents) pod ścieżką
 * {caseId}/{uuid}-{filename}. Tworzy rekord w public.documents.
 */
export async function uploadDocumentAction(formData: FormData) {
  const staff = await requireStaff();

  const caseId = formData.get("caseId") as string;
  const file = formData.get("file") as File | null;
  const description = (formData.get("description") as string) || null;

  if (!caseId || !file) {
    return { ok: false as const, error: "missing_data" };
  }

  // Weryfikacja że sprawa istnieje
  const caseExists = await db.case.findUnique({ where: { id: caseId } });
  if (!caseExists) {
    return { ok: false as const, error: "case_not_found" };
  }

  // Wgranie pliku do Supabase Storage przez admin client (omija RLS)
  const supabase = createSupabaseAdminClient();
  const safeName = file.name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/^\./g, "_")
    .slice(0, 200);
  const storagePath = `${caseId}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("case-documents")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[uploadDocument] storage error:", uploadError.message);
    return { ok: false as const, error: uploadError.message };
  }

  await db.document.create({
    data: {
      caseId,
      fileName: safeName,
      storagePath,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      description,
      uploadedByStaffId: staff.id,
    },
  });

  void logAccess({
    userId: staff.id,
    caseId,
    action: "UPLOAD_DOCUMENT",
    metadata: { fileName: file.name, fileSize: file.size },
  });

  void notifyNewDocument(caseId, file.name);

  revalidatePath(`/admin/sprawa/${caseId}`);
  revalidatePath(`/panel/sprawa/${caseId}`);
  return { ok: true as const };
}

export async function deleteDocumentAction(documentId: string, caseId: string) {
  await requireStaff();

  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, error: "not_found" };

  const supabase = createSupabaseAdminClient();
  await supabase.storage.from("case-documents").remove([doc.storagePath]);

  await db.document.delete({ where: { id: documentId } });

  revalidatePath(`/admin/sprawa/${caseId}`);
  revalidatePath(`/panel/sprawa/${caseId}`);
  return { ok: true as const };
}

/* ============================================================================ */
/*                          CLEAR MESSAGES                                      */
/* ============================================================================ */

export async function clearMessagesAction(caseId: string) {
  await requireStaff();

  await db.message.deleteMany({ where: { caseId } });

  revalidatePath(`/admin/sprawa/${caseId}`);
  revalidatePath(`/panel/sprawa/${caseId}`);
  return { ok: true as const };
}

/* ============================================================================ */
/*                          DOCUMENT VERIFICATION                               */
/* ============================================================================ */

export async function updateDocumentVerificationAction(
  documentId: string,
  status: VerificationStatus
) {
  const staff = await requireStaff();

  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: { case: true },
  });
  if (!doc) return { ok: false as const, error: "not_found" };

  await db.document.update({
    where: { id: documentId },
    data: { verificationStatus: status },
  });

  void logAccess({
    userId: staff.id,
    caseId: doc.caseId,
    action: "VERIFY_DOCUMENT",
    metadata: { documentId, status, fileName: doc.fileName },
  });

  if (status === "VERIFIED") {
    void notifyDocumentVerified(documentId);
  } else if (status === "NEEDS_CORRECTION") {
    void notifyDocumentNeedsCorrection(documentId);
  }

  revalidatePath(`/admin/sprawa/${doc.caseId}`);
  revalidatePath(`/panel/sprawa/${doc.caseId}`);
  return { ok: true as const };
}

/* ============================================================================ */
/*                                   CLIENTS                                    */
/* ============================================================================ */

const clientSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  locale: z.enum(["pl", "en", "ru", "uk"]),
});

export type CreateClientResult =
  | { ok: true; userId: string }
  | { ok: false; error: "email_taken" | "validation" | "supabase_error" };

/**
 * Tworzy nowego klienta przez Supabase Auth (admin invite) i synchronizuje
 * z public.users. Klient otrzymuje email z linkiem do logowania.
 */
export async function createClientAction(
  input: z.infer<typeof clientSchema>
): Promise<CreateClientResult> {
  await requireStaff();

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { ok: false, error: "email_taken" };
  }

  const supabase = createSupabaseAdminClient();

  // Wyślij invite email (Supabase Auth → SMTP Resend)
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${siteConfig.url}/api/auth/callback?locale=${parsed.data.locale}&next=/panel`,
      data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    }
  );

  if (error || !data.user) {
    console.error("[createClient] supabase invite error:", error?.message);
    return { ok: false, error: "supabase_error" };
  }

  // Stwórz rekord public.users
  await db.user.create({
    data: {
      id: data.user.id,
      email: parsed.data.email,
      role: "CLIENT",
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
      locale: parsed.data.locale,
    },
  });

  revalidatePath("/admin/klienci");
  return { ok: true, userId: data.user.id };
}
