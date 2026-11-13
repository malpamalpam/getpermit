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
  // Preserve only true terminal statuses (administrative decisions, not scraper artifacts)
  if (base.status === "UCHYLONE" || base.status === "UMORZONE") {
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
 * Jaccard word-overlap similarity between two strings.
 * Returns null if either input is null/empty (caller decides what null means).
 * Ignores words shorter than 3 characters.
 */
/**
 * Stem a Polish word by taking the first N characters.
 * Handles declension: "Specjalisty" → "specjali", "Specjalista" → "specjali" ✓
 * Words < 5 chars: use as-is (stopwords/prepositions expected to match exactly).
 */
function stemPL(w: string): string {
  if (w.length <= 5) return w;
  // Take the first 70% of the word (min 5 chars) — covers Polish inflectional suffixes
  return w.slice(0, Math.max(5, Math.floor(w.length * 0.7)));
}

function jaccardWords(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3).map(stemPL);
  const wa = tokenize(a);
  const wb = tokenize(b);
  if (wa.length === 0 || wb.length === 0) return null;
  const sa = new Set(wa);
  const sb = new Set(wb);
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 1 : inter / union;
}

/** Normalize company name for comparison (strip legal form suffixes). */
function normalizeFirmaForMatch(s: string | null | undefined): string | null {
  if (!s) return null;
  const result = s
    .toLowerCase()
    .replace(/\b(sp\.?\s*z\.?\s*o\.?o\.?|s\.?a\.?|s\.?c\.?|sp\.j\.?|spółka\s+z\s+o\.o\.|spółka\s+akcyjna)\b/gi, "")
    .replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return result || null;
}

/**
 * Apply computeStatus to an array of employment bases.
 * Returns new array with computed status field.
 * Also enforces: only one residence permit (KARTA_POBYTU/BLUE_CARD) can be AKTYWNE.
 * Others are marked NIEAKTYWNE (superseded by the newest one).
 */
export function withComputedStatuses<T extends { id?: number; typ?: string; status: string; dataOd: Date | null; dataDo: Date | null; dataZakPracy?: Date | null; rodzajUmowy?: string | null; firma?: string | null; stanowisko?: string | null }>(
  bases: T[]
): T[] {
  const uaTypes = ["ZGLOSZENIE_UA", "POWIADOMIENIE_UA"];
  const TRC_TYPES = new Set([
    "TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ",
    "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC",
    "TRC_INNE_OKOLICZNOSCI", "TRC_BLUE_CARD", "KARTA_POBYTU", "BLUE_CARD",
  ]);
  const ABSORBABLE_TYPES = new Set([
    "ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "ZEZWOLENIE", "OSWIADCZENIE",
  ]);

  // Step 1: Compute raw date-based status for all bases
  const computed = bases.map((b) => {
    // Preserve terminal statuses: UCHYLONE, UMORZONE
    if (b.status === "UCHYLONE" || b.status === "UMORZONE") {
      return { ...b };
    }
    // For UA notifications: computed by enforceNewestUaOnly below
    if (b.typ && uaTypes.includes(b.typ)) {
      return { ...b, status: "AKTYWNE" as typeof b.status };
    }
    // ALL other types: compute from dates (ignore DB NIEAKTYWNE — it may be stale from scraper)
    return { ...b, status: computeStatus(b) as typeof b.status };
  });

  // Step 2: Absorption — active TRC absorbs overlapping zezwolenie/oświadczenie
  // Rule: If there's an active TRC whose period overlaps, the zezwolenie/oświadczenie
  // gets status "WCHŁONIĘTE" with a reference to the absorbing TRC.
  const TYPE_LABELS: Record<string, string> = {
    TRC_FDK: "TRC — FDK", TRC_BLUE_CARD: "Blue Card", TRC_HUMANITARNE: "TRC — humanitarne",
    TRC_INNY_PRACODAWCA: "TRC — inny pracodawca", TRC_POBYT_Z_CUDZ: "TRC — pobyt z cudzoziemcem",
    TRC_MALZONEK_PL: "TRC — małżonek PL", TRC_STUDIA: "TRC — studia",
    TRC_ABSOLWENT: "TRC — absolwent", TRC_DZIALALNOSC: "TRC — działalność",
    TRC_INNE_OKOLICZNOSCI: "TRC — inne okoliczności", KARTA_POBYTU: "TRC", BLUE_CARD: "Blue Card",
  };
  const activeTrc = computed.filter(
    (b) => b.typ && TRC_TYPES.has(b.typ) && b.status === "AKTYWNE"
  );
  if (activeTrc.length > 0) {
    for (const b of computed) {
      if (!b.typ || !ABSORBABLE_TYPES.has(b.typ) || b.status !== "AKTYWNE") continue;
      const absorbingTrc = activeTrc.find((trc) => {
        if (!trc.dataOd || !b.dataDo) return false;
        // Condition 1: Date overlap — TRC started before or when employment ends
        if (trc.dataOd.getTime() > b.dataDo.getTime()) return false;
        // Condition 2: TRC started no earlier than employment started (TRC is a continuation/upgrade)
        if (b.dataOd && trc.dataOd.getTime() < b.dataOd.getTime()) return false;

        // Condition 3: Same employer (Jaccard ≥ 0.5 on normalized firma, skip if either null)
        const trcFirma = normalizeFirmaForMatch(trc.firma);
        const bFirma = normalizeFirmaForMatch(b.firma);
        if (trcFirma !== null && bFirma !== null) {
          const sim = jaccardWords(trcFirma, bFirma);
          if (sim !== null && sim < 0.5) return false;
        }

        // Condition 4: Same stanowisko (Jaccard ≥ 0.85, skip if either null)
        const trcStan = trc.stanowisko;
        const bStan = b.stanowisko;
        if (trcStan && bStan) {
          const sim = jaccardWords(trcStan, bStan);
          if (sim !== null && sim < 0.85) return false;
        }

        // Condition 5: Same rodzajUmowy (case-insensitive exact, skip if either null)
        const trcRU = trc.rodzajUmowy;
        const bRU = b.rodzajUmowy;
        if (trcRU && bRU) {
          const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
          if (norm(trcRU) !== norm(bRU)) return false;
        }

        return true;
      });
      if (absorbingTrc) {
        const label = TYPE_LABELS[absorbingTrc.typ ?? ""] ?? absorbingTrc.typ;
        const nr = (absorbingTrc as { nrDecyzji?: string | null }).nrDecyzji ?? "";
        const od = absorbingTrc.dataOd?.toISOString().slice(0, 10).split("-").reverse().join(".") ?? "";
        (b as Record<string, unknown>).status = "NIEAKTYWNE";
        (b as Record<string, unknown>)._absorbedBy = `Wchłonięte przez ${label}${nr ? ` (${nr})` : ""} od ${od}`;
      }
    }
  }

  // Step 3: UA — enforce newest per rodzajUmowy
  const uaBases = computed.filter((b) => b.typ && uaTypes.includes(b.typ));
  if (uaBases.length > 1) {
    const byContract = new Map<string, typeof uaBases>();
    for (const b of uaBases) {
      const key = (b.rodzajUmowy ?? "").toLowerCase().trim() || "_unknown";
      const group = byContract.get(key) ?? [];
      group.push(b);
      byContract.set(key, group);
    }
    for (const [, group] of byContract) {
      group.sort((a, b) => {
        const aDate = a.dataOd ?? a.dataDo ?? new Date(0);
        const bDate = b.dataOd ?? b.dataDo ?? new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
      for (let i = 1; i < group.length; i++) {
        (group[i] as { status: string }).status = "NIEAKTYWNE";
      }
    }
  }

  // Step 4: Enforce only one active residence permit (KARTA_POBYTU/BLUE_CARD)
  const residenceTypes = ["KARTA_POBYTU", "BLUE_CARD"];
  const activeResidence = computed.filter(
    (b) => b.typ && residenceTypes.includes(b.typ) && b.status === "AKTYWNE"
  );
  if (activeResidence.length > 1) {
    activeResidence.sort((a, b) => {
      const aDate = a.dataDo ?? a.dataOd ?? new Date(0);
      const bDate = b.dataDo ?? b.dataOd ?? new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
    for (let i = 1; i < activeResidence.length; i++) {
      (activeResidence[i] as { status: string }).status = "NIEAKTYWNE";
    }
  }

  return computed;
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
  // Don't write NIEAKTYWNE to DB — withComputedStatuses handles display status from dates.
  // Only log the supersession for history. Status is always computed dynamically.
  const newBase = await db.fdkEmploymentBase.findUnique({ where: { id: newBaseId } });
  if (!newBase) return 0;

  const otherActive = await db.fdkEmploymentBase.findMany({
    where: {
      foreignerId,
      id: { not: newBaseId },
      typ: { in: ["KARTA_POBYTU", "BLUE_CARD", "TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC", "TRC_BLUE_CARD", "TRC_INNE_OKOLICZNOSCI"] as never },
      status: { in: ["AKTYWNE", "BRAK_DANYCH"] as const },
    },
  });

  // Only deactivate bases whose period is FULLY superseded by the new base
  let count = 0;
  for (const base of otherActive) {
    // Skip if the other base has a LATER dataDo than the new one (it's the more recent permit)
    if (base.dataDo && newBase.dataDo && base.dataDo > newBase.dataDo) continue;
    // Skip if same type and same nrDecyzji (same document, just re-scraped)
    if (base.typ === newBase.typ && base.nrDecyzji && base.nrDecyzji === newBase.nrDecyzji) continue;

    await db.fdkChangeLog.create({
      data: {
        foreignerId,
        changedBy,
        field: "employment_base_auto",
        oldValue: base.status,
        newValue: `Podstawa #${base.id} (${base.typ}) zastąpiona przez nową decyzję pobytową #${newBaseId}`,
      },
    });
    count++;
  }

  return count;
}

/**
 * Tolerant name comparison for scrape verification.
 * Returns true if names are "close enough" (transliteration variants, subset match).
 * Returns false only for clearly different people.
 */
export function namesMatch(
  extractedName: string,
  profileName: string
): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[-_]/g, " ")
      .split(/\s+/).filter(Boolean).sort();

  const extracted = normalize(extractedName);
  const profile = normalize(profileName);

  if (extracted.length === 0 || profile.length === 0) return true;

  let matchingTokens = 0;
  for (const et of extracted) {
    for (const pt of profile) {
      if (et === pt) { matchingTokens++; break; }
      // Prefix match (min 3 chars) — handles transliteration variants
      if (et.length >= 3 && pt.length >= 3 && (et.startsWith(pt.substring(0, 3)) || pt.startsWith(et.substring(0, 3)))) {
        matchingTokens++; break;
      }
    }
  }

  return matchingTokens > 0;
}

/**
 * Unified hierarchy for picking the "current" employment basis.
 *
 * Higher number = higher priority (strongest right to work wins).
 * The hierarchy reflects B2 from the legalization dept:
 *   Strongest first: pobyt stały / rezydent > Blue Card / Karta pobytu (pobyt+praca)
 *   > zezwolenie > oświadczenie > powiadomienie UA
 *
 * IMPORTANT: this is the SINGLE SOURCE OF TRUTH — used by:
 *   - foreigners list page (kolumna "Podstawa pracy")
 *   - foreigner profile page (sekcja "Aktualna podstawa zatrudnienia")
 *   - EmploymentBasesTab (zakładka podstaw)
 *   - export HR CSV
 */
const EMPLOYMENT_HIERARCHY: Record<string, number> = {
  // v2 — new primary types (Reguły mapowania 10.2026)
  POBYT_STALY: 10, REZYDENT_UE: 10,
  STATUS_UCHODZCY: 9, OCHRONA_UZUPELNIAJACA: 9, OBYWATEL_UE: 9,
  UMOWA_WYSTAPIENIA: 9, WIZA_HUMANITARNA: 9,
  TRC_BLUE_CARD: 8, TRC_FDK: 8, TRC_INNY_PRACODAWCA: 8, TRC_HUMANITARNE: 8,
  TRC_POBYT_Z_CUDZ: 8, TRC_MALZONEK_PL: 8, TRC_STUDIA: 8,
  TRC_ABSOLWENT: 8, TRC_DZIALALNOSC: 8, TRC_INNE_OKOLICZNOSCI: 7,
  ZEZWOLENIE_A: 6, ZEZWOLENIE_A_KONT: 6,
  OSWIADCZENIE: 5,
  POWIADOMIENIE_UA: 4,
  KARTA_POLAKA: 3,
  STATUS_STUDENTA: 2, STATUS_ABSOLWENTA: 2,
  // Legacy OD types (backward compat)
  OD_POBYT_STALY: 10, OD_REZYDENT_UE: 10, OD_KARTA_POLAKA: 3,
  OD_OCHRONA_UZUP: 9, OD_UCHODZCA: 9, OD_WIZA_HUMAN: 9,
  OD_UE: 9, OD_UK_WYSTAPIENIE: 9,
  OD_ABSOLWENT: 2, OD_STUDENT: 2,
  OD_BLUE_CARD: 8, OD_MALZONEK_PL: 8, OD_CZLONEK_RODZINY: 8, OD_HUMANITARNE: 8,
  // Legacy base types
  DOSTEP_POBYT_STALY: 10, DOSTEP_REZYDENT_UE: 10, DOSTEP_KARTA_POLAKA: 3,
  DOSTEP_OCHRONA_MIEDZ: 9, DOSTEP_UE: 9, DOSTEP_DYPLOM_PL: 2, DOSTEP_STUDENT: 2,
  BLUE_CARD: 8, KARTA_POBYTU: 7, POBYT_CUKR: 7,
  ZEZWOLENIE: 6, ZGLOSZENIE_UA: 4,
};

export { EMPLOYMENT_HIERARCHY };

/**
 * Pick the single "current" employment basis from a list.
 *
 * Rules:
 * 1. Only AKTYWNE or W_TRAKCIE bases are candidates.
 * 2. Among candidates, pick the one with highest hierarchy score.
 * 3. Tie-break: latest dataDo wins.
 *
 * Returns null if no active basis exists.
 */
export function getCurrentEmploymentBasis<
  T extends { typ: string; status: string; dataDo: Date | null }
>(bases: T[]): T | null {
  const active = bases.filter(
    (b) => b.status === "AKTYWNE" || b.status === "W_TRAKCIE"
  );
  if (active.length === 0) return null;

  return active.reduce((best, b) => {
    const hb = EMPLOYMENT_HIERARCHY[b.typ] ?? 0;
    const ha = EMPLOYMENT_HIERARCHY[best.typ] ?? 0;
    if (hb !== ha) return hb > ha ? b : best;
    // Tie-break: latest dataDo
    return (b.dataDo?.getTime() ?? 0) > (best.dataDo?.getTime() ?? 0) ? b : best;
  });
}

/**
 * Residence basis status for a foreigner.
 * Used by the list page filter and profile overview.
 */
export type ResidenceStatus = "aktualna" | "aktualna_z_procedura" | "wygasla" | "w_procedurze" | "brak";

/**
 * Compute residence basis status for a foreigner.
 * Logic mirrors the profile "Podstawy pobytowe" section.
 *
 * Priority: active residence document > "w procedurze" (UPO).
 * When foreigner has BOTH a valid karta/wiza AND a pending UPO,
 * return "aktualna_z_procedura" — valid doc is primary, procedure is secondary info.
 * "w_procedurze" only when the existing document has expired.
 */
export function computeResidenceStatus(foreigner: {
  decyzjaPobytowaDo: Date | null;
  wizaDo: Date | null;
  upoDoreczone: Date | null;
  ochronaCzasowaUkr: boolean | null;
  employmentBases: { typ: string; status: string }[];
}): ResidenceStatus {
  const now = new Date();

  const kpActive = foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo >= now;
  const wizaActive = foreigner.wizaDo && foreigner.wizaDo >= now;
  const hasUpo = !!foreigner.upoDoreczone;
  const hasOchronaUkr = !!foreigner.ochronaCzasowaUkr;
  const isEuCitizen = foreigner.employmentBases.some(
    (b) => b.typ === "DOSTEP_UE" && b.status === "AKTYWNE"
  );

  const hasActiveDoc = kpActive || wizaActive || hasOchronaUkr || isEuCitizen;

  // Active document + pending procedure → active is primary
  if (hasActiveDoc && hasUpo) return "aktualna_z_procedura";

  // Active document, no procedure
  if (hasActiveDoc) return "aktualna";

  // No active document but procedure pending → procedure is primary
  if (hasUpo) return "w_procedurze";

  // Expired — had something but it's past
  const kpExpired = foreigner.decyzjaPobytowaDo && foreigner.decyzjaPobytowaDo < now;
  const wizaExpired = foreigner.wizaDo && foreigner.wizaDo < now;
  if (kpExpired || wizaExpired) return "wygasla";

  return "brak";
}

/**
 * Check if a given citizenship (obywatelstwo) is allowed for oświadczenie o powierzeniu pracy.
 * Uses the `oswiadczenie_countries` table.
 *
 * @param citizenship - obywatelstwo string (e.g. "Ukraina", "UA", "Kanada")
 * @param documentDate - data wpisu/wydania oświadczenia (for historical eligibility check)
 * @returns true if citizenship qualifies for oświadczenie
 */
export async function isOswiadczenieAllowedForCitizenship(
  citizenship: string,
  documentDate: Date | null
): Promise<boolean> {
  const countries = await db.oswiadczenieCountry.findMany();

  // Normalize: lowercase, trim, strip diacritics
  const stripDiacritics = (s: string) =>
    s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const norm = stripDiacritics(citizenship);

  // Known aliases (obywatelstwo w bazie może być po angielsku, polsku lub w transliteracji)
  const ALIASES: Record<string, string> = {
    "georgia": "GE", "gruzja": "GE",
    "belarus": "BY", "bialorus": "BY", "białoruś": "BY",
    "moldova": "MD", "moldawia": "MD", "mołdawia": "MD",
    "ukraine": "UA", "ukraina": "UA",
    "russia": "RU", "rosja": "RU",
    "armenia": "AM",
  };

  // Try alias first
  const aliasCode = ALIASES[norm];

  const match = countries.find((c) => {
    const code = c.countryCode.toLowerCase();
    const name = stripDiacritics(c.countryName);
    if (aliasCode && code === aliasCode.toLowerCase()) return true;
    return norm === code || norm === name || name.includes(norm) || norm.includes(name);
  });

  if (!match) return false;

  // Check date window
  const checkDate = documentDate ?? new Date();
  if (match.validFrom && checkDate < match.validFrom) return false;
  if (match.validTo && checkDate > match.validTo) return false;

  return true;
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
