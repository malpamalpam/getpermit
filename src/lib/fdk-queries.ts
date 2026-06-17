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
 * Everything else is derived from dataOd / dataDo relative to today.
 */
export function computeStatus(base: {
  status: string;
  dataOd: Date | null;
  dataDo: Date | null;
}): string {
  // Preserve manual statuses that don't depend on dates
  if (base.status === "UCHYLONE" || base.status === "UMORZONE") {
    return base.status;
  }

  const now = new Date();
  // Normalize to start of day for fair comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
export function withComputedStatuses<T extends { status: string; dataOd: Date | null; dataDo: Date | null }>(
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
  employmentBases?: { typ: string; status: string; dataOd: Date | null; dataDo: Date | null }[];
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
