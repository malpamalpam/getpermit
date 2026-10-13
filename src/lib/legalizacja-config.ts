/**
 * Legalization rules configuration.
 * Source of truth: config/legalizacja-rules.yaml (documentation)
 * Runtime: this TypeScript module (type-safe, no yaml dependency needed)
 *
 * When changing rules, update BOTH this file and the YAML.
 * The department can request changes via the YAML; developers sync here.
 */

// ============================================================================
// Types
// ============================================================================

export interface ArticleMapping {
  residence: string | null;
  employment: string | null;
  indefinite?: boolean;
  date_source?: "sentencja" | "issue_date" | "annotation" | "od_do_clause";
  resolve_by?: "employer_check";
  flags?: string[];
  is_change_decision?: boolean;
}

export interface Toggle {
  default: "reguly_mapowania" | "instrukcja_1_2";
  options: {
    reguly_mapowania: string;
    instrukcja_1_2: string;
  };
}

export interface LegalizacjaConfig {
  article_map: Record<string, ArticleMapping>;
  kpa_articles: string[];
  keyword_map: Record<string, string[]>;
  sentencja_positive: string[];
  sentencja_negative: string[];
  sentencja_change: string[];
  fdk_identifiers: {
    names: string[];
    addresses: string[];
    nip: string;
  };
  indefinite_types: string[];
  employment_hierarchy: Record<string, number>;
  przelaczniki: Record<string, Toggle>;
  alerts: Record<string, number | number[] | string>;
  visa_work_forbidden_codes: string[];
  visa_work_requires_basis_codes: string[];
  folder_wazne_types: string[];
  no_basis_documents: string[];
  filename_shortcuts: Record<string, string[]>;
  filename_codes: string[];
}

// ============================================================================
// Active toggle values (runtime state — initialized from defaults)
// ============================================================================

const _activeToggles: Record<string, string> = {};

export function getToggleValue(key: string): string {
  if (_activeToggles[key]) return _activeToggles[key];
  const toggle = CONFIG.przelaczniki[key];
  return toggle?.default ?? "reguly_mapowania";
}

export function setToggleValue(key: string, value: "reguly_mapowania" | "instrukcja_1_2"): void {
  _activeToggles[key] = value;
}

export function isRegulyMapowania(key: string): boolean {
  return getToggleValue(key) === "reguly_mapowania";
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if employer text matches FDK identifiers.
 */
export function isFdkEmployer(text: string): boolean {
  const lower = text.toLowerCase();
  for (const name of CONFIG.fdk_identifiers.names) {
    if (lower.includes(name.toLowerCase())) return true;
  }
  for (const addr of CONFIG.fdk_identifiers.addresses) {
    if (lower.includes(addr.toLowerCase())) return true;
  }
  if (CONFIG.fdk_identifiers.nip && lower.includes(CONFIG.fdk_identifiers.nip)) return true;
  return false;
}

/**
 * Resolve article mapping, handling employer_check for art. 114/126.
 */
export function resolveArticleMapping(
  articleKey: string,
  sentencja: string
): ArticleMapping | null {
  // Try exact match first, then base article
  let mapping = CONFIG.article_map[articleKey];
  if (!mapping) {
    const baseArticle = articleKey.split(".")[0];
    mapping = CONFIG.article_map[baseArticle];
  }
  if (!mapping) return null;

  // Resolve employer_check
  if (mapping.resolve_by === "employer_check") {
    const isFdk = isFdkEmployer(sentencja);
    if (isFdk) {
      return { ...mapping, residence: "TRC_FDK", employment: "TRC_FDK" };
    }
    // Apply toggle #2: TRC – inny pracodawca zatrudnieniowa
    const employment = isRegulyMapowania("trc_inny_pracodawca_zatrudnieniowa")
      ? null  // Reguły mapowania: tylko pobytowa
      : "TRC_INNY_PRACODAWCA";  // Instrukcja 1.2: + zatrudnieniowa
    return { ...mapping, residence: "TRC_INNY_PRACODAWCA", employment };
  }

  return mapping;
}

/**
 * Check if a type is indefinite (no dataDo, always AKTYWNE).
 */
export function isIndefiniteType(typ: string): boolean {
  return CONFIG.indefinite_types.includes(typ);
}

/**
 * Check if sentencja text indicates a positive decision.
 */
export function isPositiveDecision(text: string): boolean {
  const lower = text.toLowerCase();
  return CONFIG.sentencja_positive.some(phrase => lower.includes(phrase.toLowerCase()));
}

/**
 * Check if sentencja text indicates a negative decision.
 */
export function isNegativeDecision(text: string): boolean {
  const lower = text.toLowerCase();
  return CONFIG.sentencja_negative.some(phrase => lower.includes(phrase.toLowerCase()));
}

/**
 * Check if sentencja text indicates a change decision (art. 120).
 */
export function isChangeDecision(text: string): boolean {
  const lower = text.toLowerCase();
  return CONFIG.sentencja_change.some(phrase => lower.includes(phrase.toLowerCase()));
}

/**
 * Match keyword patterns to determine type (fallback when no article found).
 * Returns the matched type or null.
 */
export function matchKeywords(text: string): string | null {
  const lower = text.toLowerCase();
  // Check in priority order: strongest types first
  const priorityOrder = [
    "POBYT_STALY", "REZYDENT_UE", "TRC_BLUE_CARD", "STATUS_UCHODZCY",
    "OCHRONA_UZUPELNIAJACA", "TRC_HUMANITARNE", "TRC_MALZONEK_PL",
    "TRC_POBYT_Z_CUDZ", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC",
    "TRC_FDK",
  ];
  for (const typ of priorityOrder) {
    const phrases = CONFIG.keyword_map[typ];
    if (!phrases) continue;
    for (const phrase of phrases) {
      if (lower.includes(phrase.toLowerCase())) return typ;
    }
  }
  return null;
}

/**
 * Extract and normalize article number from text.
 * Returns structured article key like "114", "114.1", "186.1.9".
 * Skips KPA articles.
 */
export function extractArticle(text: string): string | null {
  // Match: "art. 114 ust. 1 pkt 9" or "art.186 ust.1 pkt 6" etc.
  const artRegex = /art(?:yku[łl])?\.\s*(\d+)\s*(?:ust\.?\s*(\d+))?\s*(?:pkt\.?\s*(\d+))?\s*(?:lit\.?\s*([a-z]))?/gi;
  let match: RegExpExecArray | null;
  const candidates: string[] = [];

  while ((match = artRegex.exec(text)) !== null) {
    const [, artNum, ust, pkt] = match;
    // Skip KPA articles
    if (CONFIG.kpa_articles.includes(artNum)) continue;

    // Build key: "114", "114.1", "186.1.9"
    let key = artNum;
    if (ust) key += `.${ust}`;
    if (pkt) key += `.${pkt}`;
    candidates.push(key);
  }

  if (candidates.length === 0) return null;

  // Return the first valid article (most specific match)
  // Try from most specific to least specific
  for (const candidate of candidates) {
    if (CONFIG.article_map[candidate]) return candidate;
    // Try base article
    const base = candidate.split(".")[0];
    if (CONFIG.article_map[base]) return candidate; // return full key, resolver will fall back
  }

  return candidates[0]; // return first even if not in map
}

// ============================================================================
// Mapping: parser detectedType → residence + employment types
// ============================================================================

/**
 * Map the parser's detectedType (from pdf-parser.ts / detectDocumentType)
 * to the new v2 residence and employment base types.
 *
 * This bridges the gap between the regex-based parser (which returns types like
 * TRC_FDK, OSWIADCZENIE, ZEZWOLENIE_A) and the new dual-base model.
 *
 * @param detectedType - from ParsedDocumentData.detectedType
 * @param firma - employer name (for FDK vs inny pracodawca check)
 */
export function mapDetectedTypeToBaseTypes(
  detectedType: string | undefined,
  firma?: string | null,
): { residenceType: string | null; employmentType: string | null; isIndefinite: boolean; flags: string[] } {
  if (!detectedType) return { residenceType: null, employmentType: null, isIndefinite: false, flags: [] };

  const isFdk = firma ? isFdkEmployer(firma) : false;

  // Direct mapping table: parser type → { residence, employment }
  const MAP: Record<string, { r: string | null; e: string | null; indef?: boolean }> = {
    // TRC variants — dual base (residence + employment)
    TRC_FDK:           { r: "TRC_FDK", e: "TRC_FDK" },
    TRC_BLUE_CARD:     { r: "TRC_BLUE_CARD", e: "TRC_BLUE_CARD" },
    TRC_HUMANITARNE:   { r: "TRC_HUMANITARNE", e: "TRC_HUMANITARNE" },
    TRC_POBYT_Z_CUDZ:  { r: "TRC_POBYT_Z_CUDZ", e: "TRC_POBYT_Z_CUDZ" },
    TRC_MALZONEK_PL:   { r: "TRC_MALZONEK_PL", e: "TRC_MALZONEK_PL" },
    TRC_STUDIA:        { r: "TRC_STUDIA", e: "TRC_STUDIA" },
    TRC_ABSOLWENT:     { r: "TRC_ABSOLWENT", e: "TRC_ABSOLWENT" },
    TRC_DZIALALNOSC:   { r: "TRC_DZIALALNOSC", e: "TRC_DZIALALNOSC" },
    TRC_INNE_OKOLICZNOSCI: { r: "TRC_INNE_OKOLICZNOSCI", e: null },
    TRC_INNY_PRACODAWCA: { r: "TRC_INNY_PRACODAWCA", e: null }, // toggle #2

    // Legacy TRC — check FDK
    KARTA_POBYTU:      { r: "KARTA_POBYTU", e: null }, // karta alone = no employment
    BLUE_CARD:         { r: "TRC_BLUE_CARD", e: "TRC_BLUE_CARD" },

    // Indefinite types
    OD_POBYT_STALY:    { r: "POBYT_STALY", e: "POBYT_STALY", indef: true },
    OD_REZYDENT_UE:    { r: "REZYDENT_UE", e: "REZYDENT_UE", indef: true },
    OD_UCHODZCA:       { r: "STATUS_UCHODZCY", e: "STATUS_UCHODZCY", indef: true },
    OD_OCHRONA_UZUP:   { r: "OCHRONA_UZUPELNIAJACA", e: "OCHRONA_UZUPELNIAJACA", indef: true },
    OD_UE:             { r: "OBYWATEL_UE", e: "OBYWATEL_UE", indef: true },
    OD_UK_WYSTAPIENIE: { r: "UMOWA_WYSTAPIENIA", e: "UMOWA_WYSTAPIENIA" },
    OD_WIZA_HUMAN:     { r: "WIZA", e: "WIZA_HUMANITARNA" },

    // New v2 types (pass-through)
    POBYT_STALY:       { r: "POBYT_STALY", e: "POBYT_STALY", indef: true },
    REZYDENT_UE:       { r: "REZYDENT_UE", e: "REZYDENT_UE", indef: true },
    STATUS_UCHODZCY:   { r: "STATUS_UCHODZCY", e: "STATUS_UCHODZCY", indef: true },
    OCHRONA_UZUPELNIAJACA: { r: "OCHRONA_UZUPELNIAJACA", e: "OCHRONA_UZUPELNIAJACA", indef: true },
    ZGODA_HUMANITARNA: { r: "ZGODA_HUMANITARNA", e: "WIZA_HUMANITARNA" },
    OBYWATEL_UE:       { r: "OBYWATEL_UE", e: "OBYWATEL_UE", indef: true },
    UMOWA_WYSTAPIENIA: { r: "UMOWA_WYSTAPIENIA", e: "UMOWA_WYSTAPIENIA" },
    WIZA:              { r: "WIZA", e: null },
    RUCH_BEZWIZOWY:    { r: "RUCH_BEZWIZOWY", e: null },
    POBYT_NA_PRZEDLUZENIU: { r: "POBYT_NA_PRZEDLUZENIU", e: null },
    PESEL_UKR:         { r: "PESEL_UKR", e: null },
    POBYT_CUKR:        { r: "POBYT_CUKR", e: null },

    // Employment-only types
    ZEZWOLENIE_A:      { r: null, e: "ZEZWOLENIE_A" },
    ZEZWOLENIE_A_KONT: { r: null, e: "ZEZWOLENIE_A_KONT" },
    ZEZWOLENIE:        { r: null, e: "ZEZWOLENIE_A" }, // legacy → ZEZWOLENIE_A
    OSWIADCZENIE:      { r: null, e: "OSWIADCZENIE" },
    POWIADOMIENIE_UA:  { r: null, e: "POWIADOMIENIE_UA" },
    ZGLOSZENIE_UA:     { r: null, e: "POWIADOMIENIE_UA" }, // legacy
    KARTA_POLAKA:      { r: null, e: "KARTA_POLAKA" },
    STATUS_STUDENTA:   { r: null, e: "STATUS_STUDENTA" },
    STATUS_ABSOLWENTA: { r: null, e: "STATUS_ABSOLWENTA", indef: true },
    WIZA_HUMANITARNA:  { r: null, e: "WIZA_HUMANITARNA" },

    // OD legacy employment types
    OD_STUDENT:        { r: null, e: "STATUS_STUDENTA" },
    OD_ABSOLWENT:      { r: null, e: "STATUS_ABSOLWENTA", indef: true },
    OD_KARTA_POLAKA:   { r: null, e: "KARTA_POLAKA" },
    OD_BLUE_CARD:      { r: null, e: "TRC_BLUE_CARD" },
    OD_MALZONEK_PL:    { r: null, e: "TRC_MALZONEK_PL" },
    OD_CZLONEK_RODZINY:{ r: null, e: "TRC_POBYT_Z_CUDZ" },
    OD_HUMANITARNE:    { r: null, e: "TRC_HUMANITARNE" },

    // No bases
    ODWOLANIE:         { r: null, e: null },
  };

  const entry = MAP[detectedType];
  if (!entry) {
    return { residenceType: null, employmentType: null, isIndefinite: false, flags: ["typ_nieznany"] };
  }

  let residenceType = entry.r;
  let employmentType = entry.e;
  const flags: string[] = [];

  // For legacy KARTA_POBYTU with FDK employer, upgrade to TRC_FDK
  if (detectedType === "KARTA_POBYTU" && isFdk) {
    residenceType = "TRC_FDK";
    employmentType = "TRC_FDK";
  } else if (detectedType === "KARTA_POBYTU" && firma && !isFdk) {
    residenceType = "TRC_INNY_PRACODAWCA";
    // Toggle #2
    employmentType = isRegulyMapowania("trc_inny_pracodawca_zatrudnieniowa")
      ? null : "TRC_INNY_PRACODAWCA";
  }

  // For TRC_FDK — verify FDK employer, downgrade if not
  if (detectedType === "TRC_FDK" && firma && !isFdk) {
    residenceType = "TRC_INNY_PRACODAWCA";
    employmentType = isRegulyMapowania("trc_inny_pracodawca_zatrudnieniowa")
      ? null : "TRC_INNY_PRACODAWCA";
    flags.push("reklasyfikacja_inny_pracodawca");
  }

  return {
    residenceType,
    employmentType,
    isIndefinite: entry.indef ?? false,
    flags,
  };
}

// ============================================================================
// Configuration data (mirrors config/legalizacja-rules.yaml)
// ============================================================================

export const CONFIG: LegalizacjaConfig = {
  // Sentencja phrases
  sentencja_positive: [
    "udzielam", "udziela się", "zezwala się", "orzekam o udzieleniu",
    "postanawiam udzielić", "nadaje się", "postanawiam nadać",
  ],
  sentencja_negative: [
    "odmawiam", "odmawia się", "umarza się", "umarzam", "cofa się", "cofam",
  ],
  sentencja_change: [
    "orzekam o zmianie zezwolenia", "zmieniam decyzję",
  ],

  // Article → type mapping
  article_map: {
    "114": { residence: "TRC_FDK", employment: "TRC_FDK", resolve_by: "employer_check", date_source: "sentencja" },
    "114.1": { residence: "TRC_FDK", employment: "TRC_FDK", resolve_by: "employer_check", date_source: "sentencja" },
    "114.1a": { residence: "TRC_FDK", employment: "TRC_FDK", resolve_by: "employer_check", date_source: "sentencja" },
    "126": { residence: "TRC_FDK", employment: "TRC_FDK", resolve_by: "employer_check", date_source: "sentencja" },
    "127": { residence: "TRC_BLUE_CARD", employment: "TRC_BLUE_CARD", date_source: "sentencja" },
    "139a": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["brak_typu_w_slowniku"] },
    "139a.1": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["brak_typu_w_slowniku"] },
    "139o": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["brak_typu_w_slowniku"] },
    "140": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["brak_typu_w_slowniku"] },
    "142": { residence: "TRC_DZIALALNOSC", employment: "TRC_DZIALALNOSC", date_source: "sentencja" },
    "142.1": { residence: "TRC_DZIALALNOSC", employment: "TRC_DZIALALNOSC", date_source: "sentencja" },
    "144": { residence: "TRC_STUDIA", employment: "TRC_STUDIA", date_source: "sentencja" },
    "151": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["brak_typu_w_slowniku"] },
    "157a": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["brak_typu_w_slowniku"] },
    "157g": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["brak_typu_w_slowniku"] },
    "158": { residence: "TRC_MALZONEK_PL", employment: "TRC_MALZONEK_PL", date_source: "sentencja" },
    "158.1.1": { residence: "TRC_MALZONEK_PL", employment: "TRC_MALZONEK_PL", date_source: "sentencja" },
    "158.2.1": { residence: "TRC_MALZONEK_PL", employment: "TRC_MALZONEK_PL", date_source: "sentencja" },
    "158.2.2": { residence: "TRC_MALZONEK_PL", employment: "TRC_MALZONEK_PL", date_source: "sentencja" },
    "158.1.2": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["do_decyzji_zespolu"] },
    "158.2.3": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["do_decyzji_zespolu"] },
    "158a": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null, flags: ["do_decyzji_zespolu"] },
    "159": { residence: "TRC_POBYT_Z_CUDZ", employment: "TRC_POBYT_Z_CUDZ", date_source: "sentencja" },
    "159.1": { residence: "TRC_POBYT_Z_CUDZ", employment: "TRC_POBYT_Z_CUDZ", date_source: "sentencja" },
    "170": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "171": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "172": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "173": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "174": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "175": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "176": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "177": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "178": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "179": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "180": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "181": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "181.1": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "185a": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "186": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "186.1.1": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "186.1.2": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "186.1.3": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "186.1.4": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "186.1.5": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "186.1.6": { residence: "TRC_ABSOLWENT", employment: "TRC_ABSOLWENT", date_source: "sentencja" },
    "186.1.7": { residence: "TRC_ABSOLWENT", employment: "TRC_ABSOLWENT", flags: ["do_potwierdzenia"], date_source: "sentencja" },
    "186.1.8": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "186.1.9": { residence: "TRC_HUMANITARNE", employment: "TRC_HUMANITARNE", date_source: "sentencja" },
    "187": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "187.1": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "187.2": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "187.3": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "187.4": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "187.5": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "187.6": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "187.7": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "187.8": { residence: "TRC_INNE_OKOLICZNOSCI", employment: null },
    "195": { residence: "POBYT_STALY", employment: "POBYT_STALY", indefinite: true, date_source: "issue_date" },
    "195.1.1": { residence: "POBYT_STALY", employment: "POBYT_STALY", indefinite: true, date_source: "issue_date" },
    "201": { residence: "POBYT_STALY", employment: "POBYT_STALY", indefinite: true, date_source: "issue_date" },
    "211": { residence: "REZYDENT_UE", employment: "REZYDENT_UE", indefinite: true, date_source: "issue_date" },
    "218": { residence: "REZYDENT_UE", employment: "REZYDENT_UE", indefinite: true, date_source: "issue_date" },
    "348": { residence: "ZGODA_HUMANITARNA", employment: "WIZA_HUMANITARNA", date_source: "sentencja" },
    "108": { residence: "POBYT_NA_PRZEDLUZENIU", employment: null, date_source: "issue_date" },
    "120": { residence: null, employment: null, is_change_decision: true },
    "13": { residence: "STATUS_UCHODZCY", employment: "STATUS_UCHODZCY", indefinite: true, date_source: "issue_date" },
    "15": { residence: "OCHRONA_UZUPELNIAJACA", employment: "OCHRONA_UZUPELNIAJACA", indefinite: true, date_source: "issue_date" },
    "19": { residence: "OCHRONA_UZUPELNIAJACA", employment: "OCHRONA_UZUPELNIAJACA", indefinite: true, date_source: "issue_date" },
  },

  kpa_articles: ["104", "105", "107", "155", "156"],

  keyword_map: {
    POBYT_STALY: ["pobyt stały", "pobytu stałego", "na osiedlenie się"],
    REZYDENT_UE: ["rezydenta długoterminowego", "rezydent długoterminowy"],
    TRC_BLUE_CARD: ["wysokich kwalifikacji", "wysokie kwalifikacje", "niebieska karta", "blue card"],
    TRC_STUDIA: ["kontynuowania studiów", "podjęcia studiów", "kształcenia się na studiach", "w celu kształcenia"],
    TRC_ABSOLWENT: ["poszukiwania pracy", "ukończenia studiów", "absolwent"],
    TRC_DZIALALNOSC: ["prowadzenia działalności gospodarczej", "działalność gospodarcza"],
    TRC_HUMANITARNE: ["ze względów humanitarnych", "względy humanitarne"],
    TRC_POBYT_Z_CUDZ: ["połączenia z rodziną", "członka rodziny cudzoziemca", "pobyt z cudzoziemcem", "łączenie rodzin"],
    TRC_MALZONEK_PL: ["małżonkiem obywatela polskiego", "małżonek obywatela polskiego", "związek małżeński z obywatelem"],
    STATUS_UCHODZCY: ["status uchodźcy", "statusu uchodźcy", "nadaje się status"],
    OCHRONA_UZUPELNIAJACA: ["ochrona uzupełniająca", "ochrony uzupełniającej"],
    TRC_FDK: ["w celu wykonywania pracy", "pobyt czasowy i pracę"],
  },

  fdk_identifiers: {
    names: ["Firma Dla Każdego", "firma dla każdego", "FIRMA DLA KAŻDEGO", "Firma Dla Kazdego"],
    addresses: ["Lwowska 5/15", "ul. Lwowska 5/15"],
    nip: "7010962890",
  },

  indefinite_types: [
    "POBYT_STALY", "REZYDENT_UE", "STATUS_UCHODZCY", "OCHRONA_UZUPELNIAJACA",
    "OBYWATEL_UE", "STATUS_ABSOLWENTA",
  ],

  employment_hierarchy: {
    POBYT_STALY: 10, REZYDENT_UE: 10,
    STATUS_UCHODZCY: 9, OCHRONA_UZUPELNIAJACA: 9, OBYWATEL_UE: 9, UMOWA_WYSTAPIENIA: 9, WIZA_HUMANITARNA: 9,
    TRC_FDK: 8, TRC_BLUE_CARD: 8, TRC_HUMANITARNE: 8, TRC_POBYT_Z_CUDZ: 8,
    TRC_MALZONEK_PL: 8, TRC_STUDIA: 8, TRC_ABSOLWENT: 8, TRC_DZIALALNOSC: 8, TRC_INNE_OKOLICZNOSCI: 7,
    ZEZWOLENIE_A: 6, ZEZWOLENIE_A_KONT: 6,
    OSWIADCZENIE: 5,
    POWIADOMIENIE_UA: 4,
    KARTA_POLAKA: 3,
    STATUS_STUDENTA: 2, STATUS_ABSOLWENTA: 2,
    // Legacy mappings
    OD_POBYT_STALY: 10, OD_REZYDENT_UE: 10, OD_KARTA_POLAKA: 3,
    OD_OCHRONA_UZUP: 9, OD_UCHODZCA: 9, OD_WIZA_HUMAN: 9,
    OD_UE: 9, OD_UK_WYSTAPIENIE: 9,
    TRC_INNY_PRACODAWCA: 8,
    OD_ABSOLWENT: 2, OD_STUDENT: 2,
    OD_BLUE_CARD: 8, OD_MALZONEK_PL: 8, OD_CZLONEK_RODZINY: 8, OD_HUMANITARNE: 8,
    KARTA_POBYTU: 7, BLUE_CARD: 7,
    ZEZWOLENIE: 6, DOSTEP_POBYT_STALY: 10, DOSTEP_REZYDENT_UE: 10,
    DOSTEP_UE: 9, DOSTEP_KARTA_POLAKA: 3, DOSTEP_OCHRONA_MIEDZ: 9,
    DOSTEP_DYPLOM_PL: 2, DOSTEP_STUDENT: 2,
    ZGLOSZENIE_UA: 4, POBYT_CUKR: 7,
  },

  przelaczniki: {
    nazwy_zatrudnieniowe_pobyt_staly: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Pobyt Stały / Pobyt Rezydenta długoterminowego UE / Status uchodźcy / Ochrona uzupełniająca",
        instrukcja_1_2: "OD — pobyt stały / OD — rezydent UE / OD — uchodźca / OD — ochrona uzupełniająca",
      },
    },
    trc_inny_pracodawca_zatrudnieniowa: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Tylko podstawa pobytowa (praca w FDK wymaga osobnej podstawy)",
        instrukcja_1_2: "Pobytowa + zatrudnieniowa TRC – inny pracodawca",
      },
    },
    nazwy_zatrudnieniowe_trc_specjalne: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "TRC – studia / TRC - Małżonek obywatela PL / TRC – pobyt z cudzoziemcem / TRC – absolwent",
        instrukcja_1_2: "OD — status studenta / OD — małżonek / OD / absolwent (tylko z dyplomu)",
      },
    },
    art_186_3_4_8_zatrudnieniowa: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Brak podstawy zatrudnieniowej",
        instrukcja_1_2: "OD (niezatwierdzone)",
      },
    },
    legitymacja_studencka: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Tworzy podstawę 'status studenta'",
        instrukcja_1_2: "Nie tworzy podstawy",
      },
    },
    stempel_upo_nazwa: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Pobyt na przedłużeniu",
        instrukcja_1_2: "W procedurze — stempel w paszporcie",
      },
    },
    pesel_ukr: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Pesel UKR, ważna do 04.03.2027",
        instrukcja_1_2: "Status UKR, bez daty do",
      },
    },
    karta_cukr_nazwa: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "CUKR",
        instrukcja_1_2: "Pobyt CUKR",
      },
    },
    wiza_humanitarna_zatrudnieniowa: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Tworzy zatrudnieniową 'wiza humanitarna'",
        instrukcja_1_2: "Wiza nigdy nie tworzy zatrudnieniowej",
      },
    },
    rejestracja_ue_data: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Bezterminowo (brak daty do)",
        instrukcja_1_2: "Data ważności blankietu → data do",
      },
    },
    obywatel_uk_nazwa: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Umowa wystąpienia",
        instrukcja_1_2: "Umowa wystąpienia (UK)",
      },
    },
    blue_card_bez_warunkow: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Brak specjalnej reguły — TRC_BLUE_CARD",
        instrukcja_1_2: "Otwarty dostęp (OD)",
      },
    },
    blue_card_pracodawca: {
      default: "reguly_mapowania",
      options: {
        reguly_mapowania: "Z uzasadnienia gdy brak w sentencji, brak → flaga 'uzupełnij pracodawcę'",
        instrukcja_1_2: "Tylko z sentencji (brak = brak)",
      },
    },
  },

  alerts: {
    residence_expiry_days: [60, 30],
    employment_expiry_days: [60, 30],
    card_expiry_days: [60, 30],
    passport_expiry_days: [60, 30],
    trc_fdk_change_notification_business_days: 15,
    blue_card_change_notification_business_days: 15,
    oswiadczenie_start_work_days: 7,
    oswiadczenie_no_start_days: 14,
    powiadomienie_start_work_days: 7,
    seasonal_work_limit_months: 9,
    temporary_protection_end_date: "2027-03-04",
    non_final_decision_review_days: 14,
  },

  visa_work_forbidden_codes: ["01", "02", "11", "14", "20", "23"],
  visa_work_requires_basis_codes: ["05a", "05b", "06"],

  folder_wazne_types: [
    "POBYT_STALY", "REZYDENT_UE", "STATUS_UCHODZCY", "OCHRONA_UZUPELNIAJACA",
    "ZGODA_HUMANITARNA", "OBYWATEL_UE", "UMOWA_WYSTAPIENIA",
    "TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_BLUE_CARD", "TRC_HUMANITARNE",
    "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT",
    "TRC_DZIALALNOSC", "TRC_INNE_OKOLICZNOSCI",
    "WIZA", "POBYT_NA_PRZEDLUZENIU", "PESEL_UKR", "POBYT_CUKR",
    "ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "OSWIADCZENIE", "POWIADOMIENIE_UA",
    "KARTA_POLAKA", "STATUS_STUDENTA", "STATUS_ABSOLWENTA", "RUCH_BEZWIZOWY",
    // Legacy types
    "KARTA_POBYTU", "BLUE_CARD", "TRC_FDK", "ZEZWOLENIE",
    "OD_POBYT_STALY", "OD_REZYDENT_UE", "OD_UE", "OD_UK_WYSTAPIENIE",
    "OD_UCHODZCA", "OD_OCHRONA_UZUP", "OD_WIZA_HUMAN",
    "OD_ABSOLWENT", "OD_STUDENT", "OD_KARTA_POLAKA", "OD_BLUE_CARD",
    "OD_MALZONEK_PL", "OD_CZLONEK_RODZINY", "OD_HUMANITARNE",
  ],

  no_basis_documents: [
    "paszport", "polski_dowod_osobisty", "dokument_podrozy_udsc", "pesel",
    "rodo", "dowod_wewnetrzny_kraju_pochodzenia", "historia_paszportowa",
    "akty_stanu_cywilnego", "tlumaczenia", "dyplom_zagraniczny", "certyfikaty",
    "wniosek_trc", "wniosek_rezydent", "wniosek_pobyt_staly", "wniosek_zezwolenie_na_prace",
    "zalacznik_nr_1", "zalacznik_nr_2",
    "wniosek_osw", "osw_utrzymanie", "osw_niekaralnosc", "osw_pobyt_3_lata",
    "powiadomienie_podjecie_pracy", "powiadomienie_niepodjecie_pracy", "zgloszenie_umowy",
    "pelnomocnictwo", "oplaty", "pismo_przewodnie", "ankiety", "prosba_o_przyspieszenie",
    "informacja_starosty", "wezwania", "zawiadomienia", "odpowiedz_na_wezwanie", "ponaglenia",
    "umowa_o_dzielo", "umowa_zlecenie", "umowa_o_prace", "aneksy", "rachunki",
    "umowa_wspolpracy_fdk", "umowa_najmu", "polisa", "pit",
    "zus_cudzoziemca", "us_cudzoziemca", "formularze_wewnetrzne_fdk",
    "krs_podmiotu", "sprawozdania_podmiotu", "zus_podmiotu", "us_podmiotu", "szablony",
  ],

  filename_shortcuts: {
    TRC_FDK: ["TRC FDK", "TRC_FDK"],
    TRC_BLUE_CARD: ["TRC Blue Card", "TRC_Blue_Card", "Blue Card"],
    TRC_INNY_PRACODAWCA: ["TRC - inny pracodawca", "TRC_inny_pracodawca"],
    POBYT_CUKR: ["CUKR"],
    TRC_DZIALALNOSC: ["TRC działalność", "TRC_dzialalnosc"],
    TRC_ABSOLWENT: ["TRC – absolwent", "TRC_absolwent"],
    TRC_STUDIA: ["TRC studia", "TRC_studia"],
    TRC_POBYT_Z_CUDZ: ["TRC – łączenie rodzin", "TRC_laczenie_rodzin"],
    TRC_INNE_OKOLICZNOSCI: ["TRC inne okoliczności", "TRC_inne_okolicznosci"],
    REZYDENT_UE: ["Rezydent UE", "Rezydent_UE"],
    POBYT_STALY: ["Pobyt stały", "Pobyt_staly"],
    ZEZWOLENIE_A: ["KP", "WP"],
    POWIADOMIENIE_UA: ["Powiadomienie UA", "Zgłoszenie UA", "Powiadomienie_UA", "Zgloszenie_UA"],
    OSWIADCZENIE: ["OŚW", "OSW"],
  },

  filename_codes: [
    "WNIOSEK-OSW_", "OSW-UTRZYMANIE_", "OSW-NIEKARALNOSC_", "OSW-POBYT-3-LATA_",
  ],
};
