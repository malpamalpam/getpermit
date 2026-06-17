/**
 * Parse Polish "Oświadczenie o powierzeniu wykonywania pracy cudzoziemcowi"
 * from PDF text content.
 *
 * Extracts:
 * - Foreigner personal data (name, DOB, citizenship, passport)
 * - Validity dates (Od ... Do ...)
 * - Work type (pkt 3.1)
 * - Contract type (pkt 3.6)
 */

export interface OswiadczenieData {
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
}

/**
 * Parse dd/mm/rrrr or dd.mm.rrrr to YYYY-MM-DD
 */
function parseDatePL(raw: string): string | undefined {
  // Try dd/mm/yyyy or dd.mm.yyyy
  const match = raw.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return undefined;
}

/**
 * Extract text between two markers (case insensitive).
 */
function extractBetween(text: string, startMarker: string, endMarker: string): string | undefined {
  const lower = text.toLowerCase();
  const startIdx = lower.indexOf(startMarker.toLowerCase());
  if (startIdx === -1) return undefined;
  const after = startIdx + startMarker.length;
  const endIdx = endMarker ? lower.indexOf(endMarker.toLowerCase(), after) : text.length;
  if (endIdx === -1) return text.slice(after).trim();
  return text.slice(after, endIdx).trim();
}

export function parseOswiadczenieText(text: string): OswiadczenieData {
  const result: OswiadczenieData = {};

  // Normalize whitespace
  const normalized = text.replace(/\s+/g, " ").trim();

  // --- Dates Od/Do ---
  // Pattern: "Od (dd/mm/rrrr) ... Do (dd/mm/rrrr)"
  // or "Od dd/mm/rrrr Do dd/mm/rrrr"
  // or "w okresie: Od ... Do ..."
  const dateRangeMatch = normalized.match(
    /[Oo]d\s*[:(]?\s*(\d{1,2}[./]\d{1,2}[./]\d{4})\s*[)]?\s*.*?[Dd]o\s*[:(]?\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/
  );
  if (dateRangeMatch) {
    result.dataOd = parseDatePL(dateRangeMatch[1]);
    result.dataDo = parseDatePL(dateRangeMatch[2]);
  }

  // --- Foreigner name ---
  // Common patterns:
  // "Dane cudzoziemca: 2.1 ... Nazwisko ..."
  // "Imię (imiona): ..."
  // "Nazwisko: ..."
  const nazwiskoMatch = normalized.match(/[Nn]azwisko[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:[-\s][A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/);
  if (nazwiskoMatch) result.nazwisko = nazwiskoMatch[1].trim();

  const imieMatch = normalized.match(/[Ii]mi[ęe]\s*(?:\(imiona\))?[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?)/);
  if (imieMatch) result.imie = imieMatch[1].trim();

  // --- Date of birth ---
  const dobMatch = normalized.match(/[Dd]ata\s+urodzenia[:\s]+(\d{1,2}[./]\d{1,2}[./]\d{4})/);
  if (dobMatch) result.dataUrodzenia = parseDatePL(dobMatch[1]);

  // --- Citizenship ---
  const obywMatch = normalized.match(/[Oo]bywatelstwo[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:\s+[a-ząćęłńóśźż]+)?)/);
  if (obywMatch) result.obywatelstwo = obywMatch[1].trim();

  // --- Passport ---
  const paszportMatch = normalized.match(/(?:[Nn]umer\s+)?(?:dokumentu\s+podróży|paszport(?:u)?)[:\s]+([A-Z0-9]+)/);
  if (paszportMatch) result.nrPaszportu = paszportMatch[1].trim();

  // --- Rodzaj pracy (pkt 3.1) ---
  // "3.1" or "3.1." or "3.1 Rodzaj pracy"
  const rodzajPracyMatch = normalized.match(/3\.1[.\s)]*(?:[Rr]odzaj\s+pracy[:\s]*)?([\s\S]{3,200}?)(?=3\.2|$)/);
  if (rodzajPracyMatch) {
    const cleaned = rodzajPracyMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 2 && cleaned.length < 200) result.rodzajPracy = cleaned;
  }

  // --- Rodzaj umowy (pkt 3.6) ---
  const rodzajUmowyMatch = normalized.match(/3\.6[.\s)]*(?:[Rr]odzaj\s+umowy[:\s]*)?([\s\S]{3,200}?)(?=3\.7|4\.|$)/);
  if (rodzajUmowyMatch) {
    const cleaned = rodzajUmowyMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 2 && cleaned.length < 200) result.rodzajUmowy = cleaned;
  }

  return result;
}

/**
 * Parse PDF buffer and extract oświadczenie data.
 * Returns null if pdf-parse is not available or parsing fails.
 */
export async function parseOswiadczeniePdf(buffer: ArrayBuffer): Promise<OswiadczenieData | null> {
  try {
    // Dynamic import to avoid build issues if not installed
    const pdfParse = (await import("pdf-parse")).default;
    const pdfData = await pdfParse(Buffer.from(buffer));
    const text = pdfData.text;

    if (!text || text.length < 20) return null;

    // Try to parse as oświadczenie — even if keyword not found,
    // still attempt extraction (some PDFs have OCR quirks)
    const result = parseOswiadczenieText(text);

    // Return result if anything was extracted
    const hasAnyData = result.dataOd || result.dataDo || result.nazwisko || result.imie
      || result.rodzajPracy || result.rodzajUmowy || result.nrPaszportu;

    return hasAnyData ? result : null;
  } catch (err) {
    console.error("[pdf-parser] Failed to parse PDF:", err);
    return null;
  }
}
