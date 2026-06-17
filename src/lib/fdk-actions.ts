"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { FdkResult } from "@/lib/fdk-queries";

// =============================================================================
// SCHEMAS
// =============================================================================

const foreignerSchema = z.object({
  nazwisko: z.string().trim().min(1).max(255),
  imie: z.string().trim().max(255).optional().or(z.literal("")),
  dataUrodzenia: z.string().optional().or(z.literal("")),
  miejsceUrodzenia: z.string().trim().max(255).optional().or(z.literal("")),
  obywatelstwo: z.string().trim().max(100).optional().or(z.literal("")),
  plec: z.string().trim().max(20).optional().or(z.literal("")),
  pesel: z.string().trim().max(11).optional().or(z.literal("")),
  nrPaszportu: z.string().trim().max(50).optional().or(z.literal("")),
  paszportWaznyOd: z.string().optional().or(z.literal("")),
  paszportWaznyDo: z.string().optional().or(z.literal("")),
  adresPl: z.string().trim().optional().or(z.literal("")),
  telefon: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  nrKonta: z.string().trim().max(50).optional().or(z.literal("")),
  uwagi: z.string().trim().optional().or(z.literal("")),
  jezykPreferowany: z.string().trim().max(5).optional().or(z.literal("")),
  decyzjaPobytowaDo: z.string().optional().or(z.literal("")),
  typDokumentuPobytowego: z.string().trim().max(255).optional().or(z.literal("")),
});

const optStr = z.string().optional().or(z.literal(""));
const optDate = z.string().optional().or(z.literal(""));

const employmentBaseSchema = z.object({
  foreignerId: z.number().int(),
  typ: z.enum(["ZEZWOLENIE", "OSWIADCZENIE", "KARTA_POBYTU", "BLUE_CARD", "ZGLOSZENIE_UA"]),
  status: z.enum(["AKTYWNE", "WYGASLE", "UCHYLONE", "UMORZONE", "W_TRAKCIE", "BRAK_DANYCH"]),
  // Wspólne
  rodzajUmowy: optStr,
  dataOd: optDate,
  dataDo: optDate,
  // Zezwolenie
  firma: optStr,
  nrDecyzji: optStr,
  wezwanieBraki: optStr,
  powiadomienieDo: optDate,
  uchylenie: optStr,
  startInfo: optStr,
  przedluzenie: z.boolean().optional().default(false),
  przewidywanaDataPodjecia: z.boolean().optional().default(false),
  przewidywanaDataKomentarz: optStr,
  // Oświadczenie
  nrOswiadczenia: optStr,
  podjeciePracy: optStr,
  podjeciePracyStatus: optStr, // PODJAL / NIE_PODJAL / ""
  podjeciePracyData: optDate,
  dataStartu: optDate,
  // Karta pobytu
  urzad: optStr,
  rodzajSprawy: optStr,
  dataZlozenia: optDate,
  sposobWysylki: optStr,
  sygnatura: optStr,
  brakujaceDokumenty: optStr,
  uwagiKp: optStr,
  // Blue Card
  decyzjaOdebrana: optDate,
  stanowisko: optStr,
  stawka: optStr,
  // Zgłoszenie UA
  dataPodjecia: optDate,
  uwagiUa: optStr,
  // Ogólne
  uwagi: optStr,
});

// =============================================================================
// HELPERS
// =============================================================================

function toDate(v: string | undefined | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function revalidateFdk(id?: number) {
  revalidatePath("/admin/fdk");
  if (id) revalidatePath(`/admin/fdk/${id}`);
}

function buildEmploymentBaseData(d: z.infer<typeof employmentBaseSchema>) {
  return {
    foreignerId: d.foreignerId,
    typ: d.typ,
    status: d.status,
    // Wspólne
    rodzajUmowy: d.rodzajUmowy || null,
    dataOd: toDate(d.dataOd),
    dataDo: toDate(d.dataDo),
    // Zezwolenie
    firma: d.firma || null,
    nrDecyzji: d.nrDecyzji || null,
    wezwanieBraki: d.wezwanieBraki || null,
    powiadomienieDo: toDate(d.powiadomienieDo),
    uchylenie: d.uchylenie || null,
    startInfo: d.startInfo || null,
    przedluzenie: d.przedluzenie ?? false,
    przewidywanaDataPodjecia: d.przewidywanaDataPodjecia ?? false,
    przewidywanaDataKomentarz: d.przewidywanaDataKomentarz || null,
    // Oświadczenie
    nrOswiadczenia: d.nrOswiadczenia || null,
    podjeciePracy: d.podjeciePracy || null,
    podjeciePracyStatus: d.podjeciePracyStatus || null,
    podjeciePracyData: toDate(d.podjeciePracyData),
    dataStartu: toDate(d.dataStartu),
    // Karta pobytu
    urzad: d.urzad || null,
    rodzajSprawy: d.rodzajSprawy || null,
    dataZlozenia: toDate(d.dataZlozenia),
    sposobWysylki: d.sposobWysylki || null,
    sygnatura: d.sygnatura || null,
    brakujaceDokumenty: d.brakujaceDokumenty || null,
    uwagiKp: d.uwagiKp || null,
    // Blue Card
    decyzjaOdebrana: toDate(d.decyzjaOdebrana),
    stanowisko: d.stanowisko || null,
    stawka: d.stawka ? parseFloat(d.stawka) : null,
    // Zgłoszenie UA
    dataPodjecia: toDate(d.dataPodjecia),
    uwagiUa: d.uwagiUa || null,
    // Ogólne
    uwagi: d.uwagi || null,
  };
}

function fmtValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

/**
 * Log field changes for audit trail.
 */
async function logChanges(
  foreignerId: number,
  changedBy: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
) {
  const logs: { foreignerId: number; changedBy: string; field: string; oldValue: string | null; newValue: string | null }[] = [];

  for (const key of Object.keys(newData)) {
    const oldVal = fmtValue(oldData[key]);
    const newVal = fmtValue(newData[key]);
    if (oldVal !== newVal) {
      logs.push({
        foreignerId,
        changedBy,
        field: key,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  if (logs.length > 0) {
    await db.fdkChangeLog.createMany({ data: logs });
  }
}

// =============================================================================
// FOREIGNERS CRUD
// =============================================================================

export async function createForeignerAction(
  input: z.infer<typeof foreignerSchema>
): Promise<FdkResult & { id?: number }> {
  await requireAdmin();
  const parsed = foreignerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const d = parsed.data;
  const foreigner = await db.fdkForeigner.create({
    data: {
      nazwisko: d.nazwisko,
      imie: d.imie || null,
      dataUrodzenia: toDate(d.dataUrodzenia),
      miejsceUrodzenia: d.miejsceUrodzenia || null,
      obywatelstwo: d.obywatelstwo || null,
      plec: d.plec || null,
      pesel: d.pesel || null,
      nrPaszportu: d.nrPaszportu || null,
      paszportWaznyOd: toDate(d.paszportWaznyOd),
      paszportWaznyDo: toDate(d.paszportWaznyDo),
      adresPl: d.adresPl || null,
      telefon: d.telefon || null,
      email: d.email || null,
      nrKonta: d.nrKonta || null,
      uwagi: d.uwagi || null,
      jezykPreferowany: d.jezykPreferowany || null,
      decyzjaPobytowaDo: toDate(d.decyzjaPobytowaDo),
      typDokumentuPobytowego: d.typDokumentuPobytowego || null,
    },
  });

  revalidateFdk();
  return { ok: true, id: foreigner.id };
}

export async function updateForeignerAction(
  id: number,
  input: z.infer<typeof foreignerSchema>
): Promise<FdkResult> {
  const user = await requireAdmin();
  const parsed = foreignerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  // Fetch old data for audit log
  const oldForeigner = await db.fdkForeigner.findUnique({ where: { id } });
  if (!oldForeigner) return { ok: false, error: "not_found" };

  const d = parsed.data;
  const newData = {
    nazwisko: d.nazwisko,
    imie: d.imie || null,
    dataUrodzenia: toDate(d.dataUrodzenia),
    miejsceUrodzenia: d.miejsceUrodzenia || null,
    obywatelstwo: d.obywatelstwo || null,
    plec: d.plec || null,
    pesel: d.pesel || null,
    nrPaszportu: d.nrPaszportu || null,
    paszportWaznyOd: toDate(d.paszportWaznyOd),
    paszportWaznyDo: toDate(d.paszportWaznyDo),
    adresPl: d.adresPl || null,
    telefon: d.telefon || null,
    email: d.email || null,
    nrKonta: d.nrKonta || null,
    uwagi: d.uwagi || null,
    jezykPreferowany: d.jezykPreferowany || null,
    decyzjaPobytowaDo: toDate(d.decyzjaPobytowaDo),
    typDokumentuPobytowego: d.typDokumentuPobytowego || null,
  };

  await db.fdkForeigner.update({ where: { id }, data: newData });

  // Audit log
  await logChanges(
    id,
    user.email,
    oldForeigner as unknown as Record<string, unknown>,
    newData as unknown as Record<string, unknown>
  );

  revalidateFdk(id);
  return { ok: true };
}

export async function deleteForeignerAction(id: number): Promise<FdkResult> {
  await requireAdmin();
  await db.fdkForeigner.delete({ where: { id } });
  revalidateFdk();
  return { ok: true };
}

// =============================================================================
// REMINDER HELPERS
// =============================================================================

/**
 * Manage the "55-day work start" reminder for zezwolenie na pracę.
 * If `przewidywanaDataPodjecia` is false and `dataDo` exists → create reminder.
 * If `przewidywanaDataPodjecia` is true → remove any existing reminder.
 */
async function manageWpReminder(
  baseId: number,
  foreignerId: number,
  typ: string,
  dataDo: Date | null,
  przewidywanaDataPodjecia: boolean,
  komentarz: string | null,
  existingCalendarEventId: number | null,
  createdById: string
) {
  if (typ !== "ZEZWOLENIE") return;

  // Remove existing reminder if any
  if (existingCalendarEventId) {
    try {
      await db.calendarEvent.delete({ where: { id: existingCalendarEventId } });
    } catch { /* already deleted */ }
    await db.fdkEmploymentBase.update({
      where: { id: baseId },
      data: { reminderCalendarEventId: null, reminderDate: null },
    });
  }

  // Create new reminder if tick is NOT checked and dataDo exists
  if (!przewidywanaDataPodjecia && dataDo) {
    const reminderDate = new Date(dataDo);
    reminderDate.setDate(reminderDate.getDate() + 55);

    // Fetch foreigner name for the calendar entry
    const foreigner = await db.fdkForeigner.findUnique({
      where: { id: foreignerId },
      select: { imie: true, nazwisko: true },
    });
    const foreignerName = foreigner
      ? `${foreigner.imie ?? ""} ${foreigner.nazwisko}`.trim()
      : `Cudzoziemiec #${foreignerId}`;

    const event = await db.calendarEvent.create({
      data: {
        type: "OTHER",
        title: `Podjęcie pracy — ${foreignerName}`,
        description: `Przypomnienie: 55. dzień od daty ważności zezwolenia na pracę.\nLink: /admin/fdk/${foreignerId}?tab=bases&baseId=${baseId}${komentarz ? `\n\nKomentarz: ${komentarz}` : ""}`,
        eventDate: reminderDate,
        foreignerId,
        foreignerName,
        createdById,
        notes: komentarz,
      },
    });

    await db.fdkEmploymentBase.update({
      where: { id: baseId },
      data: { reminderCalendarEventId: event.id, reminderDate },
    });

    revalidatePath("/admin/kalendarz");
  }
}

/**
 * Manage calendar events for oświadczenie o powierzeniu pracy.
 * Creates reminders based on:
 * - podjeciePracyStatus (PODJAL → calendar entry, NIE_PODJAL → entry 14 days after dataDo)
 * - dataStartu → 2 entries: -1 day "Zgłoszenie umowy", +7 days "Notyfikacja podjęcia pracy"
 */
async function manageOswReminders(
  baseId: number,
  foreignerId: number,
  typ: string,
  dataDo: Date | null,
  podjeciePracyStatus: string | null,
  podjeciePracyData: Date | null,
  dataStartu: Date | null,
  existingEventIds: string | null,
  createdById: string
) {
  if (typ !== "OSWIADCZENIE") return;

  // Remove existing calendar events
  if (existingEventIds) {
    const ids = existingEventIds.split(",").map(Number).filter(Boolean);
    for (const eid of ids) {
      try { await db.calendarEvent.delete({ where: { id: eid } }); } catch { /* ok */ }
    }
    await db.fdkEmploymentBase.update({
      where: { id: baseId },
      data: { oswCalendarEventIds: null },
    });
  }

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: foreignerId },
    select: { imie: true, nazwisko: true },
  });
  const fName = foreigner ? `${foreigner.imie ?? ""} ${foreigner.nazwisko}`.trim() : `#${foreignerId}`;
  const newIds: number[] = [];

  // Podjęcie pracy
  if (podjeciePracyStatus === "PODJAL" && podjeciePracyData) {
    const ev = await db.calendarEvent.create({
      data: {
        type: "OTHER",
        title: `Podjęcie pracy — ${fName}`,
        description: `Oświadczenie: podjęcie pracy.\nLink: /admin/fdk/${foreignerId}?tab=bases&baseId=${baseId}`,
        eventDate: podjeciePracyData,
        foreignerId,
        foreignerName: fName,
        createdById,
      },
    });
    newIds.push(ev.id);
  }

  // Niepodjęcie pracy — 14 dni od daty ważności
  if (podjeciePracyStatus === "NIE_PODJAL" && dataDo) {
    const d14 = new Date(dataDo);
    d14.setDate(d14.getDate() + 14);
    const ev = await db.calendarEvent.create({
      data: {
        type: "OTHER",
        title: `Niepodjęcie pracy (14 dni) — ${fName}`,
        description: `Oświadczenie: termin na zgłoszenie niepodjęcia pracy.\nLink: /admin/fdk/${foreignerId}?tab=bases&baseId=${baseId}`,
        eventDate: d14,
        foreignerId,
        foreignerName: fName,
        createdById,
      },
    });
    newIds.push(ev.id);
  }

  // Data startu → 2 powiadomienia
  if (dataStartu) {
    const dayBefore = new Date(dataStartu);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const ev1 = await db.calendarEvent.create({
      data: {
        type: "OTHER",
        title: `Zgłoszenie umowy — ${fName}`,
        description: `1 dzień przed datą startu pracy.\nLink: /admin/fdk/${foreignerId}?tab=bases&baseId=${baseId}`,
        eventDate: dayBefore,
        foreignerId,
        foreignerName: fName,
        createdById,
      },
    });
    newIds.push(ev1.id);

    const day7 = new Date(dataStartu);
    day7.setDate(day7.getDate() + 7);
    const ev2 = await db.calendarEvent.create({
      data: {
        type: "OTHER",
        title: `Notyfikacja podjęcia pracy — ${fName}`,
        description: `7. dzień od daty startu pracy.\nLink: /admin/fdk/${foreignerId}?tab=bases&baseId=${baseId}`,
        eventDate: day7,
        foreignerId,
        foreignerName: fName,
        createdById,
      },
    });
    newIds.push(ev2.id);
  }

  if (newIds.length > 0) {
    await db.fdkEmploymentBase.update({
      where: { id: baseId },
      data: { oswCalendarEventIds: newIds.join(",") },
    });
    revalidatePath("/admin/kalendarz");
  }
}

// =============================================================================
// EMPLOYMENT BASES CRUD
// =============================================================================

export async function createEmploymentBaseAction(
  input: z.infer<typeof employmentBaseSchema>
): Promise<FdkResult> {
  const user = await requireAdmin();
  const parsed = employmentBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const d = parsed.data;
  const created = await db.fdkEmploymentBase.create({
    data: buildEmploymentBaseData(d),
  });

  // Manage WP reminder (55-day work start)
  await manageWpReminder(
    created.id,
    d.foreignerId,
    d.typ,
    toDate(d.dataDo),
    d.przewidywanaDataPodjecia ?? false,
    d.przewidywanaDataKomentarz || null,
    null,
    user.id
  );

  // Manage OŚW reminders
  await manageOswReminders(
    created.id,
    d.foreignerId,
    d.typ,
    toDate(d.dataDo),
    d.podjeciePracyStatus || null,
    toDate(d.podjeciePracyData),
    toDate(d.dataStartu),
    null,
    user.id
  );

  revalidateFdk(d.foreignerId);
  return { ok: true };
}

export async function updateEmploymentBaseAction(
  id: number,
  input: z.infer<typeof employmentBaseSchema>
): Promise<FdkResult> {
  const user = await requireAdmin();
  const parsed = employmentBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const old = await db.fdkEmploymentBase.findUnique({ where: { id } });
  if (!old) return { ok: false, error: "not_found" };

  const d = parsed.data;
  const { foreignerId: _fid, ...dataWithoutForeignerId } = buildEmploymentBaseData(d);
  const newData = dataWithoutForeignerId;

  await db.fdkEmploymentBase.update({ where: { id }, data: newData });

  // Audit log on the foreigner
  await logChanges(
    d.foreignerId,
    user.email,
    { [`base_${id}_status`]: old.status, [`base_${id}_dataDo`]: old.dataDo },
    { [`base_${id}_status`]: newData.status, [`base_${id}_dataDo`]: newData.dataDo }
  );

  // Manage WP reminder (55-day work start)
  await manageWpReminder(
    id,
    d.foreignerId,
    d.typ,
    toDate(d.dataDo),
    d.przewidywanaDataPodjecia ?? false,
    d.przewidywanaDataKomentarz || null,
    old.reminderCalendarEventId,
    user.id
  );

  // Manage OŚW reminders
  await manageOswReminders(
    id,
    d.foreignerId,
    d.typ,
    toDate(d.dataDo),
    d.podjeciePracyStatus || null,
    toDate(d.podjeciePracyData),
    toDate(d.dataStartu),
    old.oswCalendarEventIds,
    user.id
  );

  revalidateFdk(d.foreignerId);
  return { ok: true };
}

export async function deleteEmploymentBaseAction(id: number): Promise<FdkResult> {
  await requireAdmin();
  const base = await db.fdkEmploymentBase.findUnique({ where: { id } });
  if (!base) return { ok: false, error: "not_found" };
  await db.fdkEmploymentBase.delete({ where: { id } });
  revalidateFdk(base.foreignerId);
  return { ok: true };
}

// =============================================================================
// HR — WYŚLIJ DANE DO PRZYGOTOWANIA UMOWY (Z PODGLĄDEM)
// =============================================================================

/**
 * Build the HR email content for preview before sending.
 */
export async function getHrEmailPreviewAction(foreignerId: number): Promise<
  { ok: true; subject: string; html: string; to: string } | { ok: false; error: string }
> {
  await requireAdmin();

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: foreignerId },
    include: { hrContracts: { orderBy: { rok: "desc" } } },
  });
  if (!foreigner) return { ok: false, error: "not_found" };
  if (foreigner.hrContracts.length === 0) return { ok: false, error: "no_contracts" };

  const c = foreigner.hrContracts[0];
  const fmt = (d: Date | null) => d ? d.toLocaleDateString("pl-PL") : "—";

  const html = `
    <h2>Dane do przygotowania umowy — ${foreigner.imie ?? ""} ${foreigner.nazwisko}</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Imię i nazwisko</td><td style="padding:4px 0;font-weight:600;">${foreigner.imie ?? ""} ${foreigner.nazwisko}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">PESEL</td><td style="padding:4px 0;">${foreigner.pesel ?? "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Nr paszportu</td><td style="padding:4px 0;">${foreigner.nrPaszportu ?? "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Adres</td><td style="padding:4px 0;">${foreigner.adresPl ?? "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Telefon</td><td style="padding:4px 0;">${foreigner.telefon ?? "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td style="padding:4px 0;">${foreigner.email ?? "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Nr konta</td><td style="padding:4px 0;">${foreigner.nrKonta ?? "—"}</td></tr>
      <tr><td colspan="2" style="padding:12px 0 4px;border-top:1px solid #eee;font-weight:700;">Kontrakt ${c.rok}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Okres</td><td style="padding:4px 0;">${fmt(c.dataOd)} – ${fmt(c.dataDo)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Rodzaj umowy</td><td style="padding:4px 0;">${c.rodzajUmowy ?? "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">KUP</td><td style="padding:4px 0;">${c.kup ? `${Number(c.kup) * 100}%` : "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Kwota brutto min.</td><td style="padding:4px 0;">${c.kwotaBruttoMin ? `${Number(c.kwotaBruttoMin).toLocaleString("pl-PL")} PLN` : "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Kwota całościowa</td><td style="padding:4px 0;">${c.kwotaCalosciowa ? `${Number(c.kwotaCalosciowa).toLocaleString("pl-PL")} PLN` : "—"}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Stanowisko</td><td style="padding:4px 0;">${c.stanowisko ?? "—"}</td></tr>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#999;">Wysłano z panelu getpermit.pl — Sprawy FDK</p>
  `;

  const subject = `Przygotuj umowę — ${foreigner.imie ?? ""} ${foreigner.nazwisko} (${c.rodzajUmowy ?? "umowa"} ${c.rok})`;

  return { ok: true, subject, html, to: "g.stepien@firmadlakazdego.pl" };
}

/**
 * Send the HR email with optional custom notes appended.
 */
export async function sendHrContractEmailAction(
  foreignerId: number,
  customNotes?: string
): Promise<FdkResult> {
  await requireAdmin();

  const preview = await getHrEmailPreviewAction(foreignerId);
  if (!preview.ok) return preview;

  const { Resend } = await import("resend");
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) return { ok: false, error: "email_not_configured" };

  let html = preview.html;
  if (customNotes && customNotes.trim()) {
    html += `<div style="margin-top:16px;padding:12px;background:#f9f9f9;border:1px solid #eee;border-radius:4px;font-size:14px;"><strong>Uwagi dodatkowe:</strong><br/>${customNotes.replace(/\n/g, "<br/>")}</div>`;
  }

  const from = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";
  const { error } = await resend.emails.send({
    from,
    to: preview.to,
    subject: preview.subject,
    html,
  });

  if (error) {
    console.error("[fdk] Email send error:", error);
    return { ok: false, error: "send_failed" };
  }

  return { ok: true };
}

// =============================================================================
// CALENDAR EVENTS
// =============================================================================

const calendarEventSchema = z.object({
  type: z.enum(["OFFICE_VISIT", "OFFICE_MEETING", "DOCUMENT_EXPIRY", "WORK_START_REMINDER", "CONTRACT_REMINDER", "WORK_NOTIFICATION", "OTHER"]),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().optional().or(z.literal("")),
  eventDate: z.string().min(1),
  eventTime: z.string().optional().or(z.literal("")),
  place: z.string().trim().optional().or(z.literal("")),
  organ: z.string().trim().optional().or(z.literal("")),
  foreignerId: z.number().int().optional().or(z.literal(0)),
  notes: z.string().trim().optional().or(z.literal("")),
});

export async function createCalendarEventAction(
  input: z.infer<typeof calendarEventSchema>
): Promise<FdkResult & { id?: number }> {
  const user = await requireAdmin();
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const d = parsed.data;
  const foreignerId = d.foreignerId && d.foreignerId > 0 ? d.foreignerId : null;

  let foreignerName: string | null = null;
  let foreignerEmail: string | null = null;
  let foreignerLang: string | null = null;
  if (foreignerId) {
    const f = await db.fdkForeigner.findUnique({
      where: { id: foreignerId },
      select: { imie: true, nazwisko: true, email: true, jezykPreferowany: true },
    });
    if (f) {
      foreignerName = `${f.imie ?? ""} ${f.nazwisko}`.trim();
      foreignerEmail = f.email;
      foreignerLang = f.jezykPreferowany;
    }
  }

  const event = await db.calendarEvent.create({
    data: {
      type: d.type as "OFFICE_VISIT" | "OFFICE_MEETING" | "OTHER",
      title: d.title,
      description: d.description || null,
      eventDate: new Date(d.eventDate),
      eventTime: d.eventTime || null,
      place: d.place || null,
      organ: d.organ || null,
      foreignerId,
      foreignerName,
      createdById: user.id,
      notes: d.notes || null,
    },
  });

  // Auto-send email for OFFICE_VISIT if foreigner has email
  if (d.type === "OFFICE_VISIT" && foreignerEmail) {
    void sendOfficeVisitNotification(
      foreignerEmail,
      foreignerName ?? "",
      foreignerLang ?? "pl",
      new Date(d.eventDate),
      d.eventTime || null,
      d.place || null,
      d.organ || null,
      d.notes || null
    ).then(() => {
      db.calendarEvent.update({
        where: { id: event.id },
        data: { emailSent: true },
      }).catch(() => {});
    }).catch((err) => {
      console.error("[calendar] Failed to send office visit email:", err);
    });
  }

  revalidatePath("/admin/kalendarz");
  return { ok: true, id: event.id };
}

export async function updateCalendarEventAction(
  id: number,
  input: z.infer<typeof calendarEventSchema>
): Promise<FdkResult> {
  await requireAdmin();
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const d = parsed.data;
  const foreignerId = d.foreignerId && d.foreignerId > 0 ? d.foreignerId : null;

  let foreignerName: string | null = null;
  if (foreignerId) {
    const f = await db.fdkForeigner.findUnique({
      where: { id: foreignerId },
      select: { imie: true, nazwisko: true },
    });
    if (f) foreignerName = `${f.imie ?? ""} ${f.nazwisko}`.trim();
  }

  await db.calendarEvent.update({
    where: { id },
    data: {
      type: d.type as "OFFICE_VISIT" | "OFFICE_MEETING" | "OTHER",
      title: d.title,
      description: d.description || null,
      eventDate: new Date(d.eventDate),
      eventTime: d.eventTime || null,
      place: d.place || null,
      organ: d.organ || null,
      foreignerId,
      foreignerName,
      notes: d.notes || null,
    },
  });

  revalidatePath("/admin/kalendarz");
  return { ok: true };
}

export async function deleteCalendarEventAction(id: number): Promise<FdkResult> {
  await requireAdmin();
  await db.calendarEvent.delete({ where: { id } });
  revalidatePath("/admin/kalendarz");
  return { ok: true };
}

export async function toggleCalendarEventDoneAction(id: number): Promise<FdkResult> {
  await requireAdmin();
  const ev = await db.calendarEvent.findUnique({ where: { id } });
  if (!ev) return { ok: false, error: "not_found" };

  await db.calendarEvent.update({
    where: { id },
    data: {
      done: !ev.done,
      doneAt: ev.done ? null : new Date(),
    },
  });
  revalidatePath("/admin/kalendarz");
  return { ok: true };
}

async function sendOfficeVisitNotification(
  email: string,
  name: string,
  lang: string,
  date: Date,
  time: string | null,
  place: string | null,
  organ: string | null,
  notes: string | null
) {
  const { Resend } = await import("resend");
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) return;

  const dateStr = date.toLocaleDateString(lang === "en" ? "en-GB" : "pl-PL");
  const timeStr = time ? ` o godz. ${time}` : "";

  const subjects: Record<string, string> = {
    pl: "Informacja o wizycie w urzędzie",
    en: "Office visit information",
    ru: "Информация о визите в учреждение",
  };

  const bodies: Record<string, string> = {
    pl: `Dzień dobry${name ? ` ${name}` : ""},\n\nInformujemy o zaplanowanej wizycie w urzędzie:\n\nData: ${dateStr}${timeStr}\n${place ? `Miejsce: ${place}\n` : ""}${organ ? `Organ: ${organ}\n` : ""}${notes ? `\nDodatkowe informacje:\n${notes}\n` : ""}\nPozdrawiamy,\nZespół Legalizacji FDK`,
    en: `Good morning${name ? ` ${name}` : ""},\n\nWe would like to inform you about a scheduled office visit:\n\nDate: ${dateStr}${timeStr}\n${place ? `Place: ${place}\n` : ""}${organ ? `Office: ${organ}\n` : ""}${notes ? `\nAdditional information:\n${notes}\n` : ""}\nBest regards,\nFDK Legalization Team`,
    ru: `Добрый день${name ? ` ${name}` : ""},\n\nСообщаем о запланированном визите в учреждение:\n\nДата: ${dateStr}${timeStr}\n${place ? `Место: ${place}\n` : ""}${organ ? `Учреждение: ${organ}\n` : ""}${notes ? `\nДополнительная информация:\n${notes}\n` : ""}\nС уважением,\nОтдел легализации FDK`,
  };

  const from = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";
  const effectiveLang = lang in subjects ? lang : "pl";

  await resend.emails.send({
    from,
    to: email,
    subject: subjects[effectiveLang],
    text: bodies[effectiveLang],
  });
}

// =============================================================================
// NOTIFICATION SETTINGS
// =============================================================================

const notificationSettingsSchema = z.object({
  teamNotifyFrequencyDays: z.number().int().min(1).max(365),
  oswiadczenieDaysBefore: z.number().int().min(1).max(365),
  zezwolenieDaysBefore: z.number().int().min(1).max(730),
  pobytDaysBefore: z.number().int().min(1).max(365),
});

export async function updateNotificationSettingsAction(
  input: z.infer<typeof notificationSettingsSchema>
): Promise<FdkResult> {
  await requireAdmin();
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  await db.notificationSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });

  revalidatePath("/admin/ustawienia");
  return { ok: true };
}

// =============================================================================
// ATTACHMENTS
// =============================================================================

export async function deleteFdkAttachmentAction(id: number): Promise<FdkResult> {
  await requireAdmin();
  const att = await db.fdkAttachment.findUnique({ where: { id } });
  if (!att) return { ok: false, error: "not_found" };

  // TODO: Delete from Supabase Storage
  await db.fdkAttachment.delete({ where: { id } });
  revalidateFdk(att.foreignerId);
  return { ok: true };
}
