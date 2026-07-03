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
  // Salary
  wynagrodzenie?: string;
}

// Keep backward compatibility
export type OswiadczenieData = ParsedDocumentData;

/**
 * Parse date in various Polish formats to YYYY-MM-DD
 */
function parseDatePL(raw: string): string | undefined {
  // Try dd.mm.yyyy / dd/mm/yyyy / dd-mm-yyyy (with optional spaces)
  const match = raw.match(/(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // Try yyyy-mm-dd format
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  // Try Polish word dates: "1 stycznia 2026"
  const monthNames: Record<string, string> = {
    "stycznia": "01", "lutego": "02", "marca": "03", "kwietnia": "04",
    "maja": "05", "czerwca": "06", "lipca": "07", "sierpnia": "08",
    "wrze[śs]nia": "09", "pa[źz]dziernika": "10", "listopada": "11", "grudnia": "12",
  };
  for (const [pattern, num] of Object.entries(monthNames)) {
    const wordMatch = raw.match(new RegExp(`(\\d{1,2})\\s+${pattern}\\s+(\\d{4})`, "i"));
    if (wordMatch) {
      return `${wordMatch[2]}-${num}-${wordMatch[1].padStart(2, "0")}`;
    }
  }
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
  // Check zezwolenie first — avoid false positive from "oświadczenie" appearing in zezwolenie documents
  if (lower.includes("zezwolenie na pracę") || lower.includes("zezwolenia na pracę")) return "ZEZWOLENIE";
  if (lower.includes("zezwolenie na prace") || lower.includes("zezwolenia na prace")) return "ZEZWOLENIE";
  if (/zezwoleni[ea]\s+na\s+prac[eę]/i.test(text)) return "ZEZWOLENIE";
  if (/typ\s+[a-e]/i.test(text) && lower.includes("zezwoleni")) return "ZEZWOLENIE";
  // Oświadczenie — must have "powierzeniu" to avoid matching other "oświadczenie" mentions
  if ((lower.includes("oświadczenie") || lower.includes("oswiadczenie")) && lower.includes("powierzeniu")) return "OSWIADCZENIE";
  // Karta pobytu / decyzja pobytowa
  if (lower.includes("karta pobytu") || lower.includes("pobyt czasowy")) return "KARTA_POBYTU";
  if (lower.includes("decyzja") && lower.includes("pobyt")) return "KARTA_POBYTU";
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
  // Standard format: "Od ... Do ..." or "od dnia ... do dnia ..."
  const dateRangeMatch = normalized.match(
    /[Oo]d\s*(?:dnia\s+)?(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{4})\s*(?:r\.?\s+)?[Dd]o\s*(?:dnia\s+)?(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{4})/
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

/**
 * Remove inline doubled text from PDF rendering artifacts.
 * E.g. "Umowa o dziełoUmowa o dzieło" → "Umowa o dzieło"
 */
function dedup(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length < 4) return trimmed;
  const half = Math.floor(trimmed.length / 2);
  // Exact halving
  if (trimmed.substring(0, half) === trimmed.substring(half)) {
    return trimmed.substring(0, half);
  }
  // Try with ±1 char tolerance (odd length)
  if (trimmed.length % 2 === 1) {
    if (trimmed.substring(0, half) === trimmed.substring(half + 1)) {
      return trimmed.substring(0, half);
    }
  }
  return trimmed;
}

export function parseOswiadczenieText(text: string): ParsedDocumentData {
  const result: ParsedDocumentData = {};
  const normalized = text.replace(/\s+/g, " ").trim();

  // Detect document type
  result.detectedType = detectDocumentType(normalized);

  // === ZEZWOLENIE-specific extraction (different layout than oświadczenie) ===
  if (result.detectedType === "ZEZWOLENIE") {
    return parseZezwolenie(normalized, result);
  }

  // === OŚWIADCZENIE / KARTA_POBYTU / unknown ===
  extractPersonalData(normalized, result);
  extractDateRange(normalized, result);

  // Nr oświadczenia (ONLY for OSWIADCZENIE)
  if (result.detectedType === "OSWIADCZENIE") {
    const nrWpisuMatch = normalized.match(/(?:Numer wpisu|nr dok)[.:\s]+([A-Z0-9.]+)/i);
    if (nrWpisuMatch) result.nrOswiadczenia = nrWpisuMatch[1].trim();
  }

  // Nr decyzji (for karta pobytu)
  if (result.detectedType === "KARTA_POBYTU") {
    const nrDecyzjiMatch = normalized.match(/(?:nr\s+decyzji|numer\s+decyzji|sygnatura|znak\s+sprawy)[.:\s]+([A-Z0-9/.\-]+)/i);
    if (nrDecyzjiMatch) result.nrDecyzji = nrDecyzjiMatch[1].trim();
  }

  // Stanowisko / rodzaj pracy (oświadczenie pkt 3.1)
  const rodzajPracyMatch = normalized.match(/3\.1[.\s]*(?:Stanowisko\s*\/?\s*)?(?:[Rr]odzaj\s+pracy[^:]*)?[:\s]+(.+?)(?=\s*3\.2\b)/);
  if (rodzajPracyMatch) {
    const cleaned = rodzajPracyMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 2 && cleaned.length < 300) {
      result.rodzajPracy = cleaned;
      result.stanowisko = cleaned;
    }
  }
  if (!result.stanowisko) {
    const stanowiskoMatch = normalized.match(/[Ss]tanowisko[:\s]+([^,.\n]+)/);
    if (stanowiskoMatch && stanowiskoMatch[1].trim().length > 2) {
      result.stanowisko = stanowiskoMatch[1].trim();
    }
  }

  // Rodzaj umowy (oświadczenie pkt 3.6)
  const rodzajUmowyMatch = normalized.match(/3\.6[.\s]*(?:[Rr]odzaj\s+umowy[^:]*)?[:\s]+(.+?)(?=\s*3\.7\b)/);
  if (rodzajUmowyMatch) {
    const cleaned = rodzajUmowyMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 2 && cleaned.length < 300) result.rodzajUmowy = cleaned;
  }

  // Firma (oświadczenie pkt 1.1)
  const firmaMatch = normalized.match(/(?:1\.1[.\s]*)?[Nn]azwa[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][^\n,]{3,100}?)(?=\s*1\.2|\s*[Aa]dres)/);
  if (firmaMatch) result.firma = firmaMatch[1].trim();

  // Wynagrodzenie (oświadczenie pkt 3.8)
  const wynagrodzenieMatch = normalized.match(
    /(?:[Ww]ynagrodzeni[ea]|3\.8[.\s]*(?:[Nn]ajni[żz]sze\s+)?[Ww]ynagrodzeni[ea])[^:]*[:\s]+([0-9][0-9\s,.]*(?:PLN|z[łl]|brutto|netto|miesi[ęe]cznie)?(?:\s*\/?\s*(?:PLN|brutto|netto|miesi[ęe]cznie))*)/i
  );
  if (wynagrodzenieMatch) {
    const cleaned = wynagrodzenieMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 2 && cleaned.length < 200) result.wynagrodzenie = cleaned;
  }

  return result;
}

/**
 * Parse zezwolenie na pracę (typ A/B/C) — different layout from oświadczenie.
 * Field values appear BEFORE the field label in parentheses.
 */
function parseZezwolenie(normalized: string, result: ParsedDocumentData): ParsedDocumentData {
  // --- Nr decyzji: "(typu A) nr 69056/2025" ---
  const typNrMatch = normalized.match(/\(typu\s+[A-E]\)\s+nr\s+(\d+\/\d+)/i);
  if (typNrMatch) result.nrDecyzji = typNrMatch[1].trim();
  if (!result.nrDecyzji) {
    const nrDecMatch = normalized.match(/(?:nr\s+decyzji|numer\s+decyzji|sygnatura|znak\s+sprawy)[.:\s]+([A-Z0-9/.\-]+)/i);
    if (nrDecMatch) result.nrDecyzji = nrDecMatch[1].trim();
  }
  // Fallback: document header sygnatura "WRP-II.8671.42150.2025"
  if (!result.nrDecyzji) {
    const sygMatch = normalized.match(/([A-Z]{2,5}[-.](?:[A-Z]*\.?\d+\.?)+\.\d{4})/);
    if (sygMatch) result.nrDecyzji = sygMatch[1].trim();
  }

  // --- Imię i nazwisko: "Pana/Pani DANIEL DOMINIC ABRAHAM -" or "Pana/Pani IMIE NAZWISKO" ---
  const panMatch = normalized.match(/Pana\/Pani\s+([A-ZĄĆĘŁŃÓŚŹŻ][A-ZĄĆĘŁŃÓŚŹŻ\s-]+?)(?:\s*-\s*|\s*\()/);
  if (panMatch) {
    const fullName = dedup(panMatch[1].trim().replace(/\s*-\s*$/, ""));
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) {
      result.nazwisko = titleCase(parts[parts.length - 1]);
      result.imie = titleCase(parts.slice(0, -1).join(" "));
    } else if (parts.length === 1) {
      result.nazwisko = titleCase(parts[0]);
    }
  }

  // --- Obywatelstwo: "obywatela/obywatelki MalezjaMalezja" ---
  const obywMatch = normalized.match(/obywatela\/obywatelki\s+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)/i);
  if (obywMatch) result.obywatelstwo = dedup(obywMatch[1].trim());

  // --- Data urodzenia: "data urodzenia 25.04.1993 r." ---
  const dobMatch = normalized.match(/data\s+urodzenia\s+(\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{4})/i);
  if (dobMatch) result.dataUrodzenia = parseDatePL(dobMatch[1]);

  // --- Stanowisko: "na stanowisku / w charakterze VALUE (stanowisko...)" ---
  const stanMatch = normalized.match(/na\s+stanowisku\s*\/?\s*w\s+charakterze\s+(.+?)(?=\s*\(stanowisko)/i);
  if (stanMatch) result.stanowisko = dedup(stanMatch[1].trim());
  if (!result.stanowisko) {
    const stanFallback = normalized.match(/na\s+stanowisku\s*\/?\s*w\s+charakterze\s+(.+?)(?=\s*\()/i);
    if (stanFallback) result.stanowisko = dedup(stanFallback[1].trim());
  }

  // --- Rodzaj umowy: "na podstawie Umowa o dzieło[dup] (rodzaj umowy..." ---
  // Search backwards from "(rodzaj umowy" to find "na podstawie VALUE"
  const rodzajUmowyIdx = normalized.indexOf("(rodzaj umowy");
  if (rodzajUmowyIdx > 0) {
    // Take up to 200 chars before "(rodzaj umowy"
    const before = normalized.substring(Math.max(0, rodzajUmowyIdx - 200), rodzajUmowyIdx);
    const umowaMatch = before.match(/na\s+podstawie\s+(.+?)$/i);
    if (umowaMatch) {
      result.rodzajUmowy = dedup(umowaMatch[1].trim());
    }
  }

  // --- Firma: "po rozpatrzeniu wniosku FIRMA, ul. ..." ---
  const firmaMatch = normalized.match(/po\s+rozpatrzeniu\s+wniosku\s+(.+?)(?=\s*,\s*(?:ul|al|pl|os)\.?\s)/i);
  if (firmaMatch) result.firma = dedup(firmaMatch[1].trim());

  // --- Wynagrodzenie: "wynagrodzeniem brutto nie niższym niż: 4 666,00 PLN/miesięcznie" ---
  const wynMatch = normalized.match(/wynagrodzeni\w+[^:]*:\s*([0-9][0-9\s,.]*(?:PLN|z[łl])?(?:\s*\/?\s*(?:miesi[ęe]cznie|brutto|netto|godzin[ęe]))*)/i);
  if (wynMatch) {
    const cleaned = dedup(wynMatch[1].replace(/\s+/g, " ").trim());
    if (cleaned.length > 2) result.wynagrodzenie = cleaned;
  }

  // --- Daty: "ważne od 01.11.2025 r. do 31.10.2026 r." ---
  extractDateRange(normalized, result);

  // --- Paszport ---
  const paszMatch = normalized.match(/(?:[Ss]eria\s+i\s+numer|[Nn]umer\s+dokumentu\s+podr[óo][żz]y|paszport(?:u)?)[:\s]+([A-Z0-9]+)/);
  if (paszMatch) result.nrPaszportu = paszMatch[1].trim();

  // Ensure no oświadczenie fields leak
  result.nrOswiadczenia = undefined;

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
      || result.nrDecyzji || result.stanowisko || result.wynagrodzenie;

    return hasAnyData ? result : null;
  } catch (err) {
    console.error("[pdf-parser] Failed to parse PDF:", err);
    return null;
  }
}
