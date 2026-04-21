/**
 * Mapa slugów usług per locale.
 * Klucz = internal slug (używany w services.ts).
 * Wartości = zlokalizowane slugi per język.
 */
export const SERVICE_SLUG_MAP: Record<string, Record<string, string>> = {
  // Dla pracodawców (legalizacja pracy)
  "zezwolenie-na-prace": {
    pl: "zezwolenie-na-prace",
    en: "work-permit",
    ru: "razreshenie-na-rabotu",
    uk: "dozvil-na-robotu",
  },
  "oswiadczenie-o-powierzeniu-pracy": {
    pl: "oswiadczenie-o-powierzeniu-pracy",
    en: "employer-declaration",
    ru: "zayavlenie-o-poruchenii-raboty",
    uk: "oswiadchennia-pro-doruchennia-roboty",
  },

  // Legalizacja pobytu
  "karta-pobytu-czasowego": {
    pl: "karta-pobytu-czasowego",
    en: "temporary-residence-permit",
    ru: "vremennyj-vid-na-zhitelstvo",
    uk: "karta-tymchasovogo-pobutu",
  },
  "zezwolenie-na-pobyt-czasowy-i-prace": {
    pl: "zezwolenie-na-pobyt-czasowy-i-prace",
    en: "residence-and-work-permit",
    ru: "razreshenie-na-prozhivanie-i-rabotu",
    uk: "dozvil-na-prozyvannia-ta-robotu",
  },
  "eu-blue-card": {
    pl: "eu-blue-card",
    en: "eu-blue-card",
    ru: "golubaya-karta-es",
    uk: "blakytna-karta-es",
  },
  "wymiana-karty-pobytu": {
    pl: "wymiana-karty-pobytu",
    en: "residence-card-replacement",
    ru: "zamena-karty-pobytu",
    uk: "zamina-karty-pobutu",
  },

  // Pobyty długoterminowe
  "rezydent-dlugoterminowy-ue": {
    pl: "rezydent-dlugoterminowy-ue",
    en: "eu-long-term-resident",
    ru: "dolgosrochnyj-rezident-es",
    uk: "dovgostrokovyj-rezydent-es",
  },
  "karta-stalego-pobytu": {
    pl: "karta-stalego-pobytu",
    en: "permanent-residence-permit",
    ru: "postoyannyj-vid-na-zhitelstvo",
    uk: "karta-postijnogo-pobutu",
  },

  // Procedura odwoławcza
  "ponaglenia-i-odwolania": {
    pl: "ponaglenia-i-odwolania",
    en: "appeals-and-complaints",
    ru: "zhaloby-i-apellyatsii",
    uk: "skargy-ta-apeliatsii",
  },

  // Tłumaczenia
  "tlumaczenia-przysiegle": {
    pl: "tlumaczenia-przysiegle",
    en: "sworn-translations",
    ru: "prisyazhnye-perevody",
    uk: "prysyazhni-pereklady",
  },
  // Nowe usługi
  "powiadomienia-o-powierzeniu-pracy": {
    pl: "powiadomienia-o-powierzeniu-pracy",
    en: "work-entrustment-notifications",
    ru: "uvedomleniya-o-poruchenii-raboty",
    uk: "povdomlennya-pro-doruchennya-roboty",
  },
  "legalizacja-fdk": {
    pl: "legalizacja-fdk",
    en: "fdk-legalization",
    ru: "legalizaciya-fdk",
    uk: "legalizaciya-fdk",
  },
  "legalizacja-pracy-fdk": {
    pl: "legalizacja-pracy-fdk",
    en: "work-legalization-fdk",
    ru: "legalizaciya-raboty-fdk",
    uk: "legalizaciya-roboty-fdk",
  },
  // Dla pracodawców — dedykowany landing
  "dla-pracodawcow": {
    pl: "dla-pracodawcow",
    en: "for-employers",
    ru: "dlya-rabotodatelej",
    uk: "dlya-robotodavciv",
  },
};

/** Ścieżka bazowa usług per locale */
export const SERVICE_BASE_PATH: Record<string, string> = {
  pl: "uslugi",
  en: "services",
  ru: "uslugi",
  uk: "poslugy",
};

/** Slugi kategorii per locale (używane jako kotwice na /uslugi) */
export const CATEGORY_SLUG_MAP: Record<string, Record<string, string>> = {
  "legalizacja-pracy": {
    pl: "dla-pracodawcow",
    en: "for-employers",
    ru: "dlya-rabotodatelej",
    uk: "dlya-robotodavciv",
  },
  "legalizacja-pobytu": {
    pl: "legalizacja-pobytu",
    en: "residence-legalization",
    ru: "legalizaciya-prozhivaniya",
    uk: "legalizaciya-prozyvannia",
  },
  "pobyty-dlugoterminowe": {
    pl: "pobyty-dlugoterminowe",
    en: "long-term-residence",
    ru: "dolgosrochnoe-prozhivanie",
    uk: "dovgostrokove-prozyvannia",
  },
  "procedura-odwolawcza": {
    pl: "procedura-odwolawcza",
    en: "appeals-procedure",
    ru: "procedura-obzhalovaniya",
    uk: "procedura-oskarzhennia",
  },
  "tlumaczenia-przysiegle": {
    pl: "tlumaczenia-przysiegle",
    en: "sworn-translations",
    ru: "prisyazhnye-perevody",
    uk: "prysyazhni-pereklady",
  },
  "dla-pracodawcow": {
    pl: "dla-pracodawcow",
    en: "for-employers",
    ru: "dlya-rabotodatelej",
    uk: "dlya-robotodavciv",
  },
};

export function getLocalizedCategorySlug(internalSlug: string, locale: string): string {
  return CATEGORY_SLUG_MAP[internalSlug]?.[locale] ?? internalSlug;
}

/** Zwraca zlokalizowany slug usługi */
export function getLocalizedSlug(internalSlug: string, locale: string): string {
  return SERVICE_SLUG_MAP[internalSlug]?.[locale] ?? SERVICE_SLUG_MAP[internalSlug]?.pl ?? internalSlug;
}

/** Rozwiązuje zlokalizowany slug na internal slug */
export function resolveInternalSlug(localizedSlug: string, locale: string): string {
  for (const [internal, slugs] of Object.entries(SERVICE_SLUG_MAP)) {
    if (slugs[locale] === localizedSlug || slugs.pl === localizedSlug) {
      return internal;
    }
  }
  return localizedSlug; // fallback
}

/** Generuje pełną ścieżkę usługi dla danego locale (bez prefiksu locale) */
export function getServicePath(internalSlug: string, locale: string): string {
  const base = SERVICE_BASE_PATH[locale] ?? "uslugi";
  const slug = getLocalizedSlug(internalSlug, locale);
  return `/${base}/${slug}`;
}
