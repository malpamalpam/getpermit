/**
 * Document classifier for Polish immigration documents.
 * Single source of truth for 13 document types per department instructions v1.1.
 *
 * Determines:
 * - Primary base type (residence or employment)
 * - Secondary base type (when document creates two bases)
 * - Whether document is indefinite (no dataDo)
 * - Date extraction source (issue date, od-do clause, or annotation)
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
}

// ============================================================================
// Article → type mapping (table C from instructions)
// ============================================================================

const ARTICLE_MAP: Record<string, (sentencja: string) => DocumentClassification> = {
  // TRC + work (art.114)
  "114": () => ({
    primaryType: "TRC_FDK",
    secondaryType: "ZEZWOLENIE_A",
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Decyzja TRC+praca (art.114)",
  }),

  // Blue Card (art.127)
  "127": () => ({
    primaryType: "TRC_BLUE_CARD",
    secondaryType: "ZEZWOLENIE_A",
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Blue Card (art.127)",
  }),

  // TRC studia (art.144)
  "144": () => ({
    primaryType: "TRC_STUDIA",
    secondaryType: "OD_STUDENT",
    dateSource: "issue_date",
    updatesResidence: true,
    label: "TRC studia (art.144)",
  }),

  // TRC małżonek PL (art.158)
  "158": () => ({
    primaryType: "TRC_MALZONEK_PL",
    secondaryType: "OD_POBYT_STALY", // OD for spouse
    dateSource: "issue_date",
    updatesResidence: true,
    label: "TRC małżonek PL (art.158)",
  }),

  // TRC rodzina (art.159)
  "159": () => ({
    primaryType: "TRC_POBYT_Z_CUDZ",
    secondaryType: "OD_POBYT_STALY", // OD for family
    dateSource: "issue_date",
    updatesResidence: true,
    label: "TRC rodzina (art.159)",
  }),

  // TRC humanitarne (art.186/1/9)
  "186": (sentencja: string) => {
    // art.186/1/9 = humanitarian + OD
    // art.186/1/6 = other circumstances + OD (decision 30.09.2026)
    // other art.186, art.187 = other circumstances without OD
    if (/186\s*(?:ust\.?\s*1\s*)?(?:pkt\.?\s*)?9/i.test(sentencja) || /humanitarn/i.test(sentencja)) {
      return {
        primaryType: "TRC_HUMANITARNE",
        secondaryType: "OD_OCHRONA_UZUP",
        dateSource: "issue_date",
        updatesResidence: true,
        label: "TRC humanitarne (art.186/1/9)",
      };
    }
    if (/186\s*(?:ust\.?\s*1\s*)?(?:pkt\.?\s*)?6/i.test(sentencja)) {
      return {
        primaryType: "TRC_FDK", // "inne okoliczności"
        secondaryType: "OD_POBYT_STALY", // OD per decision 30.09.2026
        dateSource: "issue_date",
        updatesResidence: true,
        label: "TRC inne okoliczności (art.186/1/6)+OD",
      };
    }
    // Other art.186 / art.187 = inne okoliczności without OD
    return {
      primaryType: "TRC_FDK",
      dateSource: "issue_date",
      updatesResidence: true,
      label: "TRC inne okoliczności (art.186/187)",
    };
  },

  "187": () => ({
    primaryType: "TRC_FDK",
    dateSource: "issue_date",
    updatesResidence: true,
    label: "TRC inne okoliczności (art.187)",
  }),

  // Pobyt stały (art.195/201)
  "195": () => ({
    primaryType: "OD_POBYT_STALY",
    isIndefinite: true,
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Pobyt stały (art.195)",
  }),
  "201": () => ({
    primaryType: "OD_POBYT_STALY",
    isIndefinite: true,
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Pobyt stały (art.201)",
  }),

  // Rezydent UE (art.211/218)
  "211": () => ({
    primaryType: "OD_REZYDENT_UE",
    isIndefinite: true,
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Rezydent długoterminowy UE (art.211)",
  }),
  "218": () => ({
    primaryType: "OD_REZYDENT_UE",
    isIndefinite: true,
    dateSource: "issue_date",
    updatesResidence: true,
    label: "Rezydent długoterminowy UE (art.218)",
  }),
};

// ============================================================================
// Main classifier
// ============================================================================

/**
 * Classify a document based on its sentencja text.
 * Returns classification with primary/secondary types and extraction rules.
 */
export function classifyDocument(sentencja: string, filenameHint?: string): DocumentClassification {
  const s = sentencja;
  const sLower = s.toLowerCase();

  // --- 1. Odwołanie (appeal) ---
  if (/odwo[łl]anie\s+od\s+decyzji|za[żz]alenie|procedura\s+odwo[łl]awcz/i.test(s)) {
    return { primaryType: "ODWOLANIE", label: "Odwołanie" };
  }

  // --- 2. Status uchodźcy (refugee) ---
  if (/status(?:u)?\s+uchod[źz]c/i.test(s) || /art\.?\s*13\s+ustawy\s+.*ochroni/i.test(s)) {
    // Check for partial decision: "odmówić statusu uchodźcy" + "udzielić ochrony uzupełniającej"
    if (/odmówi[ćc].*status.*uchod[źz]c/i.test(s) && /udzi[eę]li[ćc].*ochrony\s+uzupe[łl]niaj/i.test(s)) {
      return {
        primaryType: "OD_OCHRONA_UZUP",
        isIndefinite: true,
        dateSource: "issue_date",
        updatesResidence: true,
        decisionOutcome: "POSITIVE",
        label: "Ochrona uzupełniająca (art.15+19) — pozytywna",
      };
    }
    return {
      primaryType: "OD_UCHODZCA",
      isIndefinite: true,
      dateSource: "issue_date",
      updatesResidence: true,
      label: "Status uchodźcy (art.13)",
    };
  }

  // --- 3. Ochrona uzupełniająca (subsidiary protection) ---
  if (/ochrony?\s+uzupe[łl]niaj/i.test(s) && /art\.?\s*(?:15|19)/i.test(s)) {
    return {
      primaryType: "OD_OCHRONA_UZUP",
      isIndefinite: true,
      dateSource: "issue_date",
      updatesResidence: true,
      decisionOutcome: "POSITIVE",
      label: "Ochrona uzupełniająca (art.15+19)",
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
  if (/powiadomi\w*\s+o\s+powierzeni|zg[lł]oszeni\w*\s+(?:o\s+)?powierzeni|powiadomienie\s+PUP|PSZ[\s-]*PPWPU/i.test(s)) {
    return {
      primaryType: "POWIADOMIENIE_UA",
      dateSource: "issue_date",
      setsUkrProtection: true,
      label: "Powiadomienie UA (PSZ-PPWPU)",
    };
  }

  // --- 6. Extract article number for TRC/pobyt decisions ---
  const artMatch = s.match(/art(?:yku[łl])?\.\s*(\d+)/i);
  const articleNum = artMatch ? artMatch[1] : null;

  // --- 7. Blue Card (art.127 or keywords) ---
  if (/niebieska\s+karta|blue\s+card|wysoki(?:ch|e)\s+kwalifikacj|art\.?\s*127/i.test(s)) {
    return ARTICLE_MAP["127"](s);
  }

  // --- 8. Pobyt stały / rezydent UE ---
  if (/pobyt(?:u)?\s+sta[łl]e(?:go)?|art\.?\s*(?:195|201)/i.test(s)) {
    return ARTICLE_MAP["195"](s);
  }
  if (/rezydent\w*\s+d[łl]ugoterminow|art\.?\s*(?:211|218)/i.test(s)) {
    return ARTICLE_MAP["211"](s);
  }

  // --- 9. TRC decisions (by article if available) ---
  if (articleNum && ARTICLE_MAP[articleNum]) {
    const classifier = ARTICLE_MAP[articleNum];
    return classifier(s);
  }

  // --- 10. TRC by keywords (no article number found) ---
  if (/kart[aęy]\s+pobytu|zezwoleni[eao]\s+na\s+pobyt\s+czasow|udzi[eę]l\w+\s+zezwoleni\w+\s+na\s+pobyt/i.test(s)) {
    // Try to determine subtype from keywords
    if (/studi[aóo]w|kszta[łl]ceni|student/i.test(s)) {
      return ARTICLE_MAP["144"](s);
    }
    if (/ma[łl][żz]on/i.test(s)) {
      return ARTICLE_MAP["158"](s);
    }
    if (/rodzin|po[łl][aą]czeni\w*\s+z\s+rodzin/i.test(s)) {
      return ARTICLE_MAP["159"](s);
    }
    if (/humanitarn/i.test(s)) {
      return ARTICLE_MAP["186"](s);
    }
    if (/wysoki(?:ch|e)\s+kwalifikacj/i.test(s)) {
      return ARTICLE_MAP["127"](s);
    }
    // Check if it includes work clause → TRC+praca
    if (/na\s+rzecz|podmiot|stanowisk|wynagrodzeni/i.test(s)) {
      return ARTICLE_MAP["114"](s);
    }
    // Default TRC
    return {
      primaryType: "KARTA_POBYTU",
      dateSource: "issue_date",
      updatesResidence: true,
      label: "Decyzja TRC (typ nieustalony)",
    };
  }

  // --- 11. Zaświadczenie o zarejestrowaniu pobytu obywatela UE ---
  if (/zarejestrowani\w*\s+pobytu\s+obywatel/i.test(s) || /dyrektywa?\s+2004\/38/i.test(s)) {
    // UK withdrawal agreement
    if (/art\.?\s*50\s+TUE|umow[aey]\s+wyst[aą]pieni/i.test(s)) {
      return {
        primaryType: "OD_UK_WYSTAPIENIE",
        dateSource: "issue_date",
        updatesResidence: true,
        label: "Umowa wystąpienia (UK)",
      };
    }
    return {
      primaryType: "OD_UE",
      dateSource: "issue_date",
      updatesResidence: true,
      label: "Obywatel UE/EOG/CH",
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
    // Check for absolute clause (art.3/5/2 = absolwent)
    const hasAbsolwent = /art\.?\s*3\s+ust\.?\s*5\s+pkt\.?\s*2/i.test(s);
    return {
      primaryType: "ZEZWOLENIE_A",
      secondaryType: hasAbsolwent ? "OD_ABSOLWENT" : undefined,
      dateSource: "od_do_clause",
      label: "Zezwolenie na pracę typ A",
    };
  }

  // --- 14. Karta pobytu (blankiet) ---
  if (/karta\s+pobytu/i.test(filenameHint ?? "") && !/decyzj/i.test(filenameHint ?? "")) {
    return {
      primaryType: "KARTA_POBYTU_BLANKIET",
      updatesResidence: true,
      label: "Karta pobytu (blankiet — aktualizacja)",
    };
  }

  // --- 15. Art.22 specustawy UA ---
  if (/art\.?\s*22\s+ust/i.test(s) && /pomoc\w*\s+.*ukrai/i.test(s)) {
    return {
      primaryType: "KARTA_POBYTU",
      dateSource: "issue_date",
      updatesResidence: true,
      setsUkrProtection: true,
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
 * Extract work permit number: "nr XXXXX/RRRR" + WRP sygnatura.
 */
export function extractWorkPermitNumber(text: string): string | null {
  const m = text.match(/nr\s+(\d+\/\d{4})/i);
  if (m) return m[1];
  const wrp = text.match(/WRP[\w-]*[.\s]*\d{4}[.\s]*\d+[.\s/]*[\w]*/);
  return wrp ? wrp[0].trim() : null;
}
