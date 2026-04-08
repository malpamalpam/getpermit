import { Resend } from "resend";
import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";
import {
  buildCaseStatusChangedEmail,
  buildNewEventEmail,
  buildNewDocumentEmail,
} from "./templates";
import type { CaseStatus } from "@prisma/client";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";

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
