/**
 * Document classifier for Polish immigration documents.
 * Single source of truth — per department instructions v1.2 (02.10.2026).
 *
 * Determines:
 * - Primary base type (residence or employment)
 * - Secondary base type (when document creates two bases)
 * - Whether document is indefinite (no dataDo)
 * - Date extraction source (issue date, od-do clause, or annotation)
 *
 * Dual-base documents (tworzą JEDNOCZEŚNIE podstawę pobytową i zatrudnieniową):
 *   TRC+praca (art.114), Blue Card (art.127), TRC studia (art.144),
 *   TRC absolwent, Status uchodźcy, Ochrona uzupełniająca,
 *   TRC małżonek PL (art.158), TRC rodzina (art.159),
 *   TRC humanitarne (art.186/1/9), TRC inne okoliczności art.186/1/6.
 */

// ============================================================================
// Types
// ============================================================================

export interface DocumentClassification {
  /** Primary base type to create */
  primaryType: string;
  /** Secondary base type (e.g., employment when primary is residence) */
  secondaryType?: string;
  /** Extracted article number from sentencja */
  article?: string;
  /** For art.15+19 pattern: "odmówić uchodźcy + udzielić ochrony" = POSITIVE */
  decisionOutcome?: "POSITIVE" | "NEGATIVE";
  /** No dataDo, status AKTYWNE (pobyt stały, rezydent, uchodźca, ochrona uzup.) */
  isIndefinite?: boolean;
  /** Which dates to extract */
  dateSource?: "issue_date" | "od_do_clause" | "annotation";
  /** Human-readable description */
  label?: string;
  /** Whether to update foreigner.decyzjaPobytowaDo */
  updatesResidence?: boolean;
  /** Whether to set foreigner.ochronaCzasowaUkr */
  setsUkrProtection?: boolean;
  /** Flag: dataOd requires manual completion (e.g. Wojewoda Wielkopolski) */
  dataOdManualFlag?: boolean;
}

// ============================================================================
// Article → type mapping (table C from instructions v1.2)
// ============================================================================

const ARTICLE_MAP: Record<string, (sentencja: string) => DocumentClassification> = {
  // TRC + work (art.114)
  "114": (sentencja: string) => {
    // Check "na rzecz" to determine FDK vs inny pracodawca
    const isFdk = /na\s+rzecz\s+(?:inkubator|fundacj)/i.test(sentencja);
    return {
      primaryType: "TRC_FDK",
      secondaryType: "ZEZWOLENIE_A",
      dateSource: "issue_date",
      updatesResidence: true,
      label: isFdk ? "TRC — FDK (art.114)" : "TRC — inny pracodawca (art.114)",
    };
  },

  // Blue Card (art.127)
  "127": (sentencja: string) => {
    // B4: Check if decision has specific employment conditions
    const hasConditions = /stanowisk|na\s+rzecz\s+|wynagrodzeni\w+.*\d|kwot[aąę]/i.test(sentencja)
      && !/nie\s+ni[żz]sz\w+\s+ni[żz]\s+okre[śs]lone\s+zgodnie\s+z\s+art\.?\s*127\s+pkt\.?\s*3/i.test(sentencja);
    const isOpenAccess = !hasConditions
      || /w\s+celu\s+wykonywania\s+pracy\s+w\s+zawodzie\s+wymagaj[aą]cym\s+wysokich\s+kwalifikacji\s+za\s+wynagrodzeniem\s+nie\s+ni[żz]sz/i.test(sentencja);

    return {
      primaryType: "TRC_BLUE_CARD",
      secondaryType: isOpenAccess && !hasConditions ? "OD_BLUE_CARD" : "ZEZWOLENIE_A",
      dateSource: "issue_date",
      updatesResidence: true,
      label: isOpenAccess && !hasConditions
        ? "Blue Card (art.127) — OD bez warunków"
        : "Blue Card (art.127) — praca u pracodawcy z decyzji",
    };
  },

  // TRC studia (art.144) — dual base: residence + OD student
  "144": () => ({
    primaryType: "TRC_STUDIA",
    secondaryType: "OD_STUDENT",
    dateSource: "issue_date",
    updatesResidence: true,
    label: "TRC studia (art.144) — OD status studenta",
  }),

  // TRC małżonek PL (art.158) — dual base: residence + OD
  "158": () => ({
    primaryType: "TRC_MALZONEK_PL",
    secondaryType: "OD_MALZONEK_PL",
    dateSource: "issue_date",
    updatesResidence: true,
    label: "TRC małżonek PL (art.158) — OD małżonek obywatela PL",
  }),

  // TRC rodzina (art.159) — dual base: residence + OD
  "159": () => ({
    primaryType: "TRC_POBYT_Z_CUDZ",
    secondaryType: "OD_CZLONEK_RODZINY",
    dateSource: "issue_date",
    updatesResidence: true,
    label: "TRC rodzina (art.159) — OD członek rodziny",
  }),

  // TRC humanitarian + inne okoliczności (art.186)
  "186": (sentencja: string) => {
    // art.186/1/9 = humanitarian + OD
    if (/186\s*(?:ust\.?\s*1\s*)?(?:pkt\.?\s*)?9/i.test(sentencja) || /humanitarn/i.test(sentencja)) {
      return {
        primaryType: "TRC_HUMANITARNE",
        secondaryType: "OD_HUMANITARNE",
        dateSource: "issue_date",
        updatesResidence: true,
        label: "TRC humanitarne (art.186/1/9) — OD humanitarne",
      };
    }
    // art.186/1/6 = inne okoliczności + OD absolwent polskiej uczelni
    if (/186\s*(?:ust\.?\s*1\s*)?(?:pkt\.?\s*)?6/i.test(sentencja)) {
      return {
        primaryType: "TRC_FDK", // "inne okoliczności"
        secondaryType: "OD_ABSOLWENT",
        dateSource: "issue_date",
        updatesResidence: true,
        label: "TRC inne okoliczności (art.186/1/6) — OD absolwent polskiej uczelni",
      };
    }
    // Other art.186, art.187 = inne okoliczności — BRAK automatycznego OD
    return {
      primaryType: "TRC_FDK",
      dateSource: "issue_date",
      updatesResidence: true,
      label: "TRC inne okoliczności (art.186) — BRAK automatycznego OD, weryfikować indywidualnie",
    };
  },

  "187": () => ({
    primaryType: "TRC_FDK",
    dateSource: "issue_date",
    updatesResidence: true,
    label: "TRC inne okoliczności (art.187) — BRAK automatycznego OD, weryfikować indywidualnie",
  }),

  // Pobyt stały (art.195/201) — indefinite + OD
  "195": () => ({
    primaryType: "OD_POBYT_STALY",
    isIndefinite: true,
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Pobyt stały (art.195) — bezterminowo, OD",
  }),
  "201": () => ({
    primaryType: "OD_POBYT_STALY",
    isIndefinite: true,
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Pobyt stały (art.201) — bezterminowo, OD",
  }),

  // Rezydent UE (art.211/218) — indefinite + OD
  "211": () => ({
    primaryType: "OD_REZYDENT_UE",
    isIndefinite: true,
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Rezydent długoterminowy UE (art.211) — bezterminowo, OD",
  }),
  "218": () => ({
    primaryType: "OD_REZYDENT_UE",
    isIndefinite: true,
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Rezydent długoterminowy UE (art.218) — bezterminowo, OD",
  }),
};

// ============================================================================
// Main classifier
// ============================================================================

/**
 * Classify a document based on its sentencja text.
 * Returns classification with primary/secondary types and extraction rules.
 *
 * NOTE: For TRC rodzinne/studia — classifier also reads UZASADNIENIE section
 * (caller should pass full text, not just sentencja, if available).
 */
export function classifyDocument(sentencja: string, filenameHint?: string): DocumentClassification {
  const s = sentencja;

  // --- A3. Detect Wojewoda Wielkopolski — flag dates as needing manual completion ---
  const isWielkopolski = /[Ww]ojewod(?:a|y)\s+[Ww]ielkopolski/i.test(s);

  // --- 1. Odwołanie (appeal) ---
  if (/odwo[łl]anie\s+od\s+decyzji|za[żz]alenie|procedura\s+odwo[łl]awcz/i.test(s)) {
    return { primaryType: "ODWOLANIE", label: "Odwołanie" };
  }

  // --- 2. Status uchodźcy (refugee, art.13 ustawy o udzielaniu cudzoziemcom ochrony) ---
  if (/status(?:u)?\s+uchod[źz]c/i.test(s) || /art\.?\s*13\s+ustawy\s+.*ochroni/i.test(s)) {
    // Check for partial decision: "odmówić statusu uchodźcy" + "udzielić ochrony uzupełniającej"
    if (/odmówi[ćc].*status.*uchod[źz]c/i.test(s) && /udzi[eę]li[ćc].*ochrony\s+uzupe[łl]niaj/i.test(s)) {
      return {
        primaryType: "OD_OCHRONA_UZUP",
        isIndefinite: true,
        dateSource: "issue_date",
        updatesResidence: true,
        decisionOutcome: "POSITIVE",
        label: "Ochrona uzupełniająca (art.15+19) — pozytywna, bezterminowo, OD",
      };
    }
    return {
      primaryType: "OD_UCHODZCA",
      isIndefinite: true,
      dateSource: "issue_date",
      updatesResidence: true,
      label: "Status uchodźcy (art.13) — bezterminowo, OD",
    };
  }

  // --- 3. Ochrona uzupełniająca (subsidiary protection, art.15+19) ---
  if (/ochrony?\s+uzupe[łl]niaj/i.test(s) && /art\.?\s*(?:15|19)/i.test(s)) {
    return {
      primaryType: "OD_OCHRONA_UZUP",
      isIndefinite: true,
      dateSource: "issue_date",
      updatesResidence: true,
      decisionOutcome: "POSITIVE",
      label: "Ochrona uzupełniająca (art.15+19) — bezterminowo, OD",
    };
  }

  // --- 4. PSZ-OPPC / PSZ-OPWP (oświadczenie) ---
  if (/PSZ[\s-]*OP[WP]C|PSZ[\s-]*OPWP|PSZ[\s-]*ZOPP|o[śs]wiadczenie\s+podmiotu\s+.*powierzeni/i.test(s)) {
    return {
      primaryType: "OSWIADCZENIE",
      dateSource: "annotation",
      label: "Oświadczenie podmiotu (PSZ-OPPC)",
    };
  }

  // --- 5. Powiadomienie UA (PSZ-PPWPU) ---
  // ZMIANA v1.2: tworzy TYLKO podstawę ZATRUDNIENIA, BEZ auto-pobytowej
  if (/powiadomi\w*\s+o\s+powierzeni|zg[lł]oszeni\w*\s+(?:o\s+)?powierzeni|powiadomienie\s+PUP|PSZ[\s-]*PPWPU/i.test(s)) {
    return {
      primaryType: "POWIADOMIENIE_UA",
      dateSource: "issue_date",
      // v1.2: USUNIĘTO setsUkrProtection — powiadomienie NIE tworzy podstawy pobytowej
      label: "Powiadomienie UA (PSZ-PPWPU) — tylko zatrudnienie",
    };
  }

  // --- 6. Extract article number for TRC/pobyt decisions ---
  const artMatch = s.match(/art(?:yku[łl])?\.\s*(\d+)/i);
  const articleNum = artMatch ? artMatch[1] : null;

  // --- 7. Blue Card (art.127 or keywords) ---
  if (/niebieska\s+karta|blue\s+card|wysoki(?:ch|e)\s+kwalifikacj|art\.?\s*127/i.test(s)) {
    const result = ARTICLE_MAP["127"](s);
    if (isWielkopolski) result.dataOdManualFlag = true;
    return result;
  }

  // --- 8. Pobyt stały / rezydent UE ---
  if (/pobyt(?:u)?\s+sta[łl]e(?:go)?|art\.?\s*(?:195|201)/i.test(s)) {
    const result = ARTICLE_MAP["195"](s);
    if (isWielkopolski) result.dataOdManualFlag = true;
    return result;
  }
  if (/rezydent\w*\s+d[łl]ugoterminow|art\.?\s*(?:211|218)/i.test(s)) {
    const result = ARTICLE_MAP["211"](s);
    if (isWielkopolski) result.dataOdManualFlag = true;
    return result;
  }

  // --- 9. TRC decisions (by article if available) ---
  if (articleNum && ARTICLE_MAP[articleNum]) {
    const classifier = ARTICLE_MAP[articleNum];
    const result = classifier(s);
    if (isWielkopolski) result.dataOdManualFlag = true;
    return result;
  }

  // --- 10. TRC by keywords (no article number found) ---
  // v1.2: Also read UZASADNIENIE for family/study purpose detection (B9)
  if (/kart[aęy]\s+pobytu|zezwoleni[eao]\s+na\s+pobyt\s+czasow|udzi[eę]l\w+\s+zezwoleni\w+\s+na\s+pobyt/i.test(s)) {
    // Try to determine subtype from keywords (sentencja + uzasadnienie)
    if (/studi[aóo]w|kszta[łl]ceni|student/i.test(s)) {
      const result = ARTICLE_MAP["144"](s);
      if (isWielkopolski) result.dataOdManualFlag = true;
      return result;
    }
    if (/ma[łl][żz]on\w*\s+(?:obywatel\w*\s+)?(?:polsk|RP|Rzeczypospolit)/i.test(s)
      || /zwi[aą]z(?:ek|ku)\s+ma[łl][żz]e[ńn]ski\w*\s+z\s+obywatel/i.test(s)) {
      const result = ARTICLE_MAP["158"](s);
      if (isWielkopolski) result.dataOdManualFlag = true;
      return result;
    }
    if (/rodzin|po[łl][aą]czeni\w*\s+(?:si[ęe]\s+)?z\s+rodzin|cz[łl]on\w*\s+rodzin/i.test(s)) {
      const result = ARTICLE_MAP["159"](s);
      if (isWielkopolski) result.dataOdManualFlag = true;
      return result;
    }
    if (/humanitarn/i.test(s)) {
      const result = ARTICLE_MAP["186"](s);
      if (isWielkopolski) result.dataOdManualFlag = true;
      return result;
    }
    if (/wysoki(?:ch|e)\s+kwalifikacj/i.test(s)) {
      const result = ARTICLE_MAP["127"](s);
      if (isWielkopolski) result.dataOdManualFlag = true;
      return result;
    }
    if (/absolwent/i.test(s)) {
      // TRC absolwent — dual base (A1)
      const result: DocumentClassification = {
        primaryType: "TRC_ABSOLWENT",
        secondaryType: "OD_ABSOLWENT",
        dateSource: "issue_date",
        updatesResidence: true,
        label: "TRC absolwent — OD status absolwenta",
      };
      if (isWielkopolski) result.dataOdManualFlag = true;
      return result;
    }
    // Check if it includes work clause → TRC+praca
    if (/na\s+rzecz|podmiot|stanowisk|wynagrodzeni/i.test(s)) {
      const result = ARTICLE_MAP["114"](s);
      if (isWielkopolski) result.dataOdManualFlag = true;
      return result;
    }
    // Default TRC
    const result: DocumentClassification = {
      primaryType: "KARTA_POBYTU",
      dateSource: "issue_date",
      updatesResidence: true,
      label: "Decyzja TRC (typ nieustalony)",
    };
    if (isWielkopolski) result.dataOdManualFlag = true;
    return result;
  }

  // --- 11. Zaświadczenie o zarejestrowaniu pobytu obywatela UE ---
  if (/zarejestrowani\w*\s+pobytu\s+obywatel/i.test(s) || /dyrektywa?\s+2004\/38/i.test(s)) {
    // UK withdrawal agreement (art. 50 TUE + art. 18 ust. 4 Umowy Wystąpienia)
    if (/art\.?\s*50\s+TUE|umow[aey]\s+wyst[aą]pieni/i.test(s)) {
      return {
        primaryType: "OD_UK_WYSTAPIENIE",
        secondaryType: "OD_UK_WYSTAPIENIE", // also employment OD
        dateSource: "issue_date",
        updatesResidence: true,
        label: "Umowa wystąpienia (UK) — OD",
      };
    }
    // Standard EU/EEA/CH citizen
    return {
      primaryType: "OD_UE",
      isIndefinite: true, // EU registration = indefinite
      dateSource: "issue_date",
      updatesResidence: true,
      label: "Obywatel UE/EOG/CH — bezterminowo, OD",
    };
  }

  // --- 12. Wiza ---
  if (/wiz[aęy]\s+(?:krajow|schengeno|typu|nr)|decyzj\w+\s+wizow/i.test(s)) {
    return {
      primaryType: "WIZA",
      dateSource: "issue_date",
      label: "Wiza",
    };
  }

  // --- 13. Zezwolenie na pracę (art.6 ustawy 20.03.2025) ---
  if (/zezwoleni[eao]\s+na\s+prac[ęe]/i.test(s)) {
    // Check for absolwent clause (art.3/5/2 → OD_ABSOLWENT secondary)
    const hasAbsolwent = /art\.?\s*3\s+ust\.?\s*5\s+pkt\.?\s*2/i.test(s);
    return {
      primaryType: "ZEZWOLENIE_A",
      secondaryType: hasAbsolwent ? "OD_ABSOLWENT" : undefined,
      dateSource: "od_do_clause",
      label: "Zezwolenie na pracę typ A",
    };
  }

  // --- 14. Karta pobytu (blankiet/skan) ---
  // v1.2: Karta tworzy podstawę pobytową SAMODZIELNIE, bez decyzji
  if (/karta\s+pobytu/i.test(filenameHint ?? "") && !/decyzj/i.test(filenameHint ?? "")) {
    // B7: Check for CUKR (previous temporary protection holder)
    if (/poprzednio\s+posiadacz\w*\s+ochrony\s+czasowej|CUKR/i.test(s) || /CUKR/i.test(filenameHint ?? "")) {
      return {
        primaryType: "POBYT_CUKR",
        updatesResidence: true,
        label: "Karta pobytu — Pobyt CUKR (poprzednio ochrona czasowa)",
      };
    }
    return {
      primaryType: "KARTA_POBYTU",
      updatesResidence: true,
      label: "Karta pobytu (blankiet — podstawa pobytowa)",
    };
  }

  // --- 15. Art.22 specustawy UA — klauzula w decyzji TRC ---
  if (/art\.?\s*22\s+ust/i.test(s) && /pomoc\w*\s+.*ukrai/i.test(s)) {
    return {
      primaryType: "KARTA_POBYTU",
      dateSource: "issue_date",
      updatesResidence: true,
      // v1.2: NIE tworzy auto-pobytowej, klauzula mówi o pracy na powiadomieniach
      label: "TRC art.22 specustawy UA (praca na powiadomieniach)",
    };
  }

  // --- Fallback ---
  return { primaryType: "UNKNOWN", label: "Nierozpoznany typ dokumentu" };
}

// ============================================================================
// Date extraction helpers
// ============================================================================

/**
 * Extract "od dnia DD.MM.RRRR do dnia DD.MM.RRRR" from work permit od-do clause.
 * Used when dateSource === "od_do_clause".
 * B5: For Zezwolenie typ A, this is the CORRECT source of dates (not issue date).
 */
export function extractOdDoClause(sentencja: string): { dataOd?: string; dataDo?: string } {
  const m = sentencja.match(/(?:od\s+dnia|na\s+okres\s+od)\s+(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\s*(?:r\.?)?\s*do\s+(?:dnia\s+)?(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i);
  if (!m) return {};
  const [, d1, m1, y1, d2, m2, y2] = m;
  return {
    dataOd: `${y1}-${m1.padStart(2, "0")}-${d1.padStart(2, "0")}`,
    dataDo: `${y2}-${m2.padStart(2, "0")}-${d2.padStart(2, "0")}`,
  };
}

/**
 * Extract period from PSZ-OPPC annotation: "wpisano do ewidencji ... w okresie Od DD.MM.RRRR Do DD.MM.RRRR".
 * Used when dateSource === "annotation".
 */
export function extractAnnotationDates(text: string): { dataOd?: string; dataDo?: string } {
  const m = text.match(/w\s+okresie\s+od\s+(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\s+do\s+(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i);
  if (!m) return {};
  const [, d1, m1, y1, d2, m2, y2] = m;
  return {
    dataOd: `${y1}-${m1.padStart(2, "0")}-${d1.padStart(2, "0")}`,
    dataDo: `${y2}-${m2.padStart(2, "0")}-${d2.padStart(2, "0")}`,
  };
}

/**
 * Extract PZC-format oświadczenie number (not GUID).
 * Format: PZC.####.#####.XX.RRRR or OP.G.####.#####.XX.RRRR
 */
export function extractPzcNumber(text: string): string | null {
  const m = text.match(/(?:PZC|OP\.G)[.\s]*\d{4}[.\s]*\d+[.\s]*\w*[.\s]*\d{4}/);
  return m ? m[0].trim() : null;
}

/**
 * Extract work permit number: "(typu A) nr XXXXX/RRRR" (B5: this is the permit number).
 * WRP-... is the sygnatura, NOT the permit number.
 */
export function extractWorkPermitNumber(text: string): { nrZezwolenia?: string; sygnatura?: string } {
  // B5: "(typu A) nr 26031/2026" → numer zezwolenia
  const nrMatch = text.match(/\(typu\s+[A-E]\)\s+nr\s+(\d+\/\d{4})/i);
  // WRP-... is the sygnatura
  const wrpMatch = text.match(/(WRP[\w-]*[.\s]*\d{4}[.\s]*\d+[.\s/]*[\w]*)/);
  return {
    nrZezwolenia: nrMatch ? nrMatch[1] : undefined,
    sygnatura: wrpMatch ? wrpMatch[0].trim() : undefined,
  };
}
