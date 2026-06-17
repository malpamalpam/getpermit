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
  // Nr oświadczenia
  nrOswiadczenia?: string;
}

/**
 * Parse date in various Polish formats to YYYY-MM-DD:
 * - dd/mm/yyyy, dd.mm.yyyy (no spaces)
 * - dd / mm / yyyy (with spaces around separators)
 * - dd / mm / rrrr (literal "rrrr" is skipped — it's the format label)
 */
function parseDatePL(raw: string): string | undefined {
  // Match: dd [sep] mm [sep] yyyy where sep can have spaces
  const match = raw.match(/(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return undefined;
}

/**
 * Capitalize first letter, lowercase rest (for names in ALL CAPS)
 */
function titleCase(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function parseOswiadczenieText(text: string): OswiadczenieData {
  const result: OswiadczenieData = {};

  // Normalize whitespace (but keep single spaces)
  const normalized = text.replace(/\s+/g, " ").trim();

  // --- Nr oświadczenia ---
  const nrMatch = normalized.match(/(?:Numer wpisu|nr dok)[.:\s]+([A-Z0-9.]+)/i);
  if (nrMatch) result.nrOswiadczenia = nrMatch[1].trim();

  // --- Dates Od/Do (sekcja 4 or ewidencja) ---
  // Format: "Od (dd / mm / rrrr): 11 / 06 / 2026      Do (dd / mm / rrrr): 10 / 06 / 2028"
  // or:     "Od 11/06/2026 Do 10/06/2028"
  const dateRangeMatch = normalized.match(
    /[Oo]d\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})\s+[Dd]o\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/
  );
  if (dateRangeMatch) {
    result.dataOd = parseDatePL(dateRangeMatch[1]);
    result.dataDo = parseDatePL(dateRangeMatch[2]);
  }

  // If we found dates from section 4, check if ewidencja has different dates (ewidencja takes priority)
  const ewidencjaMatch = normalized.match(
    /ewidencji\s+oświadczeń.*?[Oo]d\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})\s+[Dd]o\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/i
  );
  if (ewidencjaMatch) {
    result.dataOd = parseDatePL(ewidencjaMatch[1]);
    result.dataDo = parseDatePL(ewidencjaMatch[2]);
  }

  // --- Foreigner name ---
  // Format: "2.1. Imię / imiona: MAKSIM" or "Imię (imiona): Jan"
  const imieMatch = normalized.match(/[Ii]mi[ęe]\s*(?:\/\s*imiona|\(imiona\))?[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:[\s-][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)?)/);
  if (imieMatch) result.imie = titleCase(imieMatch[1].trim());

  // Format: "2.2. Nazwisko: BORZDOV" or "Nazwisko: Kowalski"
  const nazwiskoMatch = normalized.match(/2\.2[.\s]*[Nn]azwisko[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:[-\s][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)*)/);
  if (nazwiskoMatch) {
    result.nazwisko = titleCase(nazwiskoMatch[1].trim());
  } else {
    // Fallback: any "Nazwisko:" not preceded by section number
    const fallback = normalized.match(/[Nn]azwisko[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:[-\s][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)?)/);
    if (fallback) result.nazwisko = titleCase(fallback[1].trim());
  }

  // --- Date of birth ---
  // Format: "2.4. Data urodzenia (dd / mm / rrrr): 28 / 08 / 1979"
  const dobMatch = normalized.match(/[Dd]ata\s+urodzenia\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/);
  if (dobMatch) result.dataUrodzenia = parseDatePL(dobMatch[1]);

  // --- Citizenship ---
  // Format: "2.5. Obywatelstwo: Białoruś"
  const obywMatch = normalized.match(/[Oo]bywatelstwo[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:[\s][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]+)*)/);
  if (obywMatch) result.obywatelstwo = obywMatch[1].trim();

  // --- Passport ---
  // Format: "2.7. Seria i numer: PD0347939" or "Numer dokumentu podróży: AB1234567"
  const paszportMatch = normalized.match(/(?:[Ss]eria\s+i\s+numer|[Nn]umer\s+dokumentu\s+podr[óo][żz]y|paszport(?:u)?)[:\s]+([A-Z0-9]+)/);
  if (paszportMatch) result.nrPaszportu = paszportMatch[1].trim();

  // --- Rodzaj pracy (pkt 3.1) ---
  // Format: "3.1. Stanowisko / rodzaj pracy wykonywanej przez cudzoziemca: Stworzenie materiałów..."
  const rodzajPracyMatch = normalized.match(/3\.1[.\s]*(?:Stanowisko\s*\/?\s*)?(?:[Rr]odzaj\s+pracy[^:]*)?[:\s]+(.+?)(?=\s*3\.2\b)/);
  if (rodzajPracyMatch) {
    const cleaned = rodzajPracyMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 2 && cleaned.length < 300) result.rodzajPracy = cleaned;
  }

  // --- Rodzaj umowy (pkt 3.6) ---
  // Format: "3.6. Rodzaj umowy stanowiącej podstawę ... : Umowa o dzieło"
  const rodzajUmowyMatch = normalized.match(/3\.6[.\s]*(?:[Rr]odzaj\s+umowy[^:]*)?[:\s]+(.+?)(?=\s*3\.7\b)/);
  if (rodzajUmowyMatch) {
    const cleaned = rodzajUmowyMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 2 && cleaned.length < 300) result.rodzajUmowy = cleaned;
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
