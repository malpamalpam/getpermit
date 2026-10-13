/**
 * Document classifier for Polish immigration documents.
 * v2 — based on Reguły mapowania (10.2026) + Instrukcja "Zescrapuj dane" 1.2
 *
 * Uses config from legalizacja-config.ts (single source of truth for rules).
 *
 * Pipeline: content analysis → article extraction → type resolution → dual-base mapping.
 *
 * Key principles (section 3.1):
 * 1. Type from CONTENT, not filename (filename = hint + consistency check)
 * 2. Sentencja first, then type (positive vs negative decision)
 * 3. Article has priority over keywords
 * 4. No default type — unrecognized → "do weryfikacji"
 * 5. Multi-document files: recognize each separately
 */

import {
  CONFIG,
  extractArticle,
  resolveArticleMapping,
  matchKeywords,
  isPositiveDecision,
  isNegativeDecision,
  isChangeDecision,
  isFdkEmployer,
  isIndefiniteType,
  isRegulyMapowania,
  type ArticleMapping,
} from "./legalizacja-config";

// ============================================================================
// Types
// ============================================================================

export interface DocumentClassification {
  /** Primary base type (residence) */
  primaryType: string;
  /** Secondary base type (employment, when document creates both) */
  secondaryType?: string;
  /** Residence basis type (new v2 — maps to FdkResidenceBasis) */
  residenceType?: string;
  /** Employment basis type (new v2 — maps to FdkEmploymentBase) */
  employmentType?: string | null;
  /** Extracted article number from sentencja */
  article?: string;
  /** Decision outcome */
  decisionOutcome?: "POSITIVE" | "NEGATIVE" | "CHANGE" | "DISCONTINUED";
  /** No dataDo, status AKTYWNE */
  isIndefinite?: boolean;
  /** Which dates to extract */
  dateSource?: "issue_date" | "od_do_clause" | "annotation" | "sentencja";
  /** Human-readable description */
  label?: string;
  /** Whether to update foreigner.decyzjaPobytowaDo */
  updatesResidence?: boolean;
  /** Whether to set foreigner.ochronaCzasowaUkr */
  setsUkrProtection?: boolean;
  /** Flag: dataOd requires manual completion (e.g. Wojewoda Wielkopolski) */
  dataOdManualFlag?: boolean;
  /** Flags for verification queue */
  flags?: string[];
  /** Confidence score (0-1) */
  confidence?: number;
}

// ============================================================================
// Sentencja extraction helper
// ============================================================================

/**
 * Extract sentencja text from a full decision document.
 * Sentencja = text between "udzielam/zezwala się/orzekam/postanawiam" and "Uzasadnienie" or "Pouczenie".
 */
export function extractSentencja(fullText: string): string {
  const lower = fullText.toLowerCase();

  // Find sentencja start
  const startPatterns = [
    /postanawiam\b/i, /orzekam\b/i, /udzielam\b/i, /udziela\s+si[ęe]/i,
    /zezwala\s+si[ęe]/i, /odmawiam\b/i, /odmawia\s+si[ęe]/i,
    /umarza\s+si[ęe]/i, /umarzam\b/i, /cofa\s+si[ęe]/i, /cofam\b/i,
    /nadaje\s+si[ęe]/i, /zmieniam\b/i,
  ];

  let startIdx = -1;
  for (const pat of startPatterns) {
    const m = fullText.match(pat);
    if (m && m.index !== undefined) {
      if (startIdx === -1 || m.index < startIdx) {
        startIdx = m.index;
      }
    }
  }

  if (startIdx === -1) return fullText; // No sentencja markers — use full text

  // Find sentencja end
  const endPatterns = [/\bUzasadnienie\b/i, /\bPouczenie\b/i, /\bUZASADNIENIE\b/];
  let endIdx = fullText.length;
  for (const pat of endPatterns) {
    const afterStart = fullText.substring(startIdx);
    const m = afterStart.match(pat);
    if (m && m.index !== undefined) {
      const idx = startIdx + m.index;
      if (idx < endIdx && idx > startIdx + 20) { // At least 20 chars of sentencja
        endIdx = idx;
      }
    }
  }

  return fullText.substring(startIdx, endIdx);
}

// ============================================================================
// Main classifier (v2)
// ============================================================================

/**
 * Classify a document based on its full text content.
 * Returns classification with residence + employment types.
 *
 * Pipeline:
 * 1. Check for negative decision (odmowa/umorzenie/cofnięcie)
 * 2. Check for change decision (art. 120)
 * 3. Extract article from sentencja
 * 4. Resolve via article map
 * 5. Fallback to keywords
 * 6. Apply toggles
 */
export function classifyDocument(fullText: string, filenameHint?: string): DocumentClassification {
  const sentencja = extractSentencja(fullText);
  const s = sentencja;
  const lower = fullText.toLowerCase();

  // --- Detect Wojewoda Wielkopolski — flag dates as needing manual completion ---
  const isWielkopolski = /[Ww]ojewod(?:a|y)\s+[Ww]ielkopolski/i.test(fullText);

  // --- 0. Appeal (odwołanie) ---
  if (/odwo[łl]anie\s+od\s+decyzji|za[żz]alenie|procedura\s+odwo[łl]awcz/i.test(s)
    && !isPositiveDecision(s)) {
    return { primaryType: "ODWOLANIE", label: "Odwołanie", confidence: 0.9 };
  }

  // --- 1. Negative decision (odmowa / umorzenie / cofnięcie) ---
  if (isNegativeDecision(s) && !isPositiveDecision(s)) {
    return {
      primaryType: "ODMOWA",
      decisionOutcome: "NEGATIVE",
      label: "Decyzja odmowna / umorzenie / cofnięcie",
      flags: ["alert_krytyczny_utrata_legalnosci"],
      confidence: 0.95,
    };
  }

  // --- 2. Change decision (art. 120) ---
  if (isChangeDecision(s)) {
    return {
      primaryType: "ZMIANA_DECYZJI",
      decisionOutcome: "CHANGE",
      label: "Decyzja zmieniająca (art. 120)",
      flags: ["decyzja_zmienajaca"],
      confidence: 0.9,
    };
  }

  // --- 3. Status uchodźcy + ochrona uzupełniająca (special: dual-decision) ---
  if (/status(?:u)?\s+uchod[źz]c/i.test(s) || /art\.?\s*13\s+ustawy\s+.*ochron/i.test(s)) {
    // Check for partial: "odmówić statusu uchodźcy" + "udzielić ochrony uzupełniającej"
    if (/odmówi[ćc].*status.*uchod[źz]c/i.test(s) && /udzi[eę]li[ćc].*ochrony\s+uzupe[łl]niaj/i.test(s)) {
      return buildResult({
        residence: "OCHRONA_UZUPELNIAJACA",
        employment: "OCHRONA_UZUPELNIAJACA",
        indefinite: true,
        date_source: "issue_date",
      }, "Ochrona uzupełniająca (odmowa uchodźcy + ochrona) — bezterminowo", "POSITIVE", isWielkopolski);
    }
    return buildResult({
      residence: "STATUS_UCHODZCY",
      employment: "STATUS_UCHODZCY",
      indefinite: true,
      date_source: "issue_date",
    }, "Status uchodźcy — bezterminowo", "POSITIVE", isWielkopolski);
  }

  // --- 4. Ochrona uzupełniająca standalone ---
  if (/ochrony?\s+uzupe[łl]niaj/i.test(s) && /art\.?\s*(?:15|19)/i.test(s)) {
    return buildResult({
      residence: "OCHRONA_UZUPELNIAJACA",
      employment: "OCHRONA_UZUPELNIAJACA",
      indefinite: true,
      date_source: "issue_date",
    }, "Ochrona uzupełniająca — bezterminowo", "POSITIVE", isWielkopolski);
  }

  // --- 5. Oświadczenie (PSZ-OPPC / PSZ-OPWP) ---
  if (/PSZ[\s-]*OP[WP]C|PSZ[\s-]*OPWP|PSZ[\s-]*ZOPP|o[śs]wiadczenie\s+podmiotu\s+.*powierzeni/i.test(lower)) {
    return {
      primaryType: "OSWIADCZENIE",
      employmentType: "OSWIADCZENIE",
      dateSource: "annotation",
      label: "Oświadczenie podmiotu (PSZ-OPPC/OPWP)",
      confidence: 0.95,
    };
  }
  // Older form without PSZ code
  if (/o[śs]wiadczenie\s+podmiotu\s+powierzaj[aą]cego/i.test(lower)) {
    return {
      primaryType: "OSWIADCZENIE",
      employmentType: "OSWIADCZENIE",
      dateSource: "annotation",
      label: "Oświadczenie podmiotu (starszy wzór)",
      confidence: 0.85,
    };
  }

  // --- 6. Powiadomienie UA (PSZ-PPWPU) ---
  if (/powiadomi\w*\s+o\s+powierzeni|zg[lł]oszeni\w*\s+(?:o\s+)?powierzeni|powiadomienie\s+PUP|PSZ[\s-]*PPWPU/i.test(lower)) {
    return {
      primaryType: "POWIADOMIENIE_UA",
      employmentType: "POWIADOMIENIE_UA",
      dateSource: "issue_date",
      label: "Powiadomienie UA (PSZ-PPWPU) — tylko zatrudnienie",
      confidence: 0.95,
    };
  }

  // --- 7. Extract article for TRC / pobyt decisions (BEFORE keyword fallbacks — rule 3.1.9) ---
  // Search full text (article is in "Na podstawie art. X" header, before sentencja)
  const articleKey = extractArticle(fullText);
  if (articleKey) {
    const mapping = resolveArticleMapping(articleKey, sentencja);
    if (mapping) {
      if (mapping.is_change_decision) {
        return {
          primaryType: "ZMIANA_DECYZJI",
          article: articleKey,
          decisionOutcome: "CHANGE",
          label: "Decyzja zmieniająca (art. 120)",
          flags: ["decyzja_zmienajaca"],
          confidence: 0.9,
        };
      }
      return buildResult(mapping, `Decyzja wg art. ${articleKey}`, "POSITIVE", isWielkopolski, articleKey);
    }
  }

  // --- 8. Zaświadczenie PESEL UKR ---
  if (/pesel.*ukr|ukr.*pesel|ochrona\s+czasowa|adnotacj[aą]\s+ukr/i.test(lower)) {
    const dataDo = isRegulyMapowania("pesel_ukr") ? "2027-03-04" : undefined;
    return {
      primaryType: "PESEL_UKR",
      residenceType: "PESEL_UKR",
      isIndefinite: !dataDo,
      setsUkrProtection: true,
      dateSource: "issue_date",
      label: `PESEL UKR — ochrona czasowa${dataDo ? ` do ${dataDo}` : ""}`,
      confidence: 0.9,
    };
  }

  // --- 9. Obywatel UE / UK Withdrawal ---
  if (/zarejestrowani\w*\s+pobytu\s+obywatel/i.test(lower) || /dyrektywa?\s+2004\/38/i.test(lower)) {
    // UK withdrawal
    if (/art\.?\s*50\s+TUE|umow[aey]\s+wyst[aą]pieni/i.test(fullText)
      || /art\.?\s*18\s+ust\.?\s*4.*umow/i.test(fullText)) {
      return buildResult({
        residence: "UMOWA_WYSTAPIENIA",
        employment: "UMOWA_WYSTAPIENIA",
        date_source: "issue_date",
      }, "Umowa wystąpienia (UK)", "POSITIVE", isWielkopolski);
    }
    // Standard EU
    const isIndefinite = isRegulyMapowania("rejestracja_ue_data");
    return buildResult({
      residence: "OBYWATEL_UE",
      employment: "OBYWATEL_UE",
      indefinite: isIndefinite,
      date_source: "issue_date",
    }, "Obywatel UE/EOG/CH — " + (isIndefinite ? "bezterminowo" : "data z blankietu"), "POSITIVE", isWielkopolski);
  }

  // --- 9a. UK withdrawal agreement independently (can appear without EU registration text) ---
  if (/art\.?\s*50\s+TUE|umow[aey]\s+wyst[aą]pieni/i.test(fullText)) {
    return buildResult({
      residence: "UMOWA_WYSTAPIENIA",
      employment: "UMOWA_WYSTAPIENIA",
      date_source: "issue_date",
    }, "Umowa wystąpienia (UK)", "POSITIVE", isWielkopolski);
  }

  // --- 10. Zgoda na pobyt ze względów humanitarnych (art. 348) ---
  if (/art\.?\s*348/i.test(fullText) || (/zgod[aęy]\s+na\s+pobyt/i.test(lower) && /humanitarn/i.test(lower))) {
    return buildResult({
      residence: "ZGODA_HUMANITARNA",
      employment: "WIZA_HUMANITARNA",
      date_source: "sentencja",
    }, "Zgoda na pobyt humanitarny (art. 348)", "POSITIVE", isWielkopolski);
  }

  // --- 11. Blue Card by keywords (before generic TRC) ---
  if (/niebieska\s+karta|blue\s+card|wysoki(?:ch|e)\s+kwalifikacj/i.test(lower)) {
    return buildResult({
      residence: "TRC_BLUE_CARD",
      employment: "TRC_BLUE_CARD",
      date_source: "sentencja",
    }, "Blue Card (keywords)", "POSITIVE", isWielkopolski, "127");
  }

  // --- 12. Pobyt stały / Rezydent UE by keywords ---
  if (/pobyt(?:u)?\s+sta[łl]e(?:go)?|na\s+osiedlenie\s+si[ęe]/i.test(lower)) {
    return buildResult({
      residence: "POBYT_STALY",
      employment: "POBYT_STALY",
      indefinite: true,
      date_source: "issue_date",
    }, "Pobyt stały (keywords)", "POSITIVE", isWielkopolski, "195");
  }
  if (/rezydent\w*\s+d[łl]ugoterminow/i.test(lower)) {
    return buildResult({
      residence: "REZYDENT_UE",
      employment: "REZYDENT_UE",
      indefinite: true,
      date_source: "issue_date",
    }, "Rezydent UE (keywords)", "POSITIVE", isWielkopolski, "211");
  }

  // --- 13. TRC decisions by keywords ---
  if (/kart[aęy]\s+pobytu|zezwoleni[eao]\s+na\s+pobyt\s+czasow|udzi[eę]l\w+\s+zezwoleni\w+\s+na\s+pobyt/i.test(lower)) {
    const keywordType = matchKeywords(sentencja) ?? matchKeywords(fullText);
    if (keywordType && keywordType !== "TRC_FDK") {
      const mapping = CONFIG.article_map[keywordType] ??
        { residence: keywordType, employment: keywordType, date_source: "sentencja" as const };
      return buildResult(mapping, `TRC — ${keywordType} (keywords)`, "POSITIVE", isWielkopolski);
    }
    // Check for work clause → TRC+praca
    if (/na\s+rzecz|podmiot|stanowisk|wynagrodzeni/i.test(sentencja)) {
      const isFdk = isFdkEmployer(sentencja);
      if (isFdk) {
        return buildResult({
          residence: "TRC_FDK",
          employment: "TRC_FDK",
          date_source: "sentencja",
        }, "TRC — FDK (na rzecz + FDK)", "POSITIVE", isWielkopolski);
      }
      const employment = isRegulyMapowania("trc_inny_pracodawca_zatrudnieniowa")
        ? null : "TRC_INNY_PRACODAWCA";
      return buildResult({
        residence: "TRC_INNY_PRACODAWCA",
        employment,
        date_source: "sentencja",
      }, "TRC — inny pracodawca (keywords)", "POSITIVE", isWielkopolski);
    }
    // Unknown TRC — do NOT default to TRC_FDK (rule 3.1.3)
    return {
      primaryType: "UNKNOWN",
      label: "Decyzja TRC — typ nieustalony, do weryfikacji",
      flags: ["do_weryfikacji", "typ_nieustalony"],
      updatesResidence: true,
      dataOdManualFlag: isWielkopolski,
      confidence: 0.3,
    };
  }

  // --- 14. Wiza ---
  if (/wiz[aęy]\s+(?:krajow|schengeno|typu|nr)|naklejka\s+wizow|VD[A-Z]|VC[A-Z]|\bwiza\b|\bvisa\b/i.test(lower)) {
    const isHumanitarian = /humanitarn|human/i.test(lower);
    const employment = isHumanitarian && isRegulyMapowania("wiza_humanitarna_zatrudnieniowa")
      ? "WIZA_HUMANITARNA" : undefined;
    return {
      primaryType: "WIZA",
      residenceType: "WIZA",
      employmentType: employment,
      dateSource: "issue_date",
      label: isHumanitarian ? "Wiza humanitarna" : "Wiza D/C",
      updatesResidence: true,
      confidence: 0.85,
    };
  }

  // --- 15. Zezwolenie na pracę (typ A) ---
  if (/zezwoleni[eao]\s+na\s+prac[ęe]/i.test(lower) && !/na\s+pobyt/i.test(lower)) {
    return {
      primaryType: "ZEZWOLENIE_A",
      employmentType: "ZEZWOLENIE_A",
      dateSource: "od_do_clause",
      label: "Zezwolenie na pracę typ A",
      confidence: 0.9,
    };
  }

  // --- 16. Karta pobytu (blankiet/skan) ---
  if (/karta\s+pobytu/i.test(filenameHint ?? "") && !/decyzj/i.test(filenameHint ?? "")) {
    if (/CUKR|poprzednio\s*posiadacz\w*\s+ochrony\s+czasowej/i.test(fullText)
      || /CUKR/i.test(filenameHint ?? "")) {
      return {
        primaryType: "POBYT_CUKR",
        residenceType: "POBYT_CUKR",
        updatesResidence: true,
        label: "Karta pobytu — CUKR",
        confidence: 0.9,
      };
    }
    // UK withdrawal card
    if (/art\.?\s*50\s+TUE|umow[aey]\s+wyst[aą]pieni/i.test(fullText)) {
      return buildResult({
        residence: "UMOWA_WYSTAPIENIA",
        employment: "UMOWA_WYSTAPIENIA",
        date_source: "issue_date",
      }, "Karta pobytu — Umowa wystąpienia (UK)", "POSITIVE", false);
    }
    return {
      primaryType: "KARTA_POBYTU",
      residenceType: "KARTA_POBYTU",
      updatesResidence: true,
      label: "Karta pobytu (blankiet) — do weryfikacji, brak decyzji",
      flags: ["do_weryfikacji_brak_decyzji"],
      confidence: 0.5,
    };
  }

  // --- 17. Stempel wjazdu ---
  if (/stempel\s+wjazd|entry\s+stamp/i.test(lower)) {
    return {
      primaryType: "RUCH_BEZWIZOWY",
      residenceType: "RUCH_BEZWIZOWY",
      dateSource: "issue_date",
      label: "Ruch bezwizowy (stempel wjazdu + 90 dni)",
      updatesResidence: true,
      confidence: 0.7,
    };
  }

  // --- 18. Karta Polaka ---
  if (/karta\s+polaka/i.test(lower)) {
    return {
      primaryType: "KARTA_POLAKA",
      employmentType: "KARTA_POLAKA",
      label: "Karta Polaka — tylko zatrudnieniowa",
      confidence: 0.85,
    };
  }

  // --- 19. Stempel / UPO wniosku (pobyt na przedłużeniu) ---
  if (/wniosek\s+o\s+udzieleni[ea].*?zosta[łl]\s+z[łl]o[żz]on|art\.?\s*108\s+ust\.?\s*1/i.test(lower)) {
    return {
      primaryType: "POBYT_NA_PRZEDLUZENIU",
      residenceType: "POBYT_NA_PRZEDLUZENIU",
      dateSource: "issue_date",
      label: "Pobyt na przedłużeniu (stempel/UPO)",
      updatesResidence: true,
      flags: ["do_weryfikacji_zatrudnienie"],
      confidence: 0.7,
    };
  }

  // --- 20. Oświadczenie fallback (broader match) ---
  if ((lower.includes("oświadczenie") || lower.includes("oswiadczenie")) && lower.includes("powierzeniu")) {
    return {
      primaryType: "OSWIADCZENIE",
      employmentType: "OSWIADCZENIE",
      dateSource: "annotation",
      label: "Oświadczenie podmiotu (fallback)",
      confidence: 0.7,
    };
  }

  // --- 21. Karta pobytu from text (not filename) ---
  if (/karta\s+pobytu/i.test(lower) && !(/decyzj/i.test(lower) && isPositiveDecision(fullText))) {
    return {
      primaryType: "KARTA_POBYTU",
      residenceType: "KARTA_POBYTU",
      updatesResidence: true,
      label: "Karta pobytu (z treści) — do weryfikacji",
      flags: ["do_weryfikacji_brak_decyzji"],
      confidence: 0.4,
    };
  }

  // --- 22. Zaświadczenie uczelni (status studenta) ---
  if (/za[śs]wiadczeni\w+.*uczelni|studia\s+stacjonarne|kszta[łl]ci\s+si[ęe]/i.test(lower)
    && !/decyzj/i.test(lower)) {
    return {
      primaryType: "STATUS_STUDENTA",
      employmentType: "STATUS_STUDENTA",
      dateSource: "issue_date",
      label: "Status studenta (zaświadczenie uczelni)",
      confidence: 0.7,
    };
  }

  // --- 23. Dyplom PL (status absolwenta) ---
  if (/dyplom\s+uko[ńn]czenia/i.test(lower) && !/zagranicz/i.test(lower)) {
    return {
      primaryType: "STATUS_ABSOLWENTA",
      employmentType: "STATUS_ABSOLWENTA",
      isIndefinite: true,
      dateSource: "issue_date",
      label: "Status absolwenta (dyplom PL) — bezterminowo",
      confidence: 0.7,
    };
  }

  // --- Fallback: UNKNOWN ---
  return {
    primaryType: "UNKNOWN",
    label: "Nierozpoznany typ dokumentu — do weryfikacji",
    flags: ["do_weryfikacji", "typ_nieustalony"],
    confidence: 0.1,
  };
}

// ============================================================================
// Helper: build result from ArticleMapping
// ============================================================================

function buildResult(
  mapping: ArticleMapping,
  label: string,
  outcome: "POSITIVE" | "NEGATIVE" | "CHANGE",
  isWielkopolski: boolean,
  article?: string,
): DocumentClassification {
  const result: DocumentClassification = {
    primaryType: mapping.residence ?? mapping.employment ?? "UNKNOWN",
    residenceType: mapping.residence ?? undefined,
    employmentType: mapping.employment === null ? null : mapping.employment,
    article,
    decisionOutcome: outcome,
    isIndefinite: mapping.indefinite,
    dateSource: mapping.date_source,
    label,
    updatesResidence: !!mapping.residence,
    flags: mapping.flags ? [...mapping.flags] : undefined,
    confidence: 0.9,
  };

  // Apply toggle for employment type naming
  if (mapping.residence && mapping.employment) {
    // Apply toggle #1: naming for pobyt stały / rezydent / uchodźca / ochrona
    if (["POBYT_STALY", "REZYDENT_UE", "STATUS_UCHODZCY", "OCHRONA_UZUPELNIAJACA"].includes(mapping.employment)) {
      if (!isRegulyMapowania("nazwy_zatrudnieniowe_pobyt_staly")) {
        // Instrukcja 1.2: use OD names
        const odMap: Record<string, string> = {
          POBYT_STALY: "OD_POBYT_STALY",
          REZYDENT_UE: "OD_REZYDENT_UE",
          STATUS_UCHODZCY: "OD_UCHODZCA",
          OCHRONA_UZUPELNIAJACA: "OD_OCHRONA_UZUP",
        };
        result.employmentType = odMap[mapping.employment] ?? mapping.employment;
      }
    }
  }

  // For dual-base types, set secondaryType for backward compatibility
  if (result.residenceType && result.employmentType && result.residenceType !== result.employmentType) {
    result.secondaryType = result.employmentType;
  } else if (result.employmentType && !result.residenceType) {
    result.secondaryType = undefined;
  } else if (result.residenceType && result.employmentType) {
    result.secondaryType = result.employmentType;
  }

  if (isWielkopolski && !result.isIndefinite) {
    result.dataOdManualFlag = true;
  }

  return result;
}

// ============================================================================
// Date extraction helpers (re-exported from v1 for backward compatibility)
// ============================================================================

/**
 * Extract "od dnia DD.MM.RRRR do dnia DD.MM.RRRR" from work permit od-do clause.
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
 * Extract PZC-format oświadczenie number.
 */
export function extractPzcNumber(text: string): string | null {
  const m = text.match(/(?:PZC|OP\.G)[.\s]*\d{4}[.\s]*\d+[.\s]*\w*[.\s]*\d{4}/);
  return m ? m[0].trim() : null;
}

/**
 * Extract work permit number: "(typu A) nr XXXXX/RRRR".
 */
export function extractWorkPermitNumber(text: string): { nrZezwolenia?: string; sygnatura?: string } {
  const nrMatch = text.match(/\(typu\s+[A-E]\)\s+nr\s+(\d+\/\d{4})/i);
  const wrpMatch = text.match(/(WRP[\w-]*[.\s]*\d{4}[.\s]*\d+[.\s/]*[\w]*)/);
  return {
    nrZezwolenia: nrMatch ? nrMatch[1] : undefined,
    sygnatura: wrpMatch ? wrpMatch[0].trim() : undefined,
  };
}
