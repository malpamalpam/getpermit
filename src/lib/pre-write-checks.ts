/**
 * Pre-write validation checks (section 7).
 * Each check returns a list of issues found. If any issue exists,
 * the document goes to "do weryfikacji" queue instead of being saved directly.
 *
 * Every numbered point from section 7 = at least one check function.
 */

import type { ParsedDocumentData } from "./pdf-parser";

export interface PreWriteIssue {
  /** Check number from section 7 (1-26) */
  checkId: number;
  /** Severity: error = block save, warning = save with flag */
  severity: "error" | "warning";
  /** Human-readable description */
  message: string;
  /** Field that has the issue */
  field?: string;
}

/**
 * Run all pre-write checks on extracted data.
 * Returns array of issues (empty = all checks passed).
 */
export function runPreWriteChecks(
  parsed: ParsedDocumentData,
  profileName: { imie?: string | null; nazwisko?: string | null },
  existingBases?: { typ: string; status: string; dataOd?: Date | null; dataDo?: Date | null }[],
): PreWriteIssue[] {
  const issues: PreWriteIssue[] = [];

  // 1. Data urodzenia jako data od (rok < 2000)
  if (parsed.dataOd && parsed.dataOd < "2000-01-01") {
    issues.push({
      checkId: 1, severity: "error", field: "dataOd",
      message: `Data od (${parsed.dataOd}) jest sprzed 2000 r. — prawdopodobnie data urodzenia`,
    });
  }

  // 2. Etykiety formularza w wartościach
  const labelPatterns = [
    /\/\s*w\s+charakterze/i, /rodzaj\s+pracy:/i, /Lub\s+Imiona/i,
    /stanowisko\s*\//i, /\(imiona\)/i,
  ];
  for (const field of ["stanowisko", "firma", "rodzajUmowy"] as const) {
    const val = parsed[field];
    if (val && labelPatterns.some(p => p.test(val))) {
      issues.push({
        checkId: 2, severity: "warning", field,
        message: `Pole "${field}" zawiera etykietę formularza: "${val.substring(0, 80)}"`,
      });
    }
  }
  // Check for duplicated text (OCR artifact)
  for (const field of ["stanowisko", "firma"] as const) {
    const val = parsed[field];
    if (val && val.length > 10) {
      const half = Math.floor(val.length / 2);
      if (val.substring(0, half) === val.substring(half, half * 2)) {
        issues.push({
          checkId: 2, severity: "warning", field,
          message: `Pole "${field}" zawiera zduplikowany tekst: "${val.substring(0, 40)}..."`,
        });
      }
    }
  }

  // 3. Sentencja w polu Firma
  if (parsed.firma) {
    const sentencjaInFirma = /udzielam\s+zezwolenia|zezwala\s+si[ęe]|orzekam|ur\.\s+\d|ob\.\s+[A-Z]/i;
    if (sentencjaInFirma.test(parsed.firma)) {
      issues.push({
        checkId: 3, severity: "error", field: "firma",
        message: `Pole "firma" zawiera fragment sentencji: "${parsed.firma.substring(0, 80)}"`,
      });
    }
  }

  // 4. Suspicious salary: fees as salary, concatenated digits, out-of-range amounts
  if (parsed.parsedSalary) {
    const s = parsed.parsedSalary;
    if (s.jednostka === "godzinowo" && s.kwota > 500) {
      issues.push({
        checkId: 4, severity: "warning", field: "wynagrodzenie",
        message: `Stawka godzinowa ${s.kwota} PLN wydaje się za wysoka — może to kwota miesięczna?`,
      });
    }
    if (s.jednostka === "miesiecznie" && s.kwota < 100) {
      issues.push({
        checkId: 4, severity: "warning", field: "wynagrodzenie",
        message: `Kwota miesięczna ${s.kwota} PLN wydaje się za niska — może to stawka godzinowa?`,
      });
    }
    // Typical fee amounts — NOT salary (section 9 rule 4)
    // Only flag as fee when unit is monthly or unknown — hourly 50 PLN/h is a valid rate
    const FEE_AMOUNTS = [17, 51, 100, 340, 400, 440];
    const FEE_AMOUNTS_MONTHLY_ONLY = [50]; // 50 PLN/h is valid, 50 PLN/month is a fee
    if (FEE_AMOUNTS.includes(s.kwota)) {
      issues.push({
        checkId: 4, severity: "error", field: "wynagrodzenie",
        message: `Kwota ${s.kwota} PLN to typowa opłata urzędowa, nie wynagrodzenie. Podstawa NIE powinna być utworzona.`,
      });
    }
    if (FEE_AMOUNTS_MONTHLY_ONLY.includes(s.kwota) && s.jednostka !== "godzinowo") {
      issues.push({
        checkId: 4, severity: "error", field: "wynagrodzenie",
        message: `Kwota ${s.kwota} PLN to typowa opłata urzędowa, nie wynagrodzenie.`,
      });
    }
    // Monthly salary out of sane range
    if (s.jednostka === "miesiecznie" && (s.kwota < 1000 || s.kwota > 100000)) {
      issues.push({
        checkId: 4, severity: "error", field: "wynagrodzenie",
        message: `Wynagrodzenie miesięczne ${s.kwota} PLN poza zakresem 1 000–100 000 PLN — prawdopodobnie błąd odczytu.`,
      });
    }
    // Hourly rate out of sane range
    if (s.jednostka === "godzinowo" && (s.kwota < 20 || s.kwota > 1000)) {
      issues.push({
        checkId: 4, severity: "error", field: "wynagrodzenie",
        message: `Stawka godzinowa ${s.kwota} PLN poza zakresem 20–1 000 PLN — prawdopodobnie błąd odczytu.`,
      });
    }
  }
  // Raw salary string check for concatenated digits (e.g. "1 021 893 140")
  if (parsed.wynagrodzenie) {
    const numMatch = parsed.wynagrodzenie.replace(/\s/g, "").match(/(\d[\d,.]*)/);
    if (numMatch) {
      const val = parseFloat(numMatch[1].replace(/,/g, "."));
      if (val > 100000) {
        issues.push({
          checkId: 4, severity: "error", field: "wynagrodzenie",
          message: `Kwota ${parsed.wynagrodzenie} wydaje się sklejona z wielu pól — prawdopodobnie błąd OCR.`,
        });
      }
    }
  }

  // 5. "Dokument innej osoby" z cyrylicy, nazwy kraju, etykiet
  // (checked in API route via namesMatch, but we check for false positives here)
  // Covered by JUNK_NAME_RE in route.ts

  // 6. Legitimacja studencka tworząca TRC; wniosek/UPO tworzące zatrudnieniową
  if (parsed.detectedType === "TRC_FDK" || parsed.detectedType === "TRC_STUDIA") {
    const text = (parsed.stanowisko ?? "") + " " + (parsed.firma ?? "");
    if (/legitymacj[aęi]\s+studenck/i.test(text)) {
      issues.push({
        checkId: 6, severity: "error",
        message: "Legitymacja studencka nie powinna tworzyć TRC",
      });
    }
  }
  if (parsed.detectedType && /WNIOSEK|UPO/i.test(parsed.detectedType)) {
    issues.push({
      checkId: 6, severity: "error",
      message: "Wniosek lub UPO nie powinien tworzyć podstawy zatrudnienia",
    });
  }

  // 7. Nr dokumentu = GUID / UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (parsed.nrDecyzji && uuidPattern.test(parsed.nrDecyzji)) {
    issues.push({
      checkId: 7, severity: "error", field: "nrDecyzji",
      message: `Nr decyzji to GUID/UUID: "${parsed.nrDecyzji}" — powinien być nr urzędowy`,
    });
  }
  if (parsed.nrOswiadczenia && uuidPattern.test(parsed.nrOswiadczenia)) {
    issues.push({
      checkId: 7, severity: "error", field: "nrOswiadczenia",
      message: `Nr oświadczenia to GUID/UUID: "${parsed.nrOswiadczenia}"`,
    });
  }

  // 8. Nr karty pobytu w "Nr paszportu"
  if (parsed.nrPaszportu && /^[A-Z]{2}\d{7}$/.test(parsed.nrPaszportu)) {
    // 2 litery + 7 cyfr = format karty pobytu (RP, RS, RR, RT)
    if (/^(RP|RS|RR|RT|RN)/.test(parsed.nrPaszportu)) {
      issues.push({
        checkId: 8, severity: "error", field: "nrPaszportu",
        message: `"${parsed.nrPaszportu}" wygląda na nr karty pobytu, nie paszportu`,
      });
    }
  }

  // 9. Nr dowodu osobistego w "Nr paszportu"
  if (parsed.nrPaszportu && /^[A-Z]{3}\d{6}$/.test(parsed.nrPaszportu)) {
    issues.push({
      checkId: 9, severity: "warning", field: "nrPaszportu",
      message: `"${parsed.nrPaszportu}" może być nr dowodu osobistego (3 litery + 6 cyfr)`,
    });
  }

  // 10. Data ważności dowodu w "Karta pobytu ważna do" — checked in API
  // 11. Data wydania karty jako data od — checked in API

  // 12. Karta pobytu tworząca podstawę zatrudnienia
  if (parsed.detectedType === "KARTA_POBYTU") {
    // Karta pobytu should NOT create employment basis
    issues.push({
      checkId: 12, severity: "warning",
      message: "Karta pobytu nie powinna tworzyć podstawy zatrudnienia — tylko pobytową",
    });
  }

  // 13. Typ zezwolenia w "Rodzaj umowy"
  if (parsed.rodzajUmowy && /zezwolenie\s+na\s+pobyt|karta\s+pobytu/i.test(parsed.rodzajUmowy)) {
    issues.push({
      checkId: 13, severity: "error", field: "rodzajUmowy",
      message: `"Rodzaj umowy" zawiera typ zezwolenia: "${parsed.rodzajUmowy}"`,
    });
  }

  // 14. Dowód osobisty / dokument podróży / karta pobytu tworzące zatrudnieniową
  // (covered by no_basis_documents check)

  // 15. "TRC – FDK" lub "TRC" jako typ domyślny
  // This is now handled by classifier returning UNKNOWN instead of defaulting

  // 16. Ponowny scraping tworzący duplikaty — handled by idempotency in API

  // 17. Błędnie odczytana data decyzji
  if (parsed.dataOd && parsed.dataDo && parsed.nrDecyzji) {
    // If dataOd = dataDo, likely parsing error
    if (parsed.dataOd === parsed.dataDo) {
      issues.push({
        checkId: 17, severity: "warning",
        message: `Data od (${parsed.dataOd}) = data do — sprawdź poprawność`,
      });
    }
  }

  // 18. Oświadczenie PSZ-OPWP / starszy wzór nierozpoznane — covered by classifier

  // 19. Załącznik nr 1 lub wniosek tworzące podstawę
  // Filename check
  const fnLower = (parsed as { _filename?: string })._filename?.toLowerCase() ?? "";
  if (/za[łl][aą]cznik\s*nr\s*[12]/i.test(fnLower) || /WNIOSEK-OSW_|OSW-UTRZYMANIE_|OSW-NIEKARALNOSC_|OSW-POBYT-3-LATA_/i.test(fnLower)) {
    issues.push({
      checkId: 19, severity: "error",
      message: "Załącznik nr 1/2 lub oświadczenie pomocnicze nie powinno tworzyć podstawy",
    });
  }

  // 20. Warunki z części "z:" decyzji zmieniającej — checked during change decision processing

  // 21. Podstawa ważna dziś jako NIEAKTYWNE
  // Checked post-save in status computation

  // 22. Puste "TRC – BRAK DANYCH" z karty pobytu
  if (parsed.detectedType === "KARTA_POBYTU" && !parsed.dataDo && !parsed.dataOd
    && !parsed.nrDecyzji && !parsed.firma) {
    issues.push({
      checkId: 22, severity: "error",
      message: "Karta pobytu bez żadnych danych — nie twórz pustego rekordu",
    });
  }

  // 23. Data ważności decyzji w "Karta pobytu ważna do" gdy karty nie wydano — checked in API

  // 24. "Dokument innej osoby" z etykiet wielojęzycznego formularza — covered by JUNK_NAME_RE

  // 25. Typ spoza słownika CRM
  const validTypes = new Set([
    "ZEZWOLENIE", "ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "OSWIADCZENIE",
    "ZGLOSZENIE_UA", "POWIADOMIENIE_UA",
    "KARTA_POBYTU", "TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_HUMANITARNE",
    "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT",
    "TRC_DZIALALNOSC", "TRC_INNE_OKOLICZNOSCI",
    "BLUE_CARD", "TRC_BLUE_CARD",
    "OD_UE", "OD_STUDENT", "OD_POBYT_STALY", "OD_REZYDENT_UE",
    "OD_KARTA_POLAKA", "OD_OCHRONA_UZUP", "OD_UCHODZCA", "OD_WIZA_HUMAN",
    "OD_ABSOLWENT", "OD_UK_WYSTAPIENIE", "OD_BLUE_CARD", "OD_MALZONEK_PL",
    "OD_CZLONEK_RODZINY", "OD_HUMANITARNE",
    "POBYT_CUKR", "ODWOLANIE",
    // v2 new types
    "POBYT_STALY", "REZYDENT_UE", "STATUS_UCHODZCY", "OCHRONA_UZUPELNIAJACA",
    "ZGODA_HUMANITARNA", "OBYWATEL_UE", "UMOWA_WYSTAPIENIA",
    "WIZA", "WIZA_HUMANITARNA", "RUCH_BEZWIZOWY", "POBYT_NA_PRZEDLUZENIU",
    "PESEL_UKR", "KARTA_POLAKA", "STATUS_STUDENTA", "STATUS_ABSOLWENTA",
    // Internal
    "ODMOWA", "ZMIANA_DECYZJI", "UNKNOWN",
  ]);
  if (parsed.detectedType && !validTypes.has(parsed.detectedType)) {
    issues.push({
      checkId: 25, severity: "error", field: "detectedType",
      message: `Typ "${parsed.detectedType}" nie istnieje w słowniku CRM`,
    });
  }

  // 26. Aktywna podstawa zatrudnienia bez aktywnej podstawy pobytu
  // (checked post-save in API route)

  return issues;
}

/**
 * Check post-save consistency: active employment without active residence → red status.
 * Returns warning message or null.
 */
export function checkEmploymentResidenceConsistency(
  hasActiveResidence: boolean,
  hasActiveEmployment: boolean,
): string | null {
  if (hasActiveEmployment && !hasActiveResidence) {
    return "ALERT: Aktywna podstawa zatrudnienia bez aktywnej podstawy pobytu — ryzyko nielegalnej pracy";
  }
  return null;
}
