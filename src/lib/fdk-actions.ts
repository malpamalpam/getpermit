"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
});

const employmentBaseSchema = z.object({
  foreignerId: z.number().int(),
  typ: z.enum(["ZEZWOLENIE", "OSWIADCZENIE", "KARTA_POBYTU", "BLUE_CARD", "ZGLOSZENIE_UA"]),
  status: z.enum(["AKTYWNE", "WYGASLE", "UCHYLONE", "UMORZONE", "ZAKONCZONE", "W_TRAKCIE", "BRAK_DANYCH"]),
  rodzajUmowy: z.string().optional().or(z.literal("")),
  dataOd: z.string().optional().or(z.literal("")),
  dataDo: z.string().optional().or(z.literal("")),
  firma: z.string().optional().or(z.literal("")),
  nrDecyzji: z.string().optional().or(z.literal("")),
  wezwanieBraki: z.string().optional().or(z.literal("")),
  nrOswiadczenia: z.string().optional().or(z.literal("")),
  urzad: z.string().optional().or(z.literal("")),
  rodzajSprawy: z.string().optional().or(z.literal("")),
  sygnatura: z.string().optional().or(z.literal("")),
  stanowisko: z.string().optional().or(z.literal("")),
  uwagi: z.string().optional().or(z.literal("")),
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

// =============================================================================
// FOREIGNERS CRUD
// =============================================================================

export type FdkResult = { ok: true } | { ok: false; error: string };

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
    },
  });

  revalidateFdk();
  return { ok: true, id: foreigner.id };
}

export async function updateForeignerAction(
  id: number,
  input: z.infer<typeof foreignerSchema>
): Promise<FdkResult> {
  await requireAdmin();
  const parsed = foreignerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const d = parsed.data;
  await db.fdkForeigner.update({
    where: { id },
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
    },
  });

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
// EMPLOYMENT BASES CRUD
// =============================================================================

export async function createEmploymentBaseAction(
  input: z.infer<typeof employmentBaseSchema>
): Promise<FdkResult> {
  await requireAdmin();
  const parsed = employmentBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const d = parsed.data;
  await db.fdkEmploymentBase.create({
    data: {
      foreignerId: d.foreignerId,
      typ: d.typ,
      status: d.status,
      rodzajUmowy: d.rodzajUmowy || null,
      dataOd: toDate(d.dataOd),
      dataDo: toDate(d.dataDo),
      firma: d.firma || null,
      nrDecyzji: d.nrDecyzji || null,
      wezwanieBraki: d.wezwanieBraki || null,
      nrOswiadczenia: d.nrOswiadczenia || null,
      urzad: d.urzad || null,
      rodzajSprawy: d.rodzajSprawy || null,
      sygnatura: d.sygnatura || null,
      stanowisko: d.stanowisko || null,
      uwagi: d.uwagi || null,
    },
  });

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
// HR — WYŚLIJ DANE DO PRZYGOTOWANIA UMOWY
// =============================================================================

export async function sendHrContractEmailAction(foreignerId: number): Promise<FdkResult> {
  await requireAdmin();

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: foreignerId },
    include: { hrContracts: { orderBy: { rok: "desc" } } },
  });
  if (!foreigner) return { ok: false, error: "not_found" };
  if (foreigner.hrContracts.length === 0) return { ok: false, error: "no_contracts" };

  const { Resend } = await import("resend");
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) return { ok: false, error: "email_not_configured" };

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

  const from = process.env.CONTACT_EMAIL_FROM ?? "noreply@getpermit.pl";
  const { error } = await resend.emails.send({
    from,
    to: "g.stepien@firmadlakazdego.pl",
    subject: `Przygotuj umowę — ${foreigner.imie ?? ""} ${foreigner.nazwisko} (${c.rodzajUmowy ?? "umowa"} ${c.rok})`,
    html,
  });

  if (error) {
    console.error("[fdk] Email send error:", error);
    return { ok: false, error: "send_failed" };
  }

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
