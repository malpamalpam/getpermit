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
