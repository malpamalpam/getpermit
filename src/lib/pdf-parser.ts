/**
 * Parse Polish immigration documents from PDF text content.
 * Supports:
 * - Oświadczenie o powierzeniu wykonywania pracy cudzoziemcowi
 * - Zezwolenie na pracę
 * - Decyzja pobytowa (karta pobytu)
 */

export interface ParsedDocumentData {
  // Detected document type
  // ODWOLANIE = appeal/complaint, no employment base should be created
  detectedType?: "OSWIADCZENIE" | "ZEZWOLENIE" | "KARTA_POBYTU" | "BLUE_CARD" | "ODWOLANIE";
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
  // Confidence flag — if true, dates may be unreliable and need manual verification
  lowConfidence?: boolean;
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
 * Order matters: odwołanie/zażalenie must be checked FIRST because appeal documents
 * often contain phrases like "zezwolenie na pracę" or "zezwolenie na pobyt" in context.
 */
function detectDocumentType(text: string, filenameHint?: string): "OSWIADCZENIE" | "ZEZWOLENIE" | "KARTA_POBYTU" | "BLUE_CARD" | "ODWOLANIE" | undefined {
  const lower = text.toLowerCase();
  const filenameLower = (filenameHint ?? "").toLowerCase();

  // === ODWOŁANIE / ZAŻALENIE — check first! ===
  // Filename hint — strongest signal (user named the file with "odwolanie")
  if (filenameLower.includes("odwolanie") || filenameLower.includes("odwo\u0142anie")) return "ODWOLANIE";

  // === POSITIVE DECISION markers — check BEFORE odwołanie text checks! ===
  // Every positive decision contains a standard Pouczenie mentioning "odwołanie"
  // (right to appeal), which must NOT trigger ODWOLANIE classification.
  const isPositiveDecision = /u\s*d\s*z\s*i\s*e\s*l\s*a\s*m/i.test(text)
    || lower.includes("udziela się")
    || lower.includes("zezwalam")
    || lower.includes("udzielam zezwolenia")
    || lower.includes("orzekam o udzieleniu")
    || (lower.includes("decyzja") && /udziel[ae]/i.test(text));

  if (!isPositiveDecision) {
    // Text content patterns
    if (lower.includes("odwo\u0142anie od decyzji") || lower.includes("odwolanie od decyzji")) return "ODWOLANIE";
    if (lower.includes("za\u017Calenie na decyzj\u0119") || lower.includes("zazalenie na decyzje")) return "ODWOLANIE";
    if (lower.includes("procedura odwo\u0142awcza") || lower.includes("procedura odwolawcza")) return "ODWOLANIE";
    // "wnoszę odwołanie" / "składam odwołanie" / "odwołuję się"
    if (/wnosz[ęe]\s+odwo[łl]anie/i.test(text)) return "ODWOLANIE";
    if (/sk[łl]adam\s+odwo[łl]anie/i.test(text)) return "ODWOLANIE";
    if (/odwo[łl]uj[ęe]\s+si[ęe]/i.test(text)) return "ODWOLANIE";
    // "organ odwoławczy"
    if (lower.includes("organ odwo\u0142awczy") || lower.includes("organ odwolawczy")) return "ODWOLANIE";
    // Standalone "odwołanie" near the start of the document (first 500 chars)
    if (/^.{0,500}odwo[łl]anie/si.test(text)) return "ODWOLANIE";
  }

  // === OŚWIADCZENIE PSZ-OPWP — form header is strongest signal, check EARLY ===
  // PSZ-OPWP is the electronic form code from praca.gov.pl for oświadczenia.
  // Must be checked before KARTA_POBYTU because these documents often mention "pobyt".
  if (lower.includes("psz-opwp") || lower.includes("psz opwp")) return "OSWIADCZENIE";
  // "OŚWIADCZENIE PODMIOTU ... O POWIERZENIU" — form header
  if (/o[śs]wiadczenie\s+podmiotu.*?(?:o\s+)?powierzeniu/i.test(text)) return "OSWIADCZENIE";

  // === EU BLUE CARD — check before generic karta pobytu ===
  if (lower.includes("niebieska karta") || lower.includes("blue card")) return "BLUE_CARD";
  if (lower.includes("eu blue card") || lower.includes("karta ue")) return "BLUE_CARD";
  // Blue Card decree often says "zezwolenie na pobyt czasowy i pracę" for highly skilled
  if (lower.includes("pobyt czasowy i prac") && (lower.includes("niebiesk") || lower.includes("blue"))) return "BLUE_CARD";
  // "wysokie kwalifikacje" / art. 127 — Blue Card regime
  if (lower.includes("wysokich kwalifikacji") || lower.includes("wysokie kwalifikacje")) return "BLUE_CARD";

  // === KARTA POBYTU / DECYZJA POBYTOWA — check BEFORE zezwolenie na pracę ===
  // "zezwolenie na pobyt czasowy i pracę" is a RESIDENCE PERMIT, not a work permit
  if (lower.includes("karta pobytu")) return "KARTA_POBYTU";
  if (lower.includes("zezwolenie na pobyt") || lower.includes("zezwolenia na pobyt")) return "KARTA_POBYTU";
  if (lower.includes("pobyt czasowy") && !lower.includes("niebiesk") && !lower.includes("blue")) return "KARTA_POBYTU";
  if (lower.includes("decyzja") && lower.includes("pobyt")) return "KARTA_POBYTU";

  // === ZEZWOLENIE NA PRACĘ ===
  // Must NOT match "zezwolenie na pobyt czasowy i pracę" (already caught above)
  if (lower.includes("zezwolenie na pracę") || lower.includes("zezwolenia na pracę")) return "ZEZWOLENIE";
  if (lower.includes("zezwolenie na prace") || lower.includes("zezwolenia na prace")) return "ZEZWOLENIE";
  if (/zezwoleni[ea]\s+na\s+prac[eę]/i.test(text) && !lower.includes("na pobyt")) return "ZEZWOLENIE";
  if (/typ\s+[a-e]/i.test(text) && lower.includes("zezwoleni") && !lower.includes("na pobyt")) return "ZEZWOLENIE";

  // === OŚWIADCZENIE — must have "powierzeniu" to avoid matching other mentions ===
  if ((lower.includes("oświadczenie") || lower.includes("oswiadczenie")) && lower.includes("powierzeniu")) return "OSWIADCZENIE";

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

  // Fallback: ALL CAPS words after "Imię" or "Nazwisko" label (any format)
  if (!result.imie) {
    const imieAllCaps = normalized.match(/[Ii]mi[ęe][^:]*[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ]{2,})/);
    if (imieAllCaps) result.imie = titleCase(imieAllCaps[1].trim());
  }
  if (!result.nazwisko) {
    const nazwiskoAllCaps = normalized.match(/[Nn]azwisko[^:]*[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ]{2,})/);
    if (nazwiskoAllCaps) result.nazwisko = titleCase(nazwiskoAllCaps[1].trim());
  }

  // Data urodzenia
  const dobMatch = normalized.match(/[Dd]ata\s+urodzenia\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/);
  if (dobMatch) result.dataUrodzenia = parseDatePL(dobMatch[1]);

  // Obywatelstwo
  const obywMatch = normalized.match(/[Oo]bywatelstwo[:\s]+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+(?:[\s][A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+){0,2})(?=\s|$|[,;.\d])/);
  if (obywMatch) {
    let citizenship = obywMatch[1].trim();
    // Remove trailing words that are clearly not part of citizenship
    citizenship = citizenship.replace(/\s+(zezwolenie|pobyt|prac[aęy]|decyzj[aięy]|czasow[aąeiy]|sta[łl][aąeiy]|kart[aąeiy]|na).*$/i, "").trim();
    if (citizenship.length > 1) result.obywatelstwo = citizenship;
  }

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

  // ISO format: "Od: YYYY-MM-DD ... Do: YYYY-MM-DD" (OP.G format)
  if (!result.dataOd) {
    const isoRangeMatch = normalized.match(
      /[Oo]d\s*(?:\(.*?\))?[:\s]*(\d{4}-\d{2}-\d{2})\s+[Dd]o\s*(?:\(.*?\))?[:\s]*(\d{4}-\d{2}-\d{2})/
    );
    if (isoRangeMatch) {
      result.dataOd = isoRangeMatch[1];
      result.dataDo = isoRangeMatch[2];
    }
  }

  // Ewidencja dates take priority for oświadczenia
  const ewidencjaMatch = normalized.match(
    /ewidencji\s+o[śs]wiadcze[ńn].*?[Oo]d\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})\s+[Dd]o\s*(?:\(.*?\))?[:\s]*(\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/i
  );
  if (ewidencjaMatch) {
    result.dataOd = parseDatePL(ewidencjaMatch[1]);
    result.dataDo = parseDatePL(ewidencjaMatch[2]);
  }

  // Ewidencja dates in ISO format
  if (!result.dataOd || (result.dataOd && normalized.includes("ewidencji"))) {
    const ewidIsoMatch = normalized.match(
      /ewidencji\s+o[śs]wiadcze[ńn].*?[Oo]d\s*(?:\(.*?\))?[:\s]*(\d{4}-\d{2}-\d{2})\s+[Dd]o\s*(?:\(.*?\))?[:\s]*(\d{4}-\d{2}-\d{2})/i
    );
    if (ewidIsoMatch) {
      result.dataOd = ewidIsoMatch[1];
      result.dataDo = ewidIsoMatch[2];
    }
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

export function parseOswiadczenieText(text: string, filenameHint?: string): ParsedDocumentData {
  const result: ParsedDocumentData = {};
  const normalized = text.replace(/\s+/g, " ").trim();

  // Detect document type
  result.detectedType = detectDocumentType(normalized, filenameHint);

  // === ODWOLANIE / ZAŻALENIE — extract dates + decision number, then return ===
  if (result.detectedType === "ODWOLANIE") {
    extractPersonalData(normalized, result);

    // For appeals, extract the appeal deadline/validity date specifically.
    // Look for "do dnia DD.MM.YYYY" or "termin ... DD.MM.YYYY" patterns first.
    const terminMatch = normalized.match(/(?:termin|do\s+dnia|wa[żz]n[eao]\s+do|obowi[aą]zuje\s+do)\s*[:\s]*(\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{4})/i);
    if (terminMatch) {
      result.dataDo = parseDatePL(terminMatch[1]);
    }

    // Try generic date range extraction only if we didn't find specific dates
    if (!result.dataDo) {
      extractDateRange(normalized, result);
    }

    // If multiple dates found, prefer the latest one as dataDo for appeals
    // (the appeal deadline is typically the furthest future date)
    const allDates: string[] = [];
    const dateRegex = /(\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{4})/g;
    let dateMatch: RegExpExecArray | null;
    while ((dateMatch = dateRegex.exec(normalized)) !== null) {
      const parsed = parseDatePL(dateMatch[1]);
      if (parsed) allDates.push(parsed);
    }
    // Also try Polish word dates
    const wordDateRegex = /(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|wrze[śs]nia|pa[źz]dziernika|listopada|grudnia)\s+(\d{4})/gi;
    while ((dateMatch = wordDateRegex.exec(normalized)) !== null) {
      const parsed = parseDatePL(dateMatch[0]);
      if (parsed) allDates.push(parsed);
    }

    if (allDates.length > 0) {
      // Filter out dates that are clearly NOT document period dates:
      // - Dates before 2000 (likely DOB or historical references)
      // - The person's date of birth (if extracted)
      const validDates = allDates.filter((d) => {
        if (d < "2000-01-01") return false;
        if (result.dataUrodzenia && d === result.dataUrodzenia) return false;
        return true;
      });

      if (validDates.length > 0) {
        // Sort dates descending, take the latest as dataDo (appeal deadline)
        validDates.sort((a, b) => b.localeCompare(a));
        if (!result.dataDo || validDates[0] > result.dataDo) {
          result.dataDo = validDates[0];
        }
        // Take earliest valid date as dataOd (when appeal was filed)
        if (!result.dataOd && validDates.length > 1) {
          validDates.sort((a, b) => a.localeCompare(b));
          result.dataOd = validDates[0];
        }
      }
    }

    // Try to extract the original decision number being appealed
    const nrDecMatch = normalized.match(/(?:nr\s+decyzji|numer\s+decyzji|sygnatura|znak\s+sprawy|decyzji\s+nr|decyzj[ięi]\s+nr)[.:\s]+([A-Z0-9]{2,}[-./][A-Z0-9./\-]{3,})/i);
    if (nrDecMatch) result.nrDecyzji = nrDecMatch[1].trim();

    // For odwolanie, mark as low confidence if we couldn't extract personal data
    if (!result.imie && !result.nazwisko) {
      result.lowConfidence = true;
    }

    sanitizeDates(result);
    return result;
  }

  // === ZEZWOLENIE / BLUE_CARD — same structured layout (decision documents) ===
  if (result.detectedType === "ZEZWOLENIE" || result.detectedType === "BLUE_CARD" || result.detectedType === "KARTA_POBYTU") {
    const zezResult = parseZezwolenie(normalized, result);
    sanitizeDates(zezResult);
    return zezResult;
  }

  // === OŚWIADCZENIE / unknown ===
  extractPersonalData(normalized, result);

  // Fallback: extract names from filename pattern "(IMIE NAZWISKO)"
  if (!result.imie && !result.nazwisko && filenameHint) {
    const fnNameMatch = filenameHint.match(/\(([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ][A-ZĄĆĘŁŃÓŚŹŻ]+)\)/);
    if (fnNameMatch) {
      result.imie = titleCase(fnNameMatch[1].trim());
      result.nazwisko = titleCase(fnNameMatch[2].trim());
    }
    // Also try "(NAZWISKO IMIE)" — uppercase both parts
    if (!result.imie) {
      const fnNameMatch2 = filenameHint.match(/\(([A-ZĄĆĘŁŃÓŚŹŻ]{2,})\s+([A-ZĄĆĘŁŃÓŚŹŻ]{2,})\)/);
      if (fnNameMatch2) {
        // Assume IMIE NAZWISKO order (first shorter, second longer or both similar)
        result.imie = titleCase(fnNameMatch2[1].trim());
        result.nazwisko = titleCase(fnNameMatch2[2].trim());
      }
    }
  }

  extractDateRange(normalized, result);

  // Fallback for OP.G format: look for date pairs near "okres" or "powierzenia"
  if (!result.dataOd && result.detectedType === "OSWIADCZENIE") {
    // Try: any "Od" followed by a date, then "Do" followed by a date, within 200 chars
    const DATE_PATTERN = "(?:\\d{1,2}\\s*[.\\/\\-]\\s*\\d{1,2}\\s*[.\\/\\-]\\s*\\d{4}|\\d{4}-\\d{2}-\\d{2})";
    const looseDateRange = normalized.match(
      new RegExp(`[Oo]d[^A-Za-z]*(${DATE_PATTERN})[^A-Za-z]*[Dd]o[^A-Za-z]*(${DATE_PATTERN})`)
    );
    if (looseDateRange) {
      result.dataOd = parseDatePL(looseDateRange[1]);
      result.dataDo = parseDatePL(looseDateRange[2]);
    }
  }
  // Fallback: look for standalone date pairs in "okres powierzenia pracy" section
  if (!result.dataOd && result.detectedType === "OSWIADCZENIE") {
    const OKRES_DATE = "(?:\\d{1,2}\\s*[.\\/\\-]\\s*\\d{1,2}\\s*[.\\/\\-]\\s*\\d{4}|\\d{4}-\\d{2}-\\d{2})";
    const okresMatch = normalized.match(
      new RegExp(`(?:okres|powierzeni)[\\s\\S]{0,100}?(${OKRES_DATE})[\\s\\S]{0,50}?(${OKRES_DATE})`, "i")
    );
    if (okresMatch) {
      const d1 = parseDatePL(okresMatch[1]);
      const d2 = parseDatePL(okresMatch[2]);
      if (d1 && d2 && d1 < d2) {
        result.dataOd = d1;
        result.dataDo = d2;
      }
    }
  }

  // Nr oświadczenia (ONLY for OSWIADCZENIE)
  if (result.detectedType === "OSWIADCZENIE") {
    const nrWpisuMatch = normalized.match(/(?:Numer wpisu|nr dok|Numer dokumentu)[.:\s]+([A-Z0-9][A-Z0-9.\-\/]+)/i);
    if (nrWpisuMatch) result.nrOswiadczenia = nrWpisuMatch[1].trim();
    // PSZ-OPWP header often has "PZC.XXXX.XXXXX.XX.YYYY" or "PZC-XXXX-XXXXX-XX-YYYY"
    if (!result.nrOswiadczenia) {
      const pzcMatch = normalized.match(/(PZC[.\-]\d{4}[.\-]\d{3,5}[.\-][A-Z]{2,3}[.\-]\d{4})/i);
      if (pzcMatch) result.nrOswiadczenia = pzcMatch[1].replace(/-/g, ".").trim();
    }
    // Also try OP.G format: "OP.G.4390.XXXXX.XX.YYYY"
    if (!result.nrOswiadczenia) {
      const opgMatch = normalized.match(/(OP\.G\.\d{4}\.\d{3,5}\.[A-Z]{2,3}\.\d{4})/i);
      if (opgMatch) result.nrOswiadczenia = opgMatch[1].trim();
    }
    // Fallback: extract from filename if it contains PZC or OP.G pattern
    if (!result.nrOswiadczenia && filenameHint) {
      const fnMatch = filenameHint.match(/(PZC[.\-]\d{4}[.\-]\d{3,5}[.\-][A-Z]{2,3}[.\-]\d{4})/i);
      if (fnMatch) result.nrOswiadczenia = fnMatch[1].replace(/-/g, ".").trim();
      const fnOpgMatch = filenameHint.match(/(OP\.G\.\d{4}\.\d{3,5}\.[A-Z]{2,3}\.\d{4})/i);
      if (!result.nrOswiadczenia && fnOpgMatch) result.nrOswiadczenia = fnOpgMatch[1].trim();
    }
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

  // Clean up wynagrodzenie — remove trailing section numbers and dots
  if (result.wynagrodzenie) {
    result.wynagrodzenie = result.wynagrodzenie.replace(/\s+\d+\.\s*$/, "").trim();
    result.wynagrodzenie = result.wynagrodzenie.replace(/\.\s*$/, "").trim();
  }

  sanitizeDates(result);
  return result;
}

/**
 * Sanity-check extracted dates. Remove clearly invalid values.
 */
function sanitizeDates(result: ParsedDocumentData): void {
  // dataOd before 2000 is almost certainly a parsing error (e.g. DOB picked up)
  if (result.dataOd && result.dataOd < "2000-01-01") {
    result.dataOd = undefined;
    result.lowConfidence = true;
  }
  // dataDo before 2000 is also invalid for document periods
  if (result.dataDo && result.dataDo < "2000-01-01") {
    result.dataDo = undefined;
    result.lowConfidence = true;
  }
  // dataOd must not equal the person's DOB
  if (result.dataOd && result.dataUrodzenia && result.dataOd === result.dataUrodzenia) {
    result.dataOd = undefined;
    result.lowConfidence = true;
  }
  // dataDo must not equal DOB
  if (result.dataDo && result.dataUrodzenia && result.dataDo === result.dataUrodzenia) {
    result.dataDo = undefined;
    result.lowConfidence = true;
  }
  // dataOd must be before dataDo (if both exist)
  if (result.dataOd && result.dataDo && result.dataOd > result.dataDo) {
    // Swap or clear — likely parsing confusion
    result.dataOd = undefined;
    result.lowConfidence = true;
  }
}

/**
 * Extract embedded JPEG images from PDF binary data.
 * Handles both raw DCTDecode streams (JPEG markers visible) and
 * FlateDecode+DCTDecode streams (JPEG compressed inside zlib — common in Word-generated PDFs).
 * Returns the largest images found (likely the page scans).
 */
async function extractJpegsFromPdf(buffer: ArrayBuffer): Promise<Buffer[]> {
  const zlib = await import("zlib");
  const data = Buffer.from(buffer);
  const jpegs: Buffer[] = [];
  const SOI = Buffer.from([0xFF, 0xD8]); // JPEG Start of Image
  const EOI = Buffer.from([0xFF, 0xD9]); // JPEG End of Image
  const MIN_SIZE = 10 * 1024; // 10 KB — skip thumbnails

  // --- Pass 1: Find raw JPEG markers (DCTDecode-only streams) ---
  let searchFrom = 0;
  while (searchFrom < data.length - 2) {
    const soiIdx = data.indexOf(SOI, searchFrom);
    if (soiIdx === -1) break;

    const eoiIdx = data.indexOf(EOI, soiIdx + 2);
    if (eoiIdx === -1) break;

    const jpegEnd = eoiIdx + 2;
    if (jpegEnd - soiIdx > MIN_SIZE) {
      jpegs.push(data.subarray(soiIdx, jpegEnd));
    }
    searchFrom = jpegEnd;
  }

  // --- Pass 2: Find FlateDecode-compressed streams and decompress ---
  // Word-generated PDFs often use [/FlateDecode /DCTDecode] — the JPEG is zlib-compressed.
  // Look for "stream\r\n" or "stream\n" followed by zlib magic bytes, decompress, check for JPEG.
  if (jpegs.length === 0) {
    console.log("[pdf-parser] No raw JPEGs found, trying FlateDecode stream decompression...");
    const streamMarker = Buffer.from("stream\n");
    const streamMarkerCRLF = Buffer.from("stream\r\n");
    const endstreamMarker = Buffer.from("\nendstream");
    const endstreamMarkerCR = Buffer.from("\r\nendstream");

    let pos = 0;
    let decompressAttempts = 0;
    while (pos < data.length && decompressAttempts < 50) {
      // Find next "stream\n" or "stream\r\n"
      let streamStart = data.indexOf(streamMarkerCRLF, pos);
      let markerLen = streamMarkerCRLF.length;
      if (streamStart === -1) {
        streamStart = data.indexOf(streamMarker, pos);
        markerLen = streamMarker.length;
      }
      if (streamStart === -1) break;

      const dataStart = streamStart + markerLen;

      // Find "endstream"
      let streamEnd = data.indexOf(endstreamMarkerCR, dataStart);
      if (streamEnd === -1) streamEnd = data.indexOf(endstreamMarker, dataStart);
      if (streamEnd === -1) { pos = dataStart + 1; continue; }

      const streamData = data.subarray(dataStart, streamEnd);
      pos = streamEnd + 10;

      // Skip small streams (< 10 KB compressed — unlikely to be a page scan)
      if (streamData.length < 5000) continue;

      // Check for zlib magic bytes (78 9C, 78 01, 78 DA, 78 5E)
      if (streamData.length < 2 || streamData[0] !== 0x78) continue;
      if (![0x01, 0x5E, 0x9C, 0xDA].includes(streamData[1])) continue;

      decompressAttempts++;
      try {
        const decompressed = zlib.inflateSync(streamData);

        // Check if decompressed data is a JPEG
        if (decompressed.length > MIN_SIZE &&
            decompressed[0] === 0xFF && decompressed[1] === 0xD8) {
          console.log(`[pdf-parser] Found FlateDecode JPEG: ${(decompressed.length / 1024).toFixed(0)} KB`);
          jpegs.push(decompressed);
        }
      } catch {
        // Not valid zlib — skip
      }
    }
    console.log(`[pdf-parser] FlateDecode pass: ${decompressAttempts} streams tried, ${jpegs.length} JPEGs found`);
  }

  // Sort by size descending — largest images are most likely page scans
  jpegs.sort((a, b) => b.length - a.length);

  // Return at most 4 largest (first pages usually have the key data)
  return jpegs.slice(0, 4);
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
  // Residence decision sygnatura: "nr sprawy: XXXX/2025" or "Decyzja nr ..."
  if (!result.nrDecyzji) {
    const decNrMatch = normalized.match(/(?:decyzja|decyzji)\s+nr\s*[.:\s]*([A-Z0-9/.\-]+)/i);
    if (decNrMatch) result.nrDecyzji = decNrMatch[1].trim();
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

  // Fallback for decyzja format: "Panu/Pani IMIE NAZWISKO" (without trailing dash/paren)
  if (!result.imie && !result.nazwisko) {
    const panuMatch = normalized.match(/Pan[iu]\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ][A-ZĄĆĘŁŃÓŚŹŻ]+)/);
    if (panuMatch) {
      result.imie = titleCase(panuMatch[1].trim());
      result.nazwisko = titleCase(panuMatch[2].trim());
    }
  }

  // --- Obywatelstwo: "obywatela/obywatelki MalezjaMalezja" ---
  const obywMatch = normalized.match(/obywatela\/obywatelki\s+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)/i);
  if (obywMatch) result.obywatelstwo = dedup(obywMatch[1].trim());

  // Fallback for decyzja format: "Obywatelstwo Białoruś"
  if (!result.obywatelstwo) {
    const obywFallback = normalized.match(/[Oo]bywatelstwo\s+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)/);
    if (obywFallback) {
      const val = obywFallback[1].trim();
      // Validate it's a country name, not a legal term
      if (!/^(zezwoleni|pobyt|prac|decyzj|czasow|kart)/i.test(val)) {
        result.obywatelstwo = val;
      }
    }
  }

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

  // --- Wynagrodzenie fallback for decyzja format: "12272,58 zł brutto miesięcznie" ---
  if (!result.wynagrodzenie) {
    const wynFallback = normalized.match(/(\d[\d\s,.]+)\s*(?:PLN|z[łl])\s*(?:brutto|netto)?(?:\s*miesi[ęe]cznie)?/i);
    if (wynFallback) {
      const cleaned = wynFallback[0].replace(/\s+/g, " ").trim();
      if (cleaned.length > 3) result.wynagrodzenie = cleaned;
    }
  }

  // --- Daty: "ważne od 01.11.2025 r. do 31.10.2026 r." ---
  extractDateRange(normalized, result);

  // Fallback for decyzja: "do dnia DD.MM.YYYY" without a matching "od"
  if (!result.dataDo) {
    const doDniaMatch = normalized.match(/do\s+dnia\s+(\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{4})/i);
    if (doDniaMatch) result.dataDo = parseDatePL(doDniaMatch[1]);
  }
  // For decisions, dataOd can be the decision date: "Warszawa, DD MONTH YYYY"
  if (!result.dataOd) {
    const decDateMatch = normalized.match(/Warszawa,?\s+(?:dnia\s+)?(\d{1,2}\s+\w+\s+\d{4})/i);
    if (decDateMatch) result.dataOd = parseDatePL(decDateMatch[1]);
  }

  // --- Paszport ---
  const paszMatch = normalized.match(/(?:[Ss]eria\s+i\s+numer|[Nn]umer\s+dokumentu\s+podr[óo][żz]y|paszport(?:u)?)[:\s]+([A-Z0-9]+)/);
  if (paszMatch) result.nrPaszportu = paszMatch[1].trim();

  // Ensure no oświadczenie fields leak
  result.nrOswiadczenia = undefined;

  // Clean up wynagrodzenie — remove trailing section numbers and dots
  if (result.wynagrodzenie) {
    result.wynagrodzenie = result.wynagrodzenie.replace(/\s+\d+\.\s*$/, "").trim();
    result.wynagrodzenie = result.wynagrodzenie.replace(/\.\s*$/, "").trim();
  }

  return result;
}

/**
 * OCR fallback using Claude API for scanned PDFs (no text layer).
 * Requires ANTHROPIC_API_KEY environment variable.
 */
/** OCR error details for caller to distinguish "no key" from "API error" */
export type OcrError = { type: "no_key" } | { type: "api_error"; message: string } | null;
let lastOcrError: OcrError = null;
export function getLastOcrError(): OcrError { return lastOcrError; }

/**
 * Structured OCR extraction using Claude Vision/PDF API.
 * Instead of transcribing text and then parsing with regex,
 * ask Claude to directly extract structured fields.
 */
export async function ocrExtractStructured(
  buffer: ArrayBuffer,
  mediaType: "application/pdf" | "image/jpeg" | "image/png",
  filename?: string
): Promise<ParsedDocumentData | null> {
  lastOcrError = null;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    lastOcrError = { type: "no_key" };
    return null;
  }

  const fileSizeMB = buffer.byteLength / 1024 / 1024;
  console.log(`[pdf-parser] OCR structured extraction: ${fileSizeMB.toFixed(2)} MB, type=${mediaType}`);

  if (buffer.byteLength > 25 * 1024 * 1024) {
    lastOcrError = { type: "api_error", message: `File too large: ${fileSizeMB.toFixed(1)} MB (max 25 MB)` };
    return null;
  }

  const base64 = Buffer.from(buffer).toString("base64");

  // PDF beta (pdfs-2024-09-25) requires Sonnet — Haiku doesn't support it reliably.
  // Use Haiku only for image OCR (non-PDF), Sonnet for everything else.
  const isPdf = mediaType === "application/pdf";
  const useHaiku = !isPdf && buffer.byteLength > 2 * 1024 * 1024; // Haiku only for large images
  const model = useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";
  console.log(`[pdf-parser] Using model: ${model} (file ${fileSizeMB.toFixed(1)} MB, pdf=${isPdf}, haiku=${useHaiku})`);

  const extractionPrompt = `Przeanalizuj ten dokument i wyciagnij z niego dane w formacie JSON. Dokument to prawdopodobnie polski dokument imigracyjny (oswiadczenie o powierzeniu pracy, zezwolenie na prace, decyzja pobytowa, wiza, karta pobytu lub Niebieska Karta UE).

UWAGA: Obraz dokumentu moze byc OBROCONY o 90, 180 lub 270 stopni (zdjecie zrobione telefonem na lezaco). Odczytaj tekst niezaleznie od orientacji obrazu.

Zwroc TYLKO obiekt JSON (bez komentarzy, bez markdown) z nastepujacymi polami (puste/nieznalezione pola = null):

{
  "detectedType": "OSWIADCZENIE" | "ZEZWOLENIE" | "KARTA_POBYTU" | "BLUE_CARD" | null,
  "imie": "imie cudzoziemca",
  "nazwisko": "nazwisko cudzoziemca",
  "dataUrodzenia": "YYYY-MM-DD",
  "obywatelstwo": "kraj obywatelstwa (tylko nazwa kraju, bez dodatkowego tekstu)",
  "nrPaszportu": "numer paszportu",
  "dataOd": "YYYY-MM-DD (poczatek waznosci dokumentu/zezwolenia)",
  "dataDo": "YYYY-MM-DD (koniec waznosci dokumentu/zezwolenia)",
  "stanowisko": "stanowisko/rodzaj pracy",
  "rodzajUmowy": "typ umowy",
  "firma": "nazwa pracodawcy/podmiotu",
  "nrDecyzji": "numer decyzji lub sygnatura sprawy",
  "nrOswiadczenia": "numer wpisu oswiadczenia",
  "wynagrodzenie": "kwota z waluta, np. 4806,00 PLN brutto"
}

Zasady:
- detectedType: OSWIADCZENIE = oswiadczenie o powierzeniu pracy; ZEZWOLENIE = zezwolenie na prace typ A-E; KARTA_POBYTU = decyzja o zezwoleniu na pobyt czasowy/staly; BLUE_CARD = Niebieska Karta UE lub zezwolenie na pobyt w celu wykonywania pracy wymagajacej wysokich kwalifikacji
- Jesli dokument zawiera "udzielam" / "udziela sie" to jest decyzja pozytywna (KARTA_POBYTU lub BLUE_CARD), NIE odwolanie
- Jesli dokument mowi o "wysokich kwalifikacjach" lub art. 127, typ = BLUE_CARD
- obywatelstwo: TYLKO nazwa kraju (np. "Bialorus", "Ukraina"), bez zadnych dodatkowych slow
- Daty w formacie YYYY-MM-DD
- Dla decyzji pobytowej: dataOd = data wydania decyzji, dataDo = data waznosci zezwolenia ("do dnia...")
- nrDecyzji: numer decyzji lub sygnatura sprawy (np. "WSC-II-P.6151.34116.2025")`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const contentBlock = isPdf
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/jpeg" | "image/png", data: base64 } };

    let response;
    if (isPdf) {
      response = await client.beta.messages.create({
        model,
        max_tokens: 2048,
        betas: ["pdfs-2024-09-25"],
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: extractionPrompt }] }],
      });
    } else {
      response = await client.messages.create({
        model,
        max_tokens: 2048,
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: extractionPrompt }] }],
      });
    }

    const textBlocks = response.content.filter((b: { type: string }) => b.type === "text");
    const fullText = textBlocks.map((b: { type: string; text?: string }) => b.text ?? "").join("\n").trim();

    console.log(`[pdf-parser] OCR structured response (${fullText.length} chars): ${fullText.substring(0, 300)}`);

    // Parse JSON from response (may be wrapped in ```json ... ```)
    let jsonStr = fullText;
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    try {
      const data = JSON.parse(jsonStr);
      const result: ParsedDocumentData = {};

      if (data.detectedType && ["OSWIADCZENIE", "ZEZWOLENIE", "KARTA_POBYTU", "BLUE_CARD"].includes(data.detectedType)) {
        result.detectedType = data.detectedType;
      }
      if (data.imie && typeof data.imie === "string") result.imie = data.imie.trim();
      if (data.nazwisko && typeof data.nazwisko === "string") result.nazwisko = data.nazwisko.trim();
      if (data.dataUrodzenia && /^\d{4}-\d{2}-\d{2}$/.test(data.dataUrodzenia)) result.dataUrodzenia = data.dataUrodzenia;
      if (data.obywatelstwo && typeof data.obywatelstwo === "string") {
        // Clean citizenship — only country name
        let cit = data.obywatelstwo.trim();
        cit = cit.replace(/\s+(zezwolenie|pobyt|prac|decyzj|czasow|kart|na|do|dnia|terytorium).*$/i, "").trim();
        if (cit.length > 1) result.obywatelstwo = cit;
      }
      if (data.nrPaszportu && typeof data.nrPaszportu === "string") result.nrPaszportu = data.nrPaszportu.trim();
      if (data.dataOd && /^\d{4}-\d{2}-\d{2}$/.test(data.dataOd)) result.dataOd = data.dataOd;
      if (data.dataDo && /^\d{4}-\d{2}-\d{2}$/.test(data.dataDo)) result.dataDo = data.dataDo;
      if (data.stanowisko && typeof data.stanowisko === "string") result.stanowisko = data.stanowisko.trim();
      if (data.rodzajUmowy && typeof data.rodzajUmowy === "string") result.rodzajUmowy = data.rodzajUmowy.trim();
      if (data.firma && typeof data.firma === "string") result.firma = data.firma.trim();
      if (data.nrDecyzji && typeof data.nrDecyzji === "string") result.nrDecyzji = data.nrDecyzji.trim();
      if (data.nrOswiadczenia && typeof data.nrOswiadczenia === "string") result.nrOswiadczenia = data.nrOswiadczenia.trim();
      if (data.wynagrodzenie && typeof data.wynagrodzenie === "string") {
        let wyn = data.wynagrodzenie.trim();
        wyn = wyn.replace(/\s+\d+\.\s*$/, "").replace(/\.\s*$/, "").trim();
        if (wyn.length > 2) result.wynagrodzenie = wyn;
      }

      // Validate dates
      sanitizeDates(result);

      const hasAnyData = result.dataOd || result.dataDo || result.nazwisko || result.imie
        || result.stanowisko || result.nrPaszportu || result.nrDecyzji || result.wynagrodzenie;

      return hasAnyData ? result : null;
    } catch (parseErr) {
      console.error(`[pdf-parser] Failed to parse OCR JSON: ${parseErr}`);
      // Fallback: return the raw text for regex parsing
      console.log("[pdf-parser] Falling back to regex parsing of OCR text");
      const result = parseOswiadczenieText(fullText, filename);
      const hasAnyData = result.dataOd || result.dataDo || result.nazwisko || result.imie
        || result.rodzajPracy || result.rodzajUmowy || result.nrPaszportu
        || result.nrDecyzji || result.stanowisko || result.wynagrodzenie;
      return hasAnyData ? result : null;
    }

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[pdf-parser] OCR structured extraction error: ${errMsg}`);
    lastOcrError = { type: "api_error", message: errMsg };
    return null;
  }
}

/**
 * @deprecated Use ocrExtractStructured() instead. Kept for backward compatibility.
 * OCR for image files (JPG, PNG) using Claude Vision API.
 */
export async function ocrImageWithClaude(buffer: ArrayBuffer, fileType: string): Promise<string | null> {
  lastOcrError = null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    lastOcrError = { type: "no_key" };
    return null;
  }

  const fileSizeBytes = buffer.byteLength;
  if (fileSizeBytes > 20 * 1024 * 1024) {
    lastOcrError = { type: "api_error", message: `Image too large: ${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB` };
    return null;
  }

  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = fileType === "png" ? "image/png" : "image/jpeg";

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: "Przepisz doslownie caly tekst z tego dokumentu. Zachowaj oryginalne sformulowania i kolejnosc. Zwroc tylko tekst, bez zadnych komentarzy ani naglowkow.",
            },
          ],
        },
      ],
    });

    const textBlocks = response.content.filter((b: { type: string }) => b.type === "text");
    const fullText = textBlocks.map((b: { type: string; text?: string }) => b.text ?? "").join("\n");

    if (fullText.length > 20) return fullText;

    lastOcrError = { type: "api_error", message: `OCR returned only ${fullText.length} chars` };
    return null;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    lastOcrError = { type: "api_error", message: errMsg };
    return null;
  }
}

/** @deprecated Use ocrExtractStructured() instead. Kept for backward compatibility. */
async function ocrWithClaude(buffer: ArrayBuffer): Promise<string | null> {
  lastOcrError = null;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log(`[pdf-parser] OCR: ANTHROPIC_API_KEY present=${!!apiKey}, length=${apiKey?.length ?? 0}`);

  if (!apiKey) {
    console.warn("[pdf-parser] ANTHROPIC_API_KEY not set");
    lastOcrError = { type: "no_key" };
    return null;
  }

  const fileSizeBytes = buffer.byteLength;
  const fileSizeMB = (fileSizeBytes / 1024 / 1024).toFixed(2);
  console.log(`[pdf-parser] PDF size: ${fileSizeMB} MB (${fileSizeBytes} bytes)`);

  if (fileSizeBytes > 25 * 1024 * 1024) {
    const msg = `PDF too large: ${fileSizeMB} MB (max ~25 MB for base64 encoding)`;
    console.warn(`[pdf-parser] ${msg}`);
    lastOcrError = { type: "api_error", message: msg };
    return null;
  }

  const base64 = Buffer.from(buffer).toString("base64");
  console.log(`[pdf-parser] Base64 size: ${(base64.length / 1024 / 1024).toFixed(2)} MB`);

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    // Use claude-sonnet-4-6 (stable) with PDF beta
    const model = "claude-sonnet-4-6";
    console.log(`[pdf-parser] Calling API: model=${model}, beta=pdfs-2024-09-25`);

    const response = await client.beta.messages.create(
      {
        model,
        max_tokens: 4096,
        betas: ["pdfs-2024-09-25"],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: "Przepisz doslownie caly tekst z tego dokumentu PDF. Zachowaj oryginalne sformulowania i kolejnosc. Zwroc tylko tekst, bez zadnych komentarzy ani naglowkow.",
              },
            ],
          },
        ],
      }
    );

    console.log(`[pdf-parser] API response received: id=${response.id}, stop_reason=${response.stop_reason}, usage=${JSON.stringify(response.usage)}`);
    console.log(`[pdf-parser] Content blocks: ${response.content.length}, types: ${response.content.map((b: { type: string }) => b.type).join(",")}`);

    const textBlocks = response.content.filter((b: { type: string }) => b.type === "text");
    const fullText = textBlocks.map((b: { type: string; text?: string }) => b.text ?? "").join("\n");

    console.log(`[pdf-parser] Extracted text length: ${fullText.length} chars`);
    if (fullText.length > 0 && fullText.length <= 200) {
      console.log(`[pdf-parser] Full extracted text: "${fullText}"`);
    } else if (fullText.length > 200) {
      console.log(`[pdf-parser] First 200 chars: "${fullText.substring(0, 200)}..."`);
    }

    if (fullText.length > 20) {
      return fullText;
    }

    const msg = `OCR returned only ${fullText.length} chars`;
    console.warn(`[pdf-parser] ${msg}`);
    lastOcrError = { type: "api_error", message: msg };
    return null;

  } catch (err: unknown) {
    // Detailed error logging
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[pdf-parser] OCR API error: ${errMsg}`);

    if (err && typeof err === "object") {
      if ("status" in err) console.error(`[pdf-parser] HTTP status: ${(err as { status: number }).status}`);
      if ("error" in err) console.error(`[pdf-parser] Error body: ${JSON.stringify((err as { error: unknown }).error)}`);
      if ("headers" in err) {
        const headers = (err as { headers: Record<string, string> }).headers;
        if (headers?.["x-request-id"]) console.error(`[pdf-parser] Request ID: ${headers["x-request-id"]}`);
      }
    }

    lastOcrError = { type: "api_error", message: errMsg };
    return null;
  }
}

/**
 * Parse PDF buffer and extract document data.
 * Supports oświadczenia, zezwolenia na pracę, and decyzje pobytowe.
 * @param ocrFallback - if true (default), attempt Claude OCR when no text layer detected.
 *   Set to false on upload (fast path) — user can trigger OCR explicitly via Scrape button.
 */
export async function parseOswiadczeniePdf(
  buffer: ArrayBuffer,
  { ocrFallback = true, filename }: { ocrFallback?: boolean; filename?: string } = {}
): Promise<ParsedDocumentData | null> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const pdfData = await pdfParse(Buffer.from(buffer));
    let text = pdfData.text;

    // If no text extracted (scanned PDF), optionally try structured OCR extraction
    if ((!text || text.length < 20) && ocrFallback) {
      console.log("[pdf-parser] No text layer detected, attempting structured OCR extraction...");

      // Try 1: Send full PDF to Claude PDF beta (always uses Sonnet)
      const ocrResult = await ocrExtractStructured(buffer, "application/pdf", filename);
      if (ocrResult) return ocrResult;
      console.log(`[pdf-parser] PDF beta OCR returned null. lastOcrError=${JSON.stringify(lastOcrError)}`);

      // Try 2: Extract embedded JPEG images and process them individually
      // This handles PDFs with rotated/embedded images that the PDF beta can't read
      console.log("[pdf-parser] PDF OCR failed, trying JPEG extraction from PDF binary...");
      const jpegs = await extractJpegsFromPdf(buffer);
      console.log(`[pdf-parser] Found ${jpegs.length} embedded JPEG images in PDF`);

      if (jpegs.length > 0) {
        // Process each JPEG image and merge results
        let bestResult: ParsedDocumentData | null = null;

        for (let i = 0; i < jpegs.length; i++) {
          const jpegBuf = jpegs[i];
          console.log(`[pdf-parser] Processing extracted JPEG ${i + 1}/${jpegs.length} (${(jpegBuf.length / 1024).toFixed(0)} KB)`);

          // Auto-rotate: detect landscape images and rotate to portrait
          // Phone photos taken horizontally produce landscape JPEGs that need 90° CW rotation
          let imageBuffer: Buffer = jpegBuf;
          try {
            const sharp = (await import("sharp")).default;
            const metadata = await sharp(jpegBuf).metadata();
            const w = metadata.width ?? 0;
            const h = metadata.height ?? 0;
            console.log(`[pdf-parser] JPEG ${i + 1} dimensions: ${w}x${h} (${w > h ? "LANDSCAPE - rotating" : "portrait"})`);

            if (w > h && w > 100) {
              // Landscape image — rotate 90° clockwise (most common for phone photos)
              imageBuffer = await sharp(jpegBuf).rotate(90).jpeg({ quality: 85 }).toBuffer();
              console.log(`[pdf-parser] Rotated JPEG ${i + 1}: ${imageBuffer.length / 1024 | 0} KB`);
            }
          } catch (rotErr) {
            console.warn(`[pdf-parser] Sharp rotation failed, using original: ${rotErr}`);
          }

          const imgResult = await ocrExtractStructured(
            new Uint8Array(imageBuffer).buffer as ArrayBuffer,
            "image/jpeg",
            filename
          );

          // If rotation didn't help, retry with 270° (opposite direction)
          if (!imgResult && imageBuffer !== jpegBuf) {
            console.log(`[pdf-parser] OCR failed on 90° rotation, trying 270°...`);
            try {
              const sharp = (await import("sharp")).default;
              const altBuffer = await sharp(jpegBuf).rotate(270).jpeg({ quality: 85 }).toBuffer();
              const altResult = await ocrExtractStructured(
                new Uint8Array(altBuffer).buffer as ArrayBuffer,
                "image/jpeg",
                filename
              );
              if (altResult) {
                if (!bestResult) { bestResult = altResult; } else {
                  if (!bestResult.imie && altResult.imie) bestResult.imie = altResult.imie;
                  if (!bestResult.nazwisko && altResult.nazwisko) bestResult.nazwisko = altResult.nazwisko;
                  if (!bestResult.dataOd && altResult.dataOd) bestResult.dataOd = altResult.dataOd;
                  if (!bestResult.dataDo && altResult.dataDo) bestResult.dataDo = altResult.dataDo;
                  if (!bestResult.detectedType && altResult.detectedType) bestResult.detectedType = altResult.detectedType;
                  if (!bestResult.firma && altResult.firma) bestResult.firma = altResult.firma;
                  if (!bestResult.stanowisko && altResult.stanowisko) bestResult.stanowisko = altResult.stanowisko;
                  if (!bestResult.wynagrodzenie && altResult.wynagrodzenie) bestResult.wynagrodzenie = altResult.wynagrodzenie;
                  if (!bestResult.nrDecyzji && altResult.nrDecyzji) bestResult.nrDecyzji = altResult.nrDecyzji;
                }
                if (bestResult.imie && bestResult.nazwisko && bestResult.dataDo && bestResult.detectedType) {
                  console.log("[pdf-parser] Got all essential fields after 270° rotation");
                  break;
                }
                continue;
              }
            } catch { /* ignore */ }
          }

          if (imgResult) {
            if (!bestResult) {
              bestResult = imgResult;
            } else {
              // Merge: fill in missing fields from subsequent pages
              if (!bestResult.imie && imgResult.imie) bestResult.imie = imgResult.imie;
              if (!bestResult.nazwisko && imgResult.nazwisko) bestResult.nazwisko = imgResult.nazwisko;
              if (!bestResult.dataOd && imgResult.dataOd) bestResult.dataOd = imgResult.dataOd;
              if (!bestResult.dataDo && imgResult.dataDo) bestResult.dataDo = imgResult.dataDo;
              if (!bestResult.obywatelstwo && imgResult.obywatelstwo) bestResult.obywatelstwo = imgResult.obywatelstwo;
              if (!bestResult.stanowisko && imgResult.stanowisko) bestResult.stanowisko = imgResult.stanowisko;
              if (!bestResult.firma && imgResult.firma) bestResult.firma = imgResult.firma;
              if (!bestResult.wynagrodzenie && imgResult.wynagrodzenie) bestResult.wynagrodzenie = imgResult.wynagrodzenie;
              if (!bestResult.nrDecyzji && imgResult.nrDecyzji) bestResult.nrDecyzji = imgResult.nrDecyzji;
              if (!bestResult.nrPaszportu && imgResult.nrPaszportu) bestResult.nrPaszportu = imgResult.nrPaszportu;
              if (!bestResult.dataUrodzenia && imgResult.dataUrodzenia) bestResult.dataUrodzenia = imgResult.dataUrodzenia;
              if (!bestResult.detectedType && imgResult.detectedType) bestResult.detectedType = imgResult.detectedType;
              if (!bestResult.rodzajUmowy && imgResult.rodzajUmowy) bestResult.rodzajUmowy = imgResult.rodzajUmowy;
            }

            // If we have the essential fields after processing this page, stop early
            if (bestResult.imie && bestResult.nazwisko && bestResult.dataDo && bestResult.detectedType) {
              console.log("[pdf-parser] Got all essential fields, stopping image processing");
              break;
            }
          }
        }

        if (bestResult) {
          sanitizeDates(bestResult);
          return bestResult;
        }
      }

      return null;
    }

    if (!text || text.length < 20) return null;

    const result = parseOswiadczenieText(text, filename);

    // ODWOLANIE detection: return partial result so caller knows to skip employment base
    if (result.detectedType === "ODWOLANIE") {
      return result;
    }

    const hasAnyData = result.dataOd || result.dataDo || result.nazwisko || result.imie
      || result.rodzajPracy || result.rodzajUmowy || result.nrPaszportu
      || result.nrDecyzji || result.stanowisko || result.wynagrodzenie;

    return hasAnyData ? result : null;
  } catch (err) {
    console.error("[pdf-parser] Failed to parse PDF:", err);
    return null;
  }
}
