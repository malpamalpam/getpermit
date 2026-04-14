import { Resend } from "resend";
import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";
import {
  buildCaseStatusChangedEmail,
  buildNewEventEmail,
  buildNewDocumentEmail,
  buildNewMessageFromAdminEmail,
  buildNewMessageFromClientEmail,
  buildDocumentVerifiedEmail,
  buildDocumentNeedsCorrectionEmail,
  buildNewClientDocumentEmail,
} from "./templates";
import type { CaseStatus } from "@prisma/client";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";

/**
 * Prosty debounce — blokuje duplikaty emaili dla tego samego klucza w oknie 30s.
 * Klucz = `${action}-${id}`. In-memory, resetuje się przy restarcie serwera.
 */
const recentlySent = new Map<string, number>();
const DEBOUNCE_MS = 30_000;

function shouldDebounce(key: string): boolean {
  const now = Date.now();
  const last = recentlySent.get(key);
  if (last && now - last < DEBOUNCE_MS) return true;
  recentlySent.set(key, now);
  // Czyść stare wpisy co jakiś czas
  if (recentlySent.size > 500) {
    for (const [k, v] of recentlySent) {
      if (now - v > DEBOUNCE_MS) recentlySent.delete(k);
    }
  }
  return false;
}

/**
 * Tłumaczenia statusów do emaili — duplikat z locales/*.json (server-side
 * dostęp do messages bez next-intl context jest skomplikowany, więc inline).
 */
const STATUS_LABELS: Record<string, Record<CaseStatus, string>> = {
  pl: {
    SUBMITTED: "Złożona",
    IN_PROGRESS: "W toku",
    SUPPLEMENT_REQUIRED: "Wymaga uzupełnień",
    DECISION_POSITIVE: "Decyzja pozytywna",
    DECISION_NEGATIVE: "Decyzja negatywna",
    APPEAL: "W odwołaniu",
  },
  en: {
    SUBMITTED: "Submitted",
    IN_PROGRESS: "In progress",
    SUPPLEMENT_REQUIRED: "Supplement required",
    DECISION_POSITIVE: "Positive decision",
    DECISION_NEGATIVE: "Negative decision",
    APPEAL: "Under appeal",
  },
  ru: {
    SUBMITTED: "Подано",
    IN_PROGRESS: "В работе",
    SUPPLEMENT_REQUIRED: "Требуются дополнения",
    DECISION_POSITIVE: "Положительное решение",
    DECISION_NEGATIVE: "Отрицательное решение",
    APPEAL: "В апелляции",
  },
  uk: {
    SUBMITTED: "Подано",
    IN_PROGRESS: "У роботі",
    SUPPLEMENT_REQUIRED: "Потрібні доповнення",
    DECISION_POSITIVE: "Позитивне рішення",
    DECISION_NEGATIVE: "Негативне рішення",
    APPEAL: "У апеляції",
  },
};

function statusLabel(status: CaseStatus, locale: string): string {
  const map = STATUS_LABELS[locale] ?? STATUS_LABELS.pl;
  return map[status];
}

function buildCaseUrl(): string {
  return `${siteConfig.url}/panel`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.warn("[notifications] RESEND_API_KEY missing — skipping email");
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error("[notifications] send failed:", e);
  }
}

/**
 * Powiadom klienta o zmianie statusu sprawy. Wywoływać w fire-and-forget mode
 * z server actions.
 */
export async function notifyCaseStatusChanged(caseId: string): Promise<void> {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { user: true },
  });
  if (!c) return;

  const { subject, html } = buildCaseStatusChangedEmail({
    locale: c.user.locale,
    caseTitle: c.title,
    statusLabel: statusLabel(c.status, c.user.locale),
    caseUrl: buildCaseUrl(),
  });

  await send(c.user.email, subject, html);
}

/**
 * Powiadom klienta o nowym wydarzeniu w timeline.
 */
export async function notifyNewEvent(
  caseId: string,
  eventTitle: string
): Promise<void> {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { user: true },
  });
  if (!c) return;

  const { subject, html } = buildNewEventEmail({
    locale: c.user.locale,
    caseTitle: c.title,
    eventTitle,
    caseUrl: buildCaseUrl(),
  });

  await send(c.user.email, subject, html);
}

/**
 * Powiadom klienta o nowym dokumencie do pobrania.
 */
export async function notifyNewDocument(
  caseId: string,
  fileName: string
): Promise<void> {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { user: true },
  });
  if (!c) return;

  const { subject, html } = buildNewDocumentEmail({
    locale: c.user.locale,
    caseTitle: c.title,
    fileName,
    caseUrl: buildCaseUrl(),
  });

  await send(c.user.email, subject, html);
}

/* ============================================================================ */
/*                          NOWE POWIADOMIENIA                                  */
/* ============================================================================ */

function buildAdminCaseUrl(caseId: string): string {
  return `${siteConfig.url}/admin/sprawa/${caseId}`;
}

function buildClientCaseUrl(caseId: string): string {
  return `${siteConfig.url}/panel/sprawa/${caseId}`;
}

/**
 * Powiadom klienta o nowej wiadomości od admina/staff.
 */
export async function notifyClientNewMessage(
  caseId: string,
  _messageSummary: string
): Promise<void> {
  if (shouldDebounce(`msg-client-${caseId}`)) return;

  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { user: true },
  });
  if (!c) return;

  const { subject, html } = buildNewMessageFromAdminEmail({
    locale: c.user.locale,
    caseTitle: c.title,
    caseUrl: buildClientCaseUrl(caseId),
  });

  await send(c.user.email, subject, html);
}

/**
 * Powiadom admina/staff o nowej wiadomości od klienta.
 */
export async function notifyAdminNewMessage(
  caseId: string,
  clientName: string,
  _messageSummary: string
): Promise<void> {
  if (shouldDebounce(`msg-admin-${caseId}`)) return;

  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { assignedStaff: true },
  });
  if (!c) return;

  const recipientEmail =
    c.assignedStaff?.email ?? process.env.ADMIN_EMAIL ?? FROM;
  const locale = c.assignedStaff?.locale ?? "pl";

  const { subject, html } = buildNewMessageFromClientEmail({
    locale,
    caseTitle: c.title,
    clientName,
    adminUrl: buildAdminCaseUrl(caseId),
  });

  await send(recipientEmail, subject, html);
}

/**
 * Powiadom klienta że dokument został zweryfikowany.
 */
export async function notifyDocumentVerified(
  documentId: string
): Promise<void> {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: { case: { include: { user: true } } },
  });
  if (!doc) return;

  const { subject, html } = buildDocumentVerifiedEmail({
    locale: doc.case.user.locale,
    caseTitle: doc.case.title,
    fileName: doc.fileName,
    caseUrl: buildClientCaseUrl(doc.caseId),
  });

  await send(doc.case.user.email, subject, html);
}

/**
 * Powiadom klienta że dokument wymaga poprawy.
 */
export async function notifyDocumentNeedsCorrection(
  documentId: string
): Promise<void> {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: { case: { include: { user: true } } },
  });
  if (!doc) return;

  const { subject, html } = buildDocumentNeedsCorrectionEmail({
    locale: doc.case.user.locale,
    caseTitle: doc.case.title,
    fileName: doc.fileName,
    caseUrl: buildClientCaseUrl(doc.caseId),
  });

  await send(doc.case.user.email, subject, html);
}

/**
 * Powiadom admina/staff o nowym dokumencie od klienta.
 */
export async function notifyAdminNewClientDocument(
  caseId: string,
  fileName: string,
  documentType: string
): Promise<void> {
  if (shouldDebounce(`doc-admin-${caseId}`)) return;

  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { user: true, assignedStaff: true },
  });
  if (!c) return;

  const clientName =
    `${c.user.firstName ?? ""} ${c.user.lastName ?? ""}`.trim() || c.user.email;
  const recipientEmail =
    c.assignedStaff?.email ?? process.env.ADMIN_EMAIL ?? FROM;
  const locale = c.assignedStaff?.locale ?? "pl";

  const { subject, html } = buildNewClientDocumentEmail({
    locale,
    caseTitle: c.title,
    clientName,
    fileName,
    documentType,
    adminUrl: buildAdminCaseUrl(caseId),
  });

  await send(recipientEmail, subject, html);
}
