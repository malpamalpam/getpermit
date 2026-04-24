import { db } from "@/lib/db";

/**
 * Data-fetching functions and shared types for FDK module.
 * Separated from server actions (fdk-actions.ts) so they can be used
 * from server components and "use client" components without "use server" issues.
 */

export type FdkResult = { ok: true } | { ok: false; error: string };

/**
 * Check if a foreigner has an active residence permit (decyzja pobytowa).
 * If yes, WP and OŚW notifications should be suppressed.
 */
export function hasActiveResidencePermit(foreigner: {
  decyzjaPobytowaDo: Date | null;
  employmentBases?: { typ: string; status: string; dataDo: Date | null }[];
}): boolean {
  const now = new Date();

  // Check direct field first
  if (foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo > now) {
    return true;
  }

  // Check employment bases for active KARTA_POBYTU
  if (foreigner.employmentBases) {
    return foreigner.employmentBases.some(
      (b) =>
        b.typ === "KARTA_POBYTU" &&
        b.status === "AKTYWNE" &&
        b.dataDo &&
        b.dataDo > now
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
