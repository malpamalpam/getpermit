import { db } from "@/lib/db";

/**
 * Data-fetching functions and shared types for FDK module.
 * Separated from server actions (fdk-actions.ts) so they can be used
 * from server components and "use client" components without "use server" issues.
 */

export type FdkResult = { ok: true } | { ok: false; error: string };

/**
 * Compute document status from dates.
 * Manual overrides (UCHYLONE, UMORZONE) are preserved.
 * Everything else is derived from dataOd / dataDo / dataZakPracy relative to today.
 */
export function computeStatus(base: {
  status: string;
  dataOd: Date | null;
  dataDo: Date | null;
  dataZakPracy?: Date | null;
}): string {
  // Preserve manual statuses that don't depend on dates
  if (base.status === "UCHYLONE" || base.status === "UMORZONE" || base.status === "NIEAKTYWNE") {
    return base.status;
  }

  const now = new Date();
  // Normalize to start of day for fair comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // If dataZakPracy exists and is in the past → NIEAKTYWNE (work ended)
  if (base.dataZakPracy) {
    const zakPracy = new Date(base.dataZakPracy.getFullYear(), base.dataZakPracy.getMonth(), base.dataZakPracy.getDate());
    if (zakPracy <= today) {
      return "NIEAKTYWNE";
    }
  }

  const dataOd = base.dataOd
    ? new Date(base.dataOd.getFullYear(), base.dataOd.getMonth(), base.dataOd.getDate())
    : null;
  const dataDo = base.dataDo
    ? new Date(base.dataDo.getFullYear(), base.dataDo.getMonth(), base.dataDo.getDate())
    : null;

  // If dataDo exists and is in the past → expired
  if (dataDo && dataDo < today) {
    return "WYGASLE";
  }

  // If dataOd exists and is today or past, and dataDo is null or future → active
  if (dataOd && dataOd <= today && (!dataDo || dataDo >= today)) {
    return "AKTYWNE";
  }

  // If dataOd exists and is in the future → in progress (pending start)
  if (dataOd && dataOd > today) {
    return "W_TRAKCIE";
  }

  // No dates at all
  return "BRAK_DANYCH";
}

/**
 * Apply computeStatus to an array of employment bases.
 * Returns new array with computed status field.
 */
export function withComputedStatuses<T extends { status: string; dataOd: Date | null; dataDo: Date | null; dataZakPracy?: Date | null }>(
  bases: T[]
): T[] {
  return bases.map((b) => ({ ...b, status: computeStatus(b) as typeof b.status }));
}

/**
 * Check if a foreigner has an active residence permit (decyzja pobytowa).
 * If yes, WP and OŚW notifications should be suppressed.
 */
export function hasActiveResidencePermit(foreigner: {
  decyzjaPobytowaDo: Date | null;
  employmentBases?: { typ: string; status: string; dataOd: Date | null; dataDo: Date | null; dataZakPracy?: Date | null }[];
}): boolean {
  const now = new Date();

  // Check direct field first
  if (foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo > now) {
    return true;
  }

  // Check employment bases for active KARTA_POBYTU (using computed status)
  if (foreigner.employmentBases) {
    return foreigner.employmentBases.some(
      (b) =>
        b.typ === "KARTA_POBYTU" &&
        computeStatus(b) === "AKTYWNE"
    );
  }

  return false;
}

/**
 * Deactivate other active residence permits (KARTA_POBYTU, BLUE_CARD) for a foreigner
 * when a new one becomes active. Only one can be active at a time.
 * Returns the number of deactivated bases.
 */
export async function deactivatePreviousResidencePermits(
  foreignerId: number,
  newBaseId: number,
  changedBy: string
): Promise<number> {
  const residenceTypes = ["KARTA_POBYTU", "BLUE_CARD"];
  const otherActive = await db.fdkEmploymentBase.findMany({
    where: {
      foreignerId,
      id: { not: newBaseId },
      typ: { in: residenceTypes },
      status: { in: ["AKTYWNE", "BRAK_DANYCH"] },
    },
  });

  for (const base of otherActive) {
    await db.fdkEmploymentBase.update({
      where: { id: base.id },
      data: { status: "NIEAKTYWNE" },
    });
    await db.fdkChangeLog.create({
      data: {
        foreignerId,
        changedBy,
        field: "employment_base_auto",
        oldValue: base.status,
        newValue: `Podstawa #${base.id} (${base.typ}) dezaktywowana - zastapiona przez nowa decyzje pobytowa #${newBaseId}`,
      },
    });
  }

  return otherActive.length;
}

export async function getNotificationSettings() {
  let settings = await db.notificationSettings.findFirst({ where: { id: 1 } });
  if (!settings) {
    settings = await db.notificationSettings.create({
      data: {
        id: 1,
        teamNotifyFrequencyDays: 14,
        oswiadczenieDaysBefore: 45,
        zezwolenieDaysBefore: 240,
        pobytDaysBefore: 60,
      },
    });
  }
  return settings;
}
