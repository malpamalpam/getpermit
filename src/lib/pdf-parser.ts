/**
 * Parse Polish immigration documents from PDF text content.
 * Supports:
 * - Oświadczenie o powierzeniu wykonywania pracy cudzoziemcowi
 * - Zezwolenie na pracę
 * - Decyzja pobytowa (karta pobytu)
 */

export interface ParsedDocumentData {
  // Detected document type
  detectedType?: "OSWIADCZENIE" | "ZEZWOLENIE" | "KARTA_POBYTU";
  // Foreigner data
  imie?: string;
  nazwisko?: string;
  dataUrodzenia?: string; // YYYY-MM-DD
  obywatelstwo?: string;
  nrPaszportu?: string;
  // Dates
  dataOd?: string; // YYYY-MM-DD
  dataDo?: string; // YYYY-MM-DD
  // Work details
  rodzajPracy?: string;
  rodzajUmowy?: string;
  stanowisko?: string;
  firma?: string;
  // Document identifiers
  nrOswiadczenia?: string;
  nrDecyzji?: string;
}

// Keep backward compatibility
export type OswiadczenieData = ParsedDocumentData;

/**
 * Parse date in various Polish formats to YYYY-MM-DD
 */
function parseDatePL(raw: string): string | undefined {
  const match = raw.match(/(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // Try yyyy-mm-dd format
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  return undefined;
}

function titleCase(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Detect document type from text content.
 */
function detectDocumentType(text: string): "OSWIADCZENIE" | "ZEZWOLENIE" | "KARTA_POBYTU" | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("oświadczenie") && lower.includes("powierzeniu")) return "OSWIADCZENIE";
  if (lower.includes("oswiadczenie") && lower.includes("powierzeniu")) return "OSWIADCZENIE";
  if (lower.includes("zezwolenie na pracę") || lower.includes("zezwolenia na pracę")) return "ZEZWOLENIE";
  if (lower.includes("zezwolenie na prace")) return "ZEZWOLENIE";
  if (lower.includes("karta pobytu") || lower.includes("pobyt czasowy") || lower.includes("decyzja") && lower.includes("pobyt")) return "KARTA_POBYTU";
  if (lower.includes("zezwolenie na pobyt")) return "KARTA_POBYTU";
  return undefined;
}

/**
 * Extract personal data common to all document types.
 */
function extractPersonalData(normalized: string, result: ParsedDocumentData): void {
  // Imię
  const imieMatch = normalized.match(/[Ii]mi[ęe]\s*(?:\/\s*imiona|\(imiona\))?[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:[\s-][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)?)/);
  if (imieMatch) result.imie = titleCase(imieMatch[1].trim());

  // Nazwisko (try section 2.2 first, then generic)
  const nazwiskoMatch = normalized.match(/2\.2[.\s]*[Nn]azwisko[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:[-\s][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)*)/);
  if (nazwiskoMatch) {
    result.nazwisko = titleCase(nazwiskoMatch[1].trim());
  } else {
    const fallback = normalized.match(/[Nn]azwisko[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:[-\s][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)?)/);
    if (fallback) result.nazwisko = titleCase(fallback[1].trim());
  }

  // Data urodzenia
  const dobMatch = normalized.match(/[Dd]ata\s+urodzenia\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/);
  if (dobMatch) result.dataUrodzenia = parseDatePL(dobMatch[1]);

  // Obywatelstwo
  const obywMatch = normalized.match(/[Oo]bywatelstwo[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:[\s][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)*)/);
  if (obywMatch) result.obywatelstwo = obywMatch[1].trim();

  // Paszport
  const paszportMatch = normalized.match(/(?:[Ss]eria\s+i\s+numer|[Nn]umer\s+dokumentu\s+podr[óo][żz]y|paszport(?:u)?)[:\s]+([A-Z0-9]+)/);
  if (paszportMatch) result.nrPaszportu = paszportMatch[1].trim();
}

/**
 * Extract date range (Od...Do) common to all document types.
 */
function extractDateRange(normalized: string, result: ParsedDocumentData): void {
  // Standard format: "Od ... Do ..."
  const dateRangeMatch = normalized.match(
    /[Oo]d\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})\s+[Dd]o\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/
  );
  if (dateRangeMatch) {
    result.dataOd = parseDatePL(dateRangeMatch[1]);
    result.dataDo = parseDatePL(dateRangeMatch[2]);
  }

  // Ewidencja dates take priority for oświadczenia
  const ewidencjaMatch = normalized.match(
    /ewidencji\s+o[śs]wiadcze[ńn].*?[Oo]d\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})\s+[Dd]o\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/i
  );
  if (ewidencjaMatch) {
    result.dataOd = parseDatePL(ewidencjaMatch[1]);
    result.dataDo = parseDatePL(ewidencjaMatch[2]);
  }

  // Try "ważne od ... do ..." or "okres ważności od ... do ..."
  if (!result.dataOd) {
    const waznoscMatch = normalized.match(
      /(?:wa[żz]n[eao]|okres\s+wa[żz]no[śs]ci|obowi[aą]zuje)\s+(?:od\s+)?(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})(?:\s*(?:r\.?|roku))?\s+(?:do\s+)?(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/i
    );
    if (waznoscMatch) {
      result.dataOd = parseDatePL(waznoscMatch[1]);
      result.dataDo = parseDatePL(waznoscMatch[2]);
    }
  }

  // Try "data wydania" + "data ważności" as separate fields
  if (!result.dataOd) {
    const wydaniaMatch = normalized.match(/[Dd]ata\s+wydania\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/);
    if (wydaniaMatch) result.dataOd = parseDatePL(wydaniaMatch[1]);
  }
  if (!result.dataDo) {
    const waznosciMatch = normalized.match(/[Dd]ata\s+wa[żz]no[śs]ci\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/);
    if (waznosciMatch) result.dataDo = parseDatePL(waznosciMatch[1]);
  }

  // Try "na okres od ... do ..."
  if (!result.dataOd) {
    const naOkresMatch = normalized.match(
      /na\s+okres\s+od\s+(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})(?:\s*r\.?)?\s+do\s+(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/i
    );
    if (naOkresMatch) {
      result.dataOd = parseDatePL(naOkresMatch[1]);
      result.dataDo = parseDatePL(naOkresMatch[2]);
    }
  }
}

export function parseOswiadczenieText(text: string): ParsedDocumentData {
  const result: ParsedDocumentData = {};
  const normalized = text.replace(/\s+/g, " ").trim();

  // Detect document type
  result.detectedType = detectDocumentType(normalized);

  // Extract common data
  extractPersonalData(normalized, result);
  extractDateRange(normalized, result);

  // --- Nr oświadczenia ---
  const nrWpisuMatch = normalized.match(/(?:Numer wpisu|nr dok)[.:\s]+([A-Z0-9.]+)/i);
  if (nrWpisuMatch) result.nrOswiadczenia = nrWpisuMatch[1].trim();

  // --- Nr decyzji ---
  const nrDecyzjiMatch = normalized.match(/(?:nr\s+decyzji|numer\s+decyzji|sygnatura)[.:\s]+([A-Z0-9/.\-]+)/i);
  if (nrDecyzjiMatch) result.nrDecyzji = nrDecyzjiMatch[1].trim();

  // --- Stanowisko / rodzaj pracy (pkt 3.1) ---
  const rodzajPracyMatch = normalized.match(/3\.1[.\s]*(?:Stanowisko\s*\/?\s*)?(?:[Rr]odzaj\s+pracy[^:]*)?[:\s]+(.+?)(?=\s*3\.2\b)/);
  if (rodzajPracyMatch) {
    const cleaned = rodzajPracyMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 2 && cleaned.length < 300) {
      result.rodzajPracy = cleaned;
      result.stanowisko = cleaned;
    }
  }

  // Stanowisko from "stanowisko:" field (WP / decyzja)
  if (!result.stanowisko) {
    const stanowiskoMatch = normalized.match(/[Ss]tanowisko[:\s]+([^,.\n]+)/);
    if (stanowiskoMatch && stanowiskoMatch[1].trim().length > 2) {
      result.stanowisko = stanowiskoMatch[1].trim();
    }
  }

  // --- Rodzaj umowy (pkt 3.6) ---
  const rodzajUmowyMatch = normalized.match(/3\.6[.\s]*(?:[Rr]odzaj\s+umowy[^:]*)?[:\s]+(.+?)(?=\s*3\.7\b)/);
  if (rodzajUmowyMatch) {
    const cleaned = rodzajUmowyMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 2 && cleaned.length < 300) result.rodzajUmowy = cleaned;
  }

  // --- Firma / pracodawca ---
  const firmaMatch = normalized.match(/(?:1\.1[.\s]*)?[Nn]azwa[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][^\n,]{3,100}?)(?=\s*1\.2|\s*[Aa]dres)/);
  if (firmaMatch) result.firma = firmaMatch[1].trim();

  return result;
}

/**
 * Parse PDF buffer and extract document data.
 * Supports oświadczenia, zezwolenia na pracę, and decyzje pobytowe.
 */
export async function parseOswiadczeniePdf(buffer: ArrayBuffer): Promise<ParsedDocumentData | null> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const pdfData = await pdfParse(Buffer.from(buffer));
    const text = pdfData.text;

    if (!text || text.length < 20) return null;

    const result = parseOswiadczenieText(text);

    const hasAnyData = result.dataOd || result.dataDo || result.nazwisko || result.imie
      || result.rodzajPracy || result.rodzajUmowy || result.nrPaszportu
      || result.nrDecyzji || result.stanowisko;

    return hasAnyData ? result : null;
  } catch (err) {
    console.error("[pdf-parser] Failed to parse PDF:", err);
    return null;
  }
}
