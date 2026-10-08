/**
 * Folder classifier for FDK attachments.
 *
 * Assigns each attachment to one of three folders:
 * - "wazne" — key immigration/employment documents
 * - "inne_dokumenty" — everything else
 * - "dokumenty_rodziny" — documents belonging to family members
 */

// Document types (from detectDocumentType / FdkBaseType) that belong in "Ważne"
const WAZNE_TYPES = new Set([
  // Work permits
  "ZEZWOLENIE_A",
  // Residence permits (TRC variants)
  "TRC_FDK",
  "TRC_STUDIA",
  "TRC_POBYT_Z_CUDZ",
  "TRC_MALZONEK_PL",
  "TRC_HUMANITARNE",
  "TRC_ABSOLWENT",
  "TRC_BLUE_CARD",
  "TRC_DZIALALNOSC",
  // Residence card (physical card scan)
  "KARTA_POBYTU",
  "POBYT_CUKR",
  // Declarations/statements
  "OSWIADCZENIE",
  // Ukraine notifications
  "POWIADOMIENIE_UA",
  "ZGLOSZENIE_UA",
  // Visa
  "WIZA",
  // Open-access employment types (from decisions)
  "OD_POBYT_STALY",
  "OD_REZYDENT_UE",
  "OD_MALZONEK_PL",
  "OD_CZLONEK_RODZINY",
  "OD_BLUE_CARD",
  "OD_HUMANITARNE",
  "OD_OCHRONA_UZUP",
  "OD_STUDENT",
  "OD_UE",
  "OD_UK_WYSTAPIENIE",
  // Appeals (important to track)
  "ODWOLANIE",
]);

// Filename patterns that indicate "Ważne" documents (case-insensitive)
const WAZNE_FILENAME_PATTERNS = [
  // Passport
  /paszport/i,
  /passport/i,
  /паспорт/i,
  // Diploma
  /dyplom/i,
  /diploma/i,
  /диплом/i,
  // Decision
  /decyzj[aiy]/i,
  /decision/i,
  /решение/i,
  // Residence card
  /karta[\s_-]*pobytu/i,
  /residence[\s_-]*card/i,
  /вид[\s_-]*на[\s_-]*жительство/i,
  // Work permit
  /zezwoleni[ea][\s_-]*na[\s_-]*prac/i,
  /work[\s_-]*permit/i,
  /разрешение[\s_-]*на[\s_-]*работу/i,
  // Declaration
  /o[śs]wiadczeni[ea]/i,
  /declaration/i,
  // Long-term EU resident
  /rezydent/i,
  /long[\s_-]*term/i,
  // Visa
  /wiza/i,
  /visa/i,
  /виза/i,
  // Appeal / complaint
  /odwo[łl]anie/i,
  /za[żz]alenie/i,
  // Abbreviations commonly used in filenames
  /\bTRC\b/i,
  /\bWP[\s_-]?\d{4}/i,    // WP_2024, WP 2025
  /\bKP[\s_-]?skan/i,     // KP_skan, KP skan
  /\bPSZ[\s_-]?OP/i,      // PSZ-OPWP form
  // Notification Ukraine
  /powiadomienie[\s_-]*ua/i,
  /zg[łl]oszenie[\s_-]*ua/i,
];

export type FolderType = "wazne" | "inne_dokumenty" | "dokumenty_rodziny";

export const FOLDER_LABELS: Record<FolderType, string> = {
  wazne: "Ważne",
  inne_dokumenty: "Inne dokumenty",
  dokumenty_rodziny: "Dokumenty członków rodziny",
};

/**
 * Classify an attachment into a folder.
 *
 * @param detectedType - Document type from detectDocumentType() / OCR
 * @param isDifferentPerson - true if the document name doesn't match the foreigner
 * @param filename - Original filename for pattern matching
 * @returns folder assignment
 */
export function classifyToFolder(
  detectedType: string | null | undefined,
  isDifferentPerson: boolean,
  filename: string,
): FolderType {
  // Family member documents
  if (isDifferentPerson) {
    return "dokumenty_rodziny";
  }

  // Check by detected document type
  if (detectedType && WAZNE_TYPES.has(detectedType)) {
    return "wazne";
  }

  // Check by filename patterns
  const filenameLower = filename.toLowerCase();
  for (const pattern of WAZNE_FILENAME_PATTERNS) {
    if (pattern.test(filenameLower)) {
      return "wazne";
    }
  }

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
