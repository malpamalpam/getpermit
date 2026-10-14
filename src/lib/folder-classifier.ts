/**
 * Folder classifier for FDK attachments.
 *
 * Assigns each attachment to one of six folders (section 1 of legalization rules):
 * - "wazne"             — own identity & final documents (passport, card, visa, decisions, permits)
 * - "trc"               — entire TRC procedure (application, attachments, fees, correspondence)
 * - "oswiadczenie"      — entire declaration procedure (application, fees, notifications)
 * - "zezwolenie"        — entire work permit procedure
 * - "dokumenty_rodziny" — documents belonging to family members
 * - "inne_dokumenty"    — everything that doesn't fit above
 *
 * Rules:
 * - "wazne" = ONLY own identity docs and final documents (decisions, permits, cards, visa)
 * - Procedural docs (fees, applications, correspondence) go to the procedure folder
 * - Folders created on-demand (except "wazne" which always exists)
 * - Empty folders should be removed
 * - Manual assignments (folderManual=true) are never overridden
 */

// ============================================================================
// Folder types
// ============================================================================

export type FolderType =
  | "wazne"
  | "trc"
  | "oswiadczenie"
  | "zezwolenie"
  | "dokumenty_rodziny"
  | "inne_dokumenty";

export const FOLDER_LABELS: Record<FolderType, string> = {
  wazne: "Ważne",
  trc: "TRC",
  oswiadczenie: "Oświadczenie",
  zezwolenie: "Zezwolenie",
  dokumenty_rodziny: "Dokumenty członków rodziny",
  inne_dokumenty: "Inne dokumenty",
};

// ============================================================================
// "Ważne" — only own identity docs and FINAL documents (decisions, permits)
// NOT procedural attachments (fees, applications, correspondence)
// ============================================================================

/** Document types that are FINAL documents → "Ważne" */
const WAZNE_TYPES = new Set([
  // Passport, visa, residence card (identity docs)
  "KARTA_POBYTU", "POBYT_CUKR", "WIZA", "WIZA_HUMANITARNA",
  // Final decisions — these are the result of a procedure
  "TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_STUDIA", "TRC_POBYT_Z_CUDZ",
  "TRC_MALZONEK_PL", "TRC_HUMANITARNE", "TRC_ABSOLWENT", "TRC_BLUE_CARD",
  "TRC_DZIALALNOSC", "TRC_INNE_OKOLICZNOSCI",
  "POBYT_STALY", "REZYDENT_UE", "STATUS_UCHODZCY", "OCHRONA_UZUPELNIAJACA",
  "ZGODA_HUMANITARNA", "OBYWATEL_UE", "UMOWA_WYSTAPIENIA",
  "RUCH_BEZWIZOWY", "POBYT_NA_PRZEDLUZENIU", "PESEL_UKR",
  // Work permit decision
  "ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT",
  // Registered declaration (the registered document itself, not the application)
  "OSWIADCZENIE",
  // UA notification
  "POWIADOMIENIE_UA", "ZGLOSZENIE_UA",
  // Other employment-only
  "KARTA_POLAKA", "STATUS_STUDENTA", "STATUS_ABSOLWENTA",
  // Appeals
  "ODWOLANIE",
  // Legacy types
  "OD_POBYT_STALY", "OD_REZYDENT_UE", "OD_MALZONEK_PL", "OD_CZLONEK_RODZINY",
  "OD_BLUE_CARD", "OD_HUMANITARNE", "OD_OCHRONA_UZUP", "OD_STUDENT",
  "OD_UE", "OD_UK_WYSTAPIENIE", "OD_UCHODZCA", "OD_WIZA_HUMAN",
  "OD_ABSOLWENT", "OD_KARTA_POLAKA",
]);

/** Filename patterns → "Ważne" (own identity docs and final documents ONLY) */
const WAZNE_FILENAME_PATTERNS = [
  // Passport
  /paszport/i, /passport/i, /паспорт/i,
  // Diploma (Polish)
  /dyplom/i, /diploma/i, /диплом/i,
  // Decision (final document)
  /decyzj[aiy]/i, /decision/i, /решение/i,
  // Residence card
  /karta[\s_-]*pobytu/i, /residence[\s_-]*card/i,
  // Work permit (final)
  /zezwoleni[ea][\s_-]*na[\s_-]*prac/i, /work[\s_-]*permit/i,
  // Visa
  /wiza/i, /visa/i, /виза/i,
  // Long-term EU resident
  /rezydent/i,
  // Appeal
  /odwo[łl]anie/i, /za[żz]alenie/i,
  // Abbreviations for FINAL documents only
  /\bWP[\s_-]?\d{4}/i,    // WP_2024, WP 2025
  /\bKP[\s_-]?skan/i,     // KP_skan, KP skan
];

// ============================================================================
// Procedural folder patterns (TRC / Oświadczenie / Zezwolenie)
// ============================================================================

/** Filename patterns → "TRC" procedure folder */
const TRC_FILENAME_PATTERNS = [
  /wniosek.*(?:pobyt|TRC|MOS|INPOL)/i,
  /za[łl][aą]cznik[\s_]*nr[\s_]*[12]/i,
  /stempel/i,
  /\bupo\b/i,
  /wezwani[ea].*(?:TRC|pobyt|MUW)/i,
  /zawiadomieni[ea]/i,
  /ponagleni[ea]/i,
  /przyspieszeni[ea].*TRC/i,
  /uzupe[łl]nieni[ea].*(?:TRC|MUW|dokumentacj)/i,
  /op[łl]ata.*(?:skarbow|440|100\s*PLN|pobyt|kart)/i,
  /pe[łl]nomocnictw[ao]|PoA[_\s]/i,
  /pismo.*przewodni/i,
  /OSW-UTRZYMANIE/i,
  /OSW-NIEKARALNOSC/i,
  /OSW-POBYT-3-LATA/i,
  /o[śs]wiadczeni[ea].*(?:utrzymani|niekaraln|pobyt.*3.*lat|liczb.*os[oó]b)/i,
  /umowa.*najm/i,
  /polisa|ubezpieczeni/i,
  /PIT[-_\s]?\d|ZUS(?:[\s_]|$)/i,
  /rachunek|rachunki/i,
  /umowa.*(?:dzieł|zleceni|prac|współprac)/i,
  /anex|aneks/i,
  /informacja.*starost/i,
  /odpowied[źz].*wezwani/i,
  /t[łl]umaczeni[ea]/i,
  /do[śs]wiadczeni[ea]/i,
  /potwierdzen.*(?:wys[łl]an|z[łl]o[żz]en|epuap|poczta|CEN\d)/i,
  /osobiste.*stawiennictwo/i,
  /niezalegani[ea]/i,
];

/** Filename patterns → "Oświadczenie" procedure folder */
const OSW_FILENAME_PATTERNS = [
  /WNIOSEK-OSW/i,
  /PSZ-OPPC|PSZ-OPWP|PSZ-ZOPP/i,
  /PSZ-PPPO|PSZ-PZPO|PGP-UZC/i,
  /podj[ęe]ci[ea].*(?:pracy|zatrudnieni)/i,
  /niepodj[ęe]ci[ea].*pracy/i,
  /zako[ńn]czeni[ea].*pracy/i,
  /zg[łl]oszeni[ea].*umowy/i,
  /op[łl]ata.*(?:o[śs]wiadczen|400\s*PLN|PUP)/i,
  /kopia.*umowy.*o[śs]w/i,
  /o[śs]w.*draft/i,
];

/** Filename patterns → "Zezwolenie" procedure folder */
const ZEZW_FILENAME_PATTERNS = [
  /wniosek.*zezwoleni.*prac/i,
  /informacja.*starost/i,
  /WRP[-.\s]/i,
  /op[łl]ata.*(?:zezwoleni|WP)/i,
  /zawiadomieni[ea].*podj[ęe]ci/i,
];

// ============================================================================
// Main classifier
// ============================================================================

/**
 * Classify an attachment into a folder.
 *
 * Priority order:
 * 1. Family member documents → dokumenty_rodziny
 * 2. Detected type (final document) → wazne
 * 3. Procedure detection by filename → trc / oswiadczenie / zezwolenie
 * 4. Identity doc by filename → wazne
 * 5. Fallback → inne_dokumenty
 *
 * @param detectedType - Document type from detectDocumentType() / OCR
 * @param isDifferentPerson - true if the document name doesn't match the foreigner
 * @param filename - Original filename for pattern matching
 * @param kategoria - Legacy CRM category (e.g. "trc_2024", "glowne")
 * @returns folder assignment
 */
export function classifyToFolder(
  detectedType: string | null | undefined,
  isDifferentPerson: boolean,
  filename: string,
  kategoria?: string | null,
): FolderType {
  // 1. Family member documents — highest priority
  if (isDifferentPerson) {
    return "dokumenty_rodziny";
  }

  // 2. Check by detected document type — FINAL documents go to "Ważne"
  if (detectedType && WAZNE_TYPES.has(detectedType)) {
    return "wazne";
  }

  const fnLower = filename.toLowerCase();

  // 2b. ZASWIADCZENIE_POSTEPOWANIE → trc (not wazne — it's informational, not a final decision)
  if (detectedType === "ZASWIADCZENIE_POSTEPOWANIE") {
    return "trc";
  }

  // 3. Procedure detection by filename
  // Check oświadczenie BEFORE TRC (OSW patterns are more specific)
  if (OSW_FILENAME_PATTERNS.some((p) => p.test(fnLower))) {
    return "oswiadczenie";
  }
  if (ZEZW_FILENAME_PATTERNS.some((p) => p.test(fnLower))) {
    return "zezwolenie";
  }
  // TRC patterns — also use legacy kategoria as hint
  if (TRC_FILENAME_PATTERNS.some((p) => p.test(fnLower))) {
    return "trc";
  }
  // Legacy kategoria hint: "trc_2024", "trc_2025" etc.
  if (kategoria && /^trc/i.test(kategoria)) {
    return "trc";
  }

  // 4. Identity documents by filename → "Ważne"
  if (WAZNE_FILENAME_PATTERNS.some((p) => p.test(fnLower))) {
    return "wazne";
  }

  // 5. Fallback
  return "inne_dokumenty";
}

/**
 * Check if a document's description (opis) indicates it belongs to a different person.
 * Uses the existing ⚠ flag set during upload/scrape.
 */
export function isDifferentPersonFromOpis(opis: string | null | undefined): boolean {
  if (!opis) return false;
  return opis.startsWith("\u26a0") && /inn(?:ej|a)\s+osob/i.test(opis);
}
