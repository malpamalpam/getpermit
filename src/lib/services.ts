/**
 * Katalog usług legalizacyjnych — źródło prawdy dla całej aplikacji.
 *
 * Struktura: 5 kategorii × 11 usług. Każde pole tekstowe jest obiektem
 * `LocalizedString` z kluczami pl/en/ru/uk. Async API (`getServiceCategories`,
 * `getServiceBySlug`, `getAllServices`) jest celowe — przygotowuje grunt pod
 * przyszłą migrację na headless CMS, gdy te funkcje będą faktycznie wykonywać
 * fetch. Synchroniczne stałe (`SERVICE_CATEGORIES`, `ALL_SERVICES`) są dostępne
 * dla komponentów klienckich, które nie mogą używać `await`.
 *
 * TODO(i18n): tłumaczenia EN/RU/UK są obecnie kopiami polskich tekstów.
 * Po dostarczeniu oficjalnych tłumaczeń przez klienta podmienić wartości
 * w polach `en`, `ru`, `uk` (PL pozostaje źródłem prawdy).
 */

export type Locale = "pl" | "en" | "ru" | "uk";

export interface LocalizedString {
  pl: string;
  en: string;
  ru: string;
  uk: string;
}

export interface LocalizedList {
  pl: string[];
  en: string[];
  ru: string[];
  uk: string[];
}

/** Nazwy ikon z lucide-react. Konwersja na komponent po stronie konsumenta. */
export type ServiceCategoryIcon =
  | "Briefcase"
  | "Home"
  | "MapPin"
  | "Scale"
  | "Languages";

export interface Service {
  slug: string;
  categorySlug: string;
  title: LocalizedString;
  shortDescription: LocalizedString;
  fullDescription: LocalizedString;
  forWhom: LocalizedString;
  requiredDocuments: LocalizedList;
  estimatedTime: LocalizedString;
  /** Format „od X zł" lub null, jeśli wycena indywidualna. */
  price: string | null;
  order: number;
}

export interface ServiceCategory {
  slug: string;
  title: LocalizedString;
  description: LocalizedString;
  icon: ServiceCategoryIcon;
  order: number;
  services: Service[];
}

/* -------------------------------------------------------------------------- */
/*                              POMOCNICZE HELPERY                            */
/* -------------------------------------------------------------------------- */

/** Tworzy `LocalizedString` z polskiego tekstu (kopia we wszystkich lokalach). */
const pl = (text: string): LocalizedString => ({
  pl: text,
  en: text,
  ru: text,
  uk: text,
});

/** Tworzy `LocalizedList` z polskiej listy (kopia we wszystkich lokalach). */
const plList = (items: string[]): LocalizedList => ({
  pl: items,
  en: items,
  ru: items,
  uk: items,
});

/** Bezpieczne wyciągnięcie tłumaczenia z fallbackiem na PL. */
export function localized(value: LocalizedString, locale: string): string {
  return (value as unknown as Record<string, string>)[locale] ?? value.pl;
}

export function localizedList(value: LocalizedList, locale: string): string[] {
  return (value as unknown as Record<string, string[]>)[locale] ?? value.pl;
}

/* -------------------------------------------------------------------------- */
/*                                  KATALOG                                   */
/* -------------------------------------------------------------------------- */

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  /* ====================== 1. LEGALIZACJA PRACY ============================ */
  {
    slug: "legalizacja-pracy",
    icon: "Briefcase",
    order: 1,
    title: pl("Legalizacja pracy"),
    description: pl(
      "Zezwolenia na pracę i oświadczenia dla cudzoziemców oraz pracodawców."
    ),
    services: [
      {
        slug: "zezwolenia-na-prace",
        categorySlug: "legalizacja-pracy",
        order: 1,
        title: pl("Zezwolenia na pracę"),
        shortDescription: pl(
          "Zezwolenie wydawane przez wojewodę dla cudzoziemców spoza UE — wszystkie typy A, B, C, D, E."
        ),
        fullDescription: pl(
          "Zezwolenie na pracę jest dokumentem wydawanym przez wojewodę dla cudzoziemców spoza Unii Europejskiej, którzy podejmują pracę w Polsce. Obejmuje wszystkie typy zezwoleń: A (praca na podstawie umowy z polskim pracodawcą), B (członek zarządu spółki), C (oddelegowanie wewnątrz korporacji), D (oddelegowanie do realizacji usług eksportowych), E (inne przypadki oddelegowania). Pomagamy zarówno w przygotowaniu kompletnej dokumentacji, jak i w reprezentacji przed urzędem wojewódzkim — od testu rynku pracy po odbiór decyzji."
        ),
        forWhom: pl(
          "Pracodawcy zatrudniający obcokrajowców oraz cudzoziemcy potrzebujący legalnej podstawy pracy w Polsce."
        ),
        requiredDocuments: plList([
          "Wniosek o wydanie zezwolenia na pracę",
          "Kopia paszportu cudzoziemca",
          "Dokumenty potwierdzające kwalifikacje zawodowe",
          "Informacja starosty o braku możliwości zaspokojenia potrzeb kadrowych (test rynku pracy, jeśli wymagany)",
          "Oświadczenie pracodawcy o niekaralności",
          "Potwierdzenie wpłaty opłaty skarbowej",
        ]),
        estimatedTime: pl("Od 1 do 3 miesięcy"),
        price: null,
      },
      {
        slug: "oswiadczenia-o-powierzeniu-pracy",
        categorySlug: "legalizacja-pracy",
        order: 2,
        title: pl("Oświadczenia o powierzeniu pracy"),
        shortDescription: pl(
          "Uproszczona procedura dla obywateli Ukrainy, Białorusi, Rosji, Mołdawii, Gruzji i Armenii — praca do 24 miesięcy."
        ),
        fullDescription: pl(
          "Oświadczenie o powierzeniu wykonywania pracy cudzoziemcowi to uproszczona procedura, przeznaczona dla obywateli sześciu państw: Ukrainy, Białorusi, Rosji, Mołdawii, Gruzji i Armenii. Oświadczenie rejestrowane jest w Powiatowym Urzędzie Pracy właściwym dla siedziby pracodawcy i pozwala cudzoziemcowi pracować w Polsce do 24 miesięcy. Procedura jest znacząco szybsza niż klasyczne zezwolenie na pracę. Pomagamy pracodawcom w prawidłowym wypełnieniu wniosku, zgłoszeniu rozpoczęcia pracy i obsłudze wszelkich formalności po stronie urzędu."
        ),
        forWhom: pl(
          "Pracodawcy zatrudniający obywateli Ukrainy, Białorusi, Rosji, Mołdawii, Gruzji lub Armenii oraz sami cudzoziemcy z tych krajów."
        ),
        requiredDocuments: plList([
          "Wniosek (oświadczenie) o powierzeniu wykonywania pracy",
          "Kopia paszportu cudzoziemca",
          "Dokumenty rejestrowe pracodawcy",
          "Oświadczenie pracodawcy o niekaralności",
          "Potwierdzenie wpłaty opłaty",
        ]),
        estimatedTime: pl("Od 7 do 30 dni"),
        price: null,
      },
    ],
  },

  /* ====================== 2. LEGALIZACJA POBYTU =========================== */
  {
    slug: "legalizacja-pobytu",
    icon: "Home",
    order: 2,
    title: pl("Legalizacja pobytu"),
    description: pl(
      "Karty pobytu czasowego, zezwolenia łączone, EU Blue Card i wymiana dokumentów."
    ),
    services: [
      {
        slug: "zezwolenie-na-pobyt-czasowy",
        categorySlug: "legalizacja-pobytu",
        order: 1,
        title: pl("Zezwolenie na pobyt czasowy"),
        shortDescription: pl(
          "Karta pobytu wydawana przez wojewodę na okres do 3 lat — dla studiów, rodziny, działalności i innych celów."
        ),
        fullDescription: pl(
          "Zezwolenie na pobyt czasowy to karta pobytu wydawana przez wojewodę na okres do 3 lat, przeznaczona dla cudzoziemców, którzy mają konkretny cel pobytu w Polsce: studia, łączenie rodzin, prowadzenie działalności gospodarczej, prowadzenie badań naukowych lub inne uzasadnione okoliczności. Pomagamy w skompletowaniu pełnej dokumentacji wymaganej przez wojewodę, przygotowaniu uzasadnienia wniosku oraz reprezentacji klienta na każdym etapie postępowania administracyjnego."
        ),
        forWhom: pl(
          "Cudzoziemcy planujący dłuższy pobyt w Polsce z konkretnym celem (studia, rodzina, działalność, badania)."
        ),
        requiredDocuments: plList([
          "Wniosek o udzielenie zezwolenia na pobyt czasowy",
          "Cztery aktualne fotografie",
          "Kopia ważnego dokumentu podróży",
          "Dokumenty potwierdzające cel pobytu (zaświadczenie z uczelni, akt małżeństwa, wpis do CEIDG itp.)",
          "Potwierdzenie posiadania ubezpieczenia zdrowotnego",
          "Potwierdzenie posiadania źródła stabilnego dochodu",
          "Potwierdzenie miejsca zamieszkania",
        ]),
        estimatedTime: pl("Od 3 do 6 miesięcy"),
        price: null,
      },
      {
        slug: "zezwolenie-na-pobyt-czasowy-i-prace",
        categorySlug: "legalizacja-pobytu",
        order: 2,
        title: pl("Zezwolenie na pobyt czasowy i pracę"),
        shortDescription: pl(
          "Tzw. „jedno zezwolenie\u201d — łączy pobyt z prawem do pracy u konkretnego pracodawcy. Najpopularniejsza ścieżka."
        ),
        fullDescription: pl(
          "Zezwolenie na pobyt czasowy i pracę, znane jako „jedno zezwolenie\u201d, to najpopularniejsza ścieżka dla cudzoziemców spoza UE pracujących w Polsce. Łączy w sobie zezwolenie pobytowe i prawo do wykonywania pracy u konkretnego pracodawcy — eliminuje konieczność prowadzenia dwóch równoległych postępowań. Reprezentujemy zarówno cudzoziemca, jak i pracodawcę przed wojewodą, dbając o pełną zgodność dokumentacji z aktualnymi wymogami prawnymi."
        ),
        forWhom: pl(
          "Pracujący cudzoziemcy spoza UE oraz ich pracodawcy — w jednym, połączonym postępowaniu."
        ),
        requiredDocuments: plList([
          "Wniosek o udzielenie zezwolenia na pobyt czasowy i pracę",
          "Załącznik nr 1 do wniosku (od pracodawcy)",
          "Cztery fotografie",
          "Kopia ważnego dokumentu podróży",
          "Informacja starosty (test rynku pracy, jeśli wymagany)",
          "Umowa o pracę lub umowa cywilnoprawna",
          "Potwierdzenie ubezpieczenia zdrowotnego i miejsca zamieszkania",
        ]),
        estimatedTime: pl("Od 3 do 6 miesięcy"),
        price: null,
      },
      {
        slug: "eu-blue-card",
        categorySlug: "legalizacja-pobytu",
        order: 3,
        title: pl("Wysokie kwalifikacje — EU Blue Card"),
        shortDescription: pl(
          "Zezwolenie dla wysoko wykwalifikowanych specjalistów — ułatwiony dostęp do rynku pracy w całej UE."
        ),
        fullDescription: pl(
          "EU Blue Card to zezwolenie na pobyt i pracę dedykowane wysoko wykwalifikowanym specjalistom — wymaga wykształcenia wyższego oraz wynagrodzenia powyżej określonego progu. Posiadanie Niebieskiej Karty UE daje istotne ułatwienia: szybsze uzyskanie zezwolenia na pobyt rezydenta długoterminowego, krótsze wymagane okresy pobytu przy łączeniu rodzin oraz ułatwiony dostęp do rynku pracy w innych państwach członkowskich UE. Pomagamy w pełnym procesie aplikacyjnym, od weryfikacji uprawnień po reprezentację przed urzędem."
        ),
        forWhom: pl(
          "Specjaliści IT, inżynierowie, lekarze, kadra managerska i inni wysoko wykwalifikowani specjaliści."
        ),
        requiredDocuments: plList([
          "Wniosek o udzielenie zezwolenia na pobyt czasowy w celu wykonywania pracy w zawodzie wymagającym wysokich kwalifikacji",
          "Dyplom ukończenia studiów wyższych (uznany w Polsce)",
          "Umowa o pracę lub oferta pracy na co najmniej rok",
          "Potwierdzenie wynagrodzenia powyżej wymaganego progu",
          "Cztery fotografie",
          "Kopia ważnego dokumentu podróży",
          "Potwierdzenie ubezpieczenia zdrowotnego",
        ]),
        estimatedTime: pl("Od 2 do 4 miesięcy"),
        price: null,
      },
      {
        slug: "wymiana-karty-pobytu",
        categorySlug: "legalizacja-pobytu",
        order: 4,
        title: pl("Wymiana Karty Pobytu"),
        shortDescription: pl(
          "Procedura wymiany karty pobytu w razie utraty, zniszczenia, zmiany danych lub upływu terminu ważności."
        ),
        fullDescription: pl(
          "Wymiana karty pobytu jest konieczna w sytuacjach takich jak utrata dokumentu, jego uszkodzenie lub zniszczenie, zmiana danych osobowych (np. nazwiska po zawarciu małżeństwa), zmiana wizerunku oraz upływ terminu ważności samej karty (przy utrzymującym się zezwoleniu na pobyt). Pomagamy szybko skompletować wniosek i dokumenty, aby cudzoziemiec uniknął luki w posiadaniu ważnego dokumentu pobytowego."
        ),
        forWhom: pl(
          "Posiadacze istniejącej karty pobytu, którzy potrzebują nowego egzemplarza dokumentu."
        ),
        requiredDocuments: plList([
          "Wniosek o wymianę karty pobytu",
          "Aktualna fotografia",
          "Kopia ważnego dokumentu podróży",
          "Dotychczasowa karta pobytu (jeśli posiadana)",
          "Dokument potwierdzający zmianę danych (jeśli dotyczy)",
          "Potwierdzenie wpłaty opłaty",
        ]),
        estimatedTime: pl("Od 30 do 60 dni"),
        price: null,
      },
    ],
  },

  /* ====================== 3. POBYTY DŁUGOTERMINOWE ======================== */
  {
    slug: "pobyty-dlugoterminowe",
    icon: "MapPin",
    order: 3,
    title: pl("Pobyty długoterminowe"),
    description: pl(
      "Status rezydenta długoterminowego UE oraz pobyt stały w Polsce."
    ),
    services: [
      {
        slug: "rezydent-dlugoterminowy-ue",
        categorySlug: "pobyty-dlugoterminowe",
        order: 1,
        title: pl("Rezydent długoterminowy UE"),
        shortDescription: pl(
          "Status dający prawo stałego pobytu w Polsce i ułatwienia w przemieszczaniu się w UE — wymaga 5 lat legalnego pobytu."
        ),
        fullDescription: pl(
          "Status rezydenta długoterminowego UE jest dokumentem pobytowym dającym posiadaczowi szerokie uprawnienia: prawo stałego pobytu w Polsce oraz znaczne ułatwienia w przemieszczaniu się i osiedlaniu w innych państwach członkowskich UE. Wymaga spełnienia kilku warunków: 5 lat nieprzerwanego legalnego pobytu w Polsce, stabilnego i regularnego źródła dochodu wystarczającego na utrzymanie siebie i rodziny, ubezpieczenia zdrowotnego oraz zapewnionego miejsca zamieszkania. Reprezentujemy klienta na każdym etapie postępowania."
        ),
        forWhom: pl(
          "Cudzoziemcy legalnie mieszkający w Polsce od co najmniej 5 lat, ze stabilnym dochodem."
        ),
        requiredDocuments: plList([
          "Wniosek o udzielenie zezwolenia na pobyt rezydenta długoterminowego UE",
          "Cztery fotografie",
          "Kopia ważnego dokumentu podróży",
          "Dokumenty potwierdzające 5 lat nieprzerwanego legalnego pobytu",
          "Dokumenty potwierdzające źródło stabilnego dochodu",
          "Potwierdzenie posiadania ubezpieczenia zdrowotnego",
          "Potwierdzenie tytułu prawnego do lokalu mieszkalnego",
          "Zaświadczenie o znajomości języka polskiego (poziom B1)",
        ]),
        estimatedTime: pl("Od 3 do 6 miesięcy"),
        price: null,
      },
      {
        slug: "pobyt-staly",
        categorySlug: "pobyty-dlugoterminowe",
        order: 2,
        title: pl("Pobyt stały"),
        shortDescription: pl(
          "Bezterminowe zezwolenie na pobyt w Polsce — krok przed wnioskiem o obywatelstwo."
        ),
        fullDescription: pl(
          "Zezwolenie na pobyt stały to bezterminowe zezwolenie pobytowe — ostatni krok przed złożeniem wniosku o obywatelstwo polskie. Aby je uzyskać, cudzoziemiec musi spełniać określone warunki: pochodzenie polskie, małżeństwo z obywatelem Polski (po określonym okresie), posiadanie Karty Polaka, status uchodźcy lub ochrony uzupełniającej, albo określony okres legalnego pobytu w Polsce na podstawie wcześniejszego zezwolenia. Pomagamy zweryfikować podstawę prawną wniosku i prowadzimy klienta przez cały proces aż do otrzymania karty pobytu stałego."
        ),
        forWhom: pl(
          "Cudzoziemcy z tytułem uprawniającym do pobytu stałego (pochodzenie polskie, małżeństwo, Karta Polaka, długi pobyt)."
        ),
        requiredDocuments: plList([
          "Wniosek o udzielenie zezwolenia na pobyt stały",
          "Cztery fotografie",
          "Kopia ważnego dokumentu podróży",
          "Dokumenty potwierdzające podstawę prawną wniosku (np. akt małżeństwa, Karta Polaka, dokumenty potwierdzające pochodzenie polskie)",
          "Zaświadczenie o znajomości języka polskiego (jeśli wymagane)",
          "Potwierdzenie zameldowania",
        ]),
        estimatedTime: pl("Od 3 do 6 miesięcy"),
        price: null,
      },
    ],
  },

  /* ====================== 4. PROCEDURA ODWOŁAWCZA ========================= */
  {
    slug: "procedura-odwolawcza",
    icon: "Scale",
    order: 4,
    title: pl("Procedura odwoławcza"),
    description: pl(
      "Reprezentacja w przypadku przewlekłości postępowania lub negatywnej decyzji urzędu."
    ),
    services: [
      {
        slug: "ponaglenia-i-odwolania",
        categorySlug: "procedura-odwolawcza",
        order: 1,
        title: pl("Ponaglenia i odwołania w sprawach pobytowych"),
        shortDescription: pl(
          "Reprezentacja w przypadku przewlekłości postępowania (ponaglenie) lub negatywnej decyzji wojewody (odwołanie)."
        ),
        fullDescription: pl(
          "Reprezentujemy klienta w dwóch sytuacjach krytycznych: gdy postępowanie pobytowe się przedłuża (ponaglenie kierowane do organu wyższego stopnia) oraz gdy wojewoda wydał decyzję odmowną (odwołanie do Szefa Urzędu do Spraw Cudzoziemców). Przygotowujemy profesjonalne pisma procesowe wraz z argumentacją prawną, kompletujemy dodatkowe dowody w sprawie i reprezentujemy klienta przed organem na każdym etapie. W wielu przypadkach skuteczne odwołanie zmienia decyzję odmowną na pozytywną."
        ),
        forWhom: pl(
          "Cudzoziemcy, których sprawa utknęła w urzędzie lub którzy otrzymali decyzję odmowną."
        ),
        requiredDocuments: plList([
          "Decyzja wojewody (w przypadku odwołania)",
          "Pełnomocnictwo do reprezentacji",
          "Kompletna dotychczasowa dokumentacja sprawy",
          "Dodatkowe dowody na okoliczności sprawy",
          "Aktualne dokumenty potwierdzające status pobytowy",
        ]),
        estimatedTime: pl("Od 1 do 4 miesięcy"),
        price: null,
      },
    ],
  },

  /* ====================== 5. TŁUMACZENIA PRZYSIĘGŁE ======================= */
  {
    slug: "tlumaczenia-przysiegle",
    icon: "Languages",
    order: 5,
    title: pl("Tłumaczenia przysięgłe"),
    description: pl(
      "Pomoc w uzyskaniu tłumaczeń przysięgłych dokumentów wymaganych w procedurach legalizacyjnych."
    ),
    services: [
      {
        slug: "tlumaczenia-przysiegle-dokumentow",
        categorySlug: "tlumaczenia-przysiegle",
        order: 1,
        title: pl("Tłumaczenia przysięgłe dokumentów"),
        shortDescription: pl(
          "Tłumaczenia uwierzytelnione dokumentów potrzebnych w procedurach pobytowych i pracowniczych."
        ),
        fullDescription: pl(
          "Współpracujemy z tłumaczami przysięgłymi różnych języków — pomagamy klientowi szybko uzyskać tłumaczenia przysięgłe dokumentów potrzebnych w procedurach legalizacyjnych: aktów urodzenia, aktów małżeństwa, zaświadczeń o niekaralności, dyplomów ukończenia studiów, świadectw pracy, umów o pracę, wyciągów z rejestrów handlowych i innych dokumentów wydanych za granicą. Bierzemy na siebie cały proces komunikacji z tłumaczem — klient otrzymuje gotowe, prawidłowo uwierzytelnione tłumaczenia gotowe do złożenia w urzędzie."
        ),
        forWhom: pl(
          "Wszyscy klienci procedur legalizacyjnych wymagających dokumentów wydanych za granicą."
        ),
        requiredDocuments: plList([
          "Oryginał dokumentu lub poświadczona kopia",
          "Apostille lub legalizacja konsularna (jeśli wymagana)",
          "Wskazanie języka źródłowego i docelowego",
        ]),
        estimatedTime: pl("Od 3 do 14 dni"),
        price: null,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                              SYNCHRONICZNE INDEKSY                         */
/* -------------------------------------------------------------------------- */

/** Płaska lista wszystkich usług ze wszystkich kategorii. */
export const ALL_SERVICES: Service[] = SERVICE_CATEGORIES.flatMap(
  (c) => c.services
);

/** Mapa slug → Service dla szybkiego lookupu. */
const SERVICES_BY_SLUG: Record<string, Service> = Object.fromEntries(
  ALL_SERVICES.map((s) => [s.slug, s])
);

/** Mapa slug → ServiceCategory. */
const CATEGORIES_BY_SLUG: Record<string, ServiceCategory> = Object.fromEntries(
  SERVICE_CATEGORIES.map((c) => [c.slug, c])
);

/* -------------------------------------------------------------------------- */
/*                                 ASYNC API                                  */
/* -------------------------------------------------------------------------- */

/**
 * Zwraca wszystkie kategorie wraz z usługami, posortowane wg `order`.
 * Async — gotowe pod migrację na headless CMS (Sanity, Contentful, Strapi).
 */
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  return [...SERVICE_CATEGORIES].sort((a, b) => a.order - b.order);
}

/** Pojedyncza usługa po slug-u (lub `null`). */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  return SERVICES_BY_SLUG[slug] ?? null;
}

/** Pojedyncza kategoria po slug-u (lub `null`). */
export async function getServiceCategoryBySlug(
  slug: string
): Promise<ServiceCategory | null> {
  return CATEGORIES_BY_SLUG[slug] ?? null;
}

/** Płaska lista wszystkich usług, posortowana wg kategorii i `order`. */
export async function getAllServices(): Promise<Service[]> {
  const cats = await getServiceCategories();
  return cats.flatMap((c) => [...c.services].sort((a, b) => a.order - b.order));
}
