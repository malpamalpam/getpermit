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

/** Tworzy `LocalizedString` z tekstów per locale. */
const loc = (pl_: string, en_: string, ru_: string, uk_: string): LocalizedString => ({
  pl: pl_, en: en_, ru: ru_, uk: uk_,
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
  /* ====================== 1. LEGALIZACJA POBYTU I PRACY ================== */
  {
    slug: "legalizacja-pobytu",
    icon: "Home",
    order: 1,
    title: loc("Legalizacja pobytu i pracy", "Residence and work legalization", "\u041b\u0435\u0433\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u044f \u0438 \u0440\u0430\u0431\u043e\u0442\u044b", "\u041b\u0435\u0433\u0430\u043b\u0456\u0437\u0430\u0446\u0456\u044f \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0442\u0430 \u0440\u043e\u0431\u043e\u0442\u0438"),
    description: loc(
      "Zezwolenia na pobyt i prac\u0119, EU Blue Card, wymiana dokument\u00f3w i legalizacja na podstawie FDK.",
      "Residence and work permits, EU Blue Card, document exchange and FDK-based legalization.",
      "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u044f \u043d\u0430 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0438 \u0440\u0430\u0431\u043e\u0442\u0443, EU Blue Card \u0438 \u0437\u0430\u043c\u0435\u043d\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432.",
      "\u0414\u043e\u0437\u0432\u043e\u043b\u0438 \u043d\u0430 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0442\u0430 \u0440\u043e\u0431\u043e\u0442\u0443, EU Blue Card \u0442\u0430 \u0437\u0430\u043c\u0456\u043d\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0456\u0432."
    ),
    services: [
      {
        slug: "zezwolenie-na-pobyt-czasowy-i-prace",
        categorySlug: "legalizacja-pobytu",
        order: 1,
        title: loc("Zezwolenie na pobyt i prac\u0119", "Residence and work permit", "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0438 \u0440\u0430\u0431\u043e\u0442\u0443", "\u0414\u043e\u0437\u0432\u0456\u043b \u043d\u0430 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0442\u0430 \u0440\u043e\u0431\u043e\u0442\u0443"),
        shortDescription: loc(
          "Tzw. \u201ejedno zezwolenie\u201d \u2014 \u0142\u0105czy pobyt z prawem do pracy u konkretnego pracodawcy. Najpopularniejsza \u015bcie\u017cka.",
          "The \"single permit\" \u2014 combines residence with the right to work for a specific employer. The most popular path.",
          "\u00ab\u0415\u0434\u0438\u043d\u043e\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435\u00bb \u2014 \u043e\u0431\u044a\u0435\u0434\u0438\u043d\u044f\u0435\u0442 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0441 \u043f\u0440\u0430\u0432\u043e\u043c \u0440\u0430\u0431\u043e\u0442\u044b \u0443 \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u043e\u0433\u043e \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044f.",
          "\u00ab\u0404\u0434\u0438\u043d\u0438\u0439 \u0434\u043e\u0437\u0432\u0456\u043b\u00bb \u2014 \u043f\u043e\u0454\u0434\u043d\u0443\u0454 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0437 \u043f\u0440\u0430\u0432\u043e\u043c \u043d\u0430 \u0440\u043e\u0431\u043e\u0442\u0443 \u0443 \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u043e\u0433\u043e \u0440\u043e\u0431\u043e\u0442\u043e\u0434\u0430\u0432\u0446\u044f."
        ),
        fullDescription: pl(
          "Zezwolenie na pobyt czasowy i pracę, znane jako \u201ejedno zezwolenie\u201d, to najpopularniejsza ścieżka dla cudzoziemców spoza UE pracujących w Polsce. Łączy w sobie zezwolenie pobytowe i prawo do wykonywania pracy u konkretnego pracodawcy — eliminuje konieczność prowadzenia dwóch równoległych postępowań. Reprezentujemy zarówno cudzoziemca, jak i pracodawcę przed wojewodą, dbając o pełną zgodność dokumentacji z aktualnymi wymogami prawnymi."
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
        slug: "karta-pobytu-czasowego",
        categorySlug: "legalizacja-pobytu",
        order: 2,
        title: loc("Zezwolenie na pobyt czasowy", "Temporary residence permit", "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435", "\u0414\u043e\u0437\u0432\u0456\u043b \u043d\u0430 \u0442\u0438\u043c\u0447\u0430\u0441\u043e\u0432\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f"),
        shortDescription: loc(
          "Karta pobytu wydawana przez wojewod\u0119 na okres do 3 lat \u2014 dla studi\u00f3w, rodziny, dzia\u0142alno\u015bci i innych cel\u00f3w.",
          "Residence card issued by the voivode for up to 3 years \u2014 for studies, family, business and other purposes.",
          "\u041a\u0430\u0440\u0442\u0430 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u044f, \u0432\u044b\u0434\u0430\u0432\u0430\u0435\u043c\u0430\u044f \u0432\u043e\u0435\u0432\u043e\u0434\u043e\u0439 \u043d\u0430 \u0441\u0440\u043e\u043a \u0434\u043e 3 \u043b\u0435\u0442 \u2014 \u0434\u043b\u044f \u0443\u0447\u0451\u0431\u044b, \u0441\u0435\u043c\u044c\u0438, \u0431\u0438\u0437\u043d\u0435\u0441\u0430 \u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u0446\u0435\u043b\u0435\u0439.",
          "\u041a\u0430\u0440\u0442\u0430 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f, \u0449\u043e \u0432\u0438\u0434\u0430\u0454\u0442\u044c\u0441\u044f \u0432\u043e\u0454\u0432\u043e\u0434\u043e\u044e \u043d\u0430 \u0442\u0435\u0440\u043c\u0456\u043d \u0434\u043e 3 \u0440\u043e\u043a\u0456\u0432 \u2014 \u0434\u043b\u044f \u043d\u0430\u0432\u0447\u0430\u043d\u043d\u044f, \u0441\u0456\u043c'\u0457, \u0431\u0456\u0437\u043d\u0435\u0441\u0443 \u0442\u0430 \u0456\u043d\u0448\u0438\u0445 \u0446\u0456\u043b\u0435\u0439."
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
        slug: "legalizacja-fdk",
        categorySlug: "legalizacja-pobytu",
        order: 5,
        title: pl("Legalizacja na podstawie Fundacji Firma Dla Każdego"),
        shortDescription: pl(
          "Legalizacja pobytu i pracy za pośrednictwem Fundacji Firma Dla Każdego — dedykowana ścieżka dla cudzoziemców prowadzących działalność."
        ),
        fullDescription: pl(
          "Legalizacja pobytu i pracy na podstawie współpracy z Fundacją Firma Dla Każdego. Fundacja wspiera cudzoziemców w zakładaniu i prowadzeniu działalności gospodarczej w Polsce, co stanowi jedną ze ścieżek uzyskania zezwolenia na pobyt czasowy. Pomagamy w przygotowaniu kompletnej dokumentacji, reprezentacji przed urzędem i koordynacji z fundacją."
        ),
        forWhom: pl(
          "Cudzoziemcy chcący zalegalizować pobyt poprzez prowadzenie działalności gospodarczej we współpracy z Fundacją Firma Dla Każdego."
        ),
        requiredDocuments: plList([
          "Wniosek o udzielenie zezwolenia na pobyt czasowy",
          "Dokumenty rejestrowe działalności",
          "Dokumenty potwierdzające współpracę z Fundacją Firma Dla Każdego",
          "Cztery fotografie",
          "Kopia ważnego dokumentu podróży",
          "Potwierdzenie ubezpieczenia zdrowotnego",
          "Potwierdzenie miejsca zamieszkania",
        ]),
        estimatedTime: pl("Od 3 do 6 miesięcy"),
        price: null,
      },
      {
        slug: "eu-blue-card",
        categorySlug: "legalizacja-pobytu",
        order: 3,
        title: loc("EU Blue Card", "EU Blue Card", "EU Blue Card", "EU Blue Card"),
        shortDescription: loc(
          "Zezwolenie dla wysoko wykwalifikowanych specjalist\u00f3w \u2014 u\u0142atwiony dost\u0119p do rynku pracy w ca\u0142ej UE.",
          "Permit for highly qualified specialists \u2014 easier access to the EU labor market.",
          "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u0434\u043b\u044f \u0432\u044b\u0441\u043e\u043a\u043e\u043a\u0432\u0430\u043b\u0438\u0444\u0438\u0446\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u043e\u0432 \u2014 \u0443\u043f\u0440\u043e\u0449\u0451\u043d\u043d\u044b\u0439 \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u0440\u044b\u043d\u043a\u0443 \u0442\u0440\u0443\u0434\u0430 \u0432 \u0415\u0421.",
          "\u0414\u043e\u0437\u0432\u0456\u043b \u0434\u043b\u044f \u0432\u0438\u0441\u043e\u043a\u043e\u043a\u0432\u0430\u043b\u0456\u0444\u0456\u043a\u043e\u0432\u0430\u043d\u0438\u0445 \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u0456\u0432 \u2014 \u0441\u043f\u0440\u043e\u0449\u0435\u043d\u0438\u0439 \u0434\u043e\u0441\u0442\u0443\u043f \u0434\u043e \u0440\u0438\u043d\u043a\u0443 \u043f\u0440\u0430\u0446\u0456 \u0404\u0421."
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
        title: loc("Wymiana karty pobytu", "Residence card replacement", "\u0417\u0430\u043c\u0435\u043d\u0430 \u043a\u0430\u0440\u0442\u044b \u043f\u043e\u0431\u044b\u0442\u0443", "\u0417\u0430\u043c\u0456\u043d\u0430 \u043a\u0430\u0440\u0442\u0438 \u043f\u043e\u0431\u0443\u0442\u0443"),
        shortDescription: loc(
          "Procedura wymiany karty pobytu w razie utraty, zniszczenia, zmiany danych lub up\u0142ywu terminu wa\u017cno\u015bci.",
          "Residence card replacement procedure in case of loss, damage, data change or expiration.",
          "\u041f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0430 \u0437\u0430\u043c\u0435\u043d\u044b \u043a\u0430\u0440\u0442\u044b \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u044f \u0432 \u0441\u043b\u0443\u0447\u0430\u0435 \u0443\u0442\u0435\u0440\u0438, \u043f\u043e\u0432\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u044f, \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0434\u0430\u043d\u043d\u044b\u0445 \u0438\u043b\u0438 \u0438\u0441\u0442\u0435\u0447\u0435\u043d\u0438\u044f \u0441\u0440\u043e\u043a\u0430.",
          "\u041f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0430 \u0437\u0430\u043c\u0456\u043d\u0438 \u043a\u0430\u0440\u0442\u0438 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0443 \u0440\u0430\u0437\u0456 \u0432\u0442\u0440\u0430\u0442\u0438, \u043f\u043e\u0448\u043a\u043e\u0434\u0436\u0435\u043d\u043d\u044f, \u0437\u043c\u0456\u043d\u0438 \u0434\u0430\u043d\u0438\u0445 \u0430\u0431\u043e \u0437\u0430\u043a\u0456\u043d\u0447\u0435\u043d\u043d\u044f \u0442\u0435\u0440\u043c\u0456\u043d\u0443."
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
    title: loc("Pobyty d\u0142ugoterminowe", "Long-term residence", "\u0414\u043e\u043b\u0433\u043e\u0441\u0440\u043e\u0447\u043d\u043e\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435", "\u0414\u043e\u0432\u0433\u043e\u0441\u0442\u0440\u043e\u043a\u043e\u0432\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f"),
    description: loc(
      "Status rezydenta d\u0142ugoterminowego UE oraz pobyt sta\u0142y w Polsce.",
      "EU long-term resident status and permanent residence in Poland.",
      "\u0421\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u043b\u0433\u043e\u0441\u0440\u043e\u0447\u043d\u043e\u0433\u043e \u0440\u0435\u0437\u0438\u0434\u0435\u043d\u0442\u0430 \u0415\u0421 \u0438 \u043f\u043e\u0441\u0442\u043e\u044f\u043d\u043d\u043e\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0432 \u041f\u043e\u043b\u044c\u0448\u0435.",
      "\u0421\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u0432\u0433\u043e\u0441\u0442\u0440\u043e\u043a\u043e\u0432\u043e\u0433\u043e \u0440\u0435\u0437\u0438\u0434\u0435\u043d\u0442\u0430 \u0404\u0421 \u0442\u0430 \u043f\u043e\u0441\u0442\u0456\u0439\u043d\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0432 \u041f\u043e\u043b\u044c\u0449\u0456."
    ),
    services: [
      {
        slug: "rezydent-dlugoterminowy-ue",
        categorySlug: "pobyty-dlugoterminowe",
        order: 1,
        title: loc("Rezydent d\u0142ugoterminowy UE", "EU long-term resident", "\u0414\u043e\u043b\u0433\u043e\u0441\u0440\u043e\u0447\u043d\u044b\u0439 \u0440\u0435\u0437\u0438\u0434\u0435\u043d\u0442 \u0415\u0421", "\u0414\u043e\u0432\u0433\u043e\u0441\u0442\u0440\u043e\u043a\u043e\u0432\u0438\u0439 \u0440\u0435\u0437\u0438\u0434\u0435\u043d\u0442 \u0404\u0421"),
        shortDescription: loc(
          "Status daj\u0105cy prawo sta\u0142ego pobytu w Polsce i u\u0142atwienia w przemieszczaniu si\u0119 w UE \u2014 wymaga 5 lat legalnego pobytu.",
          "Status granting permanent residence in Poland and facilitating movement within the EU \u2014 requires 5 years of legal residence.",
          "\u0421\u0442\u0430\u0442\u0443\u0441, \u0434\u0430\u044e\u0449\u0438\u0439 \u043f\u0440\u0430\u0432\u043e \u043d\u0430 \u043f\u043e\u0441\u0442\u043e\u044f\u043d\u043d\u043e\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0432 \u041f\u043e\u043b\u044c\u0448\u0435 \u2014 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 5 \u043b\u0435\u0442 \u043b\u0435\u0433\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u044f.",
          "\u0421\u0442\u0430\u0442\u0443\u0441, \u0449\u043e \u0434\u0430\u0454 \u043f\u0440\u0430\u0432\u043e \u043d\u0430 \u043f\u043e\u0441\u0442\u0456\u0439\u043d\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0432 \u041f\u043e\u043b\u044c\u0449\u0456 \u2014 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e 5 \u0440\u043e\u043a\u0456\u0432 \u043b\u0435\u0433\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f."
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
        slug: "karta-stalego-pobytu",
        categorySlug: "pobyty-dlugoterminowe",
        order: 2,
        title: loc("Pobyt sta\u0142y", "Permanent residence", "\u041f\u043e\u0441\u0442\u043e\u044f\u043d\u043d\u043e\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435", "\u041f\u043e\u0441\u0442\u0456\u0439\u043d\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f"),
        shortDescription: loc(
          "Bezterminowe zezwolenie na pobyt w Polsce \u2014 krok przed wnioskiem o obywatelstwo.",
          "Indefinite residence permit in Poland \u2014 a step before applying for citizenship.",
          "\u0411\u0435\u0441\u0441\u0440\u043e\u0447\u043d\u043e\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0432 \u041f\u043e\u043b\u044c\u0448\u0435 \u2014 \u0448\u0430\u0433 \u043f\u0435\u0440\u0435\u0434 \u0437\u0430\u044f\u0432\u043b\u0435\u043d\u0438\u0435\u043c \u043d\u0430 \u0433\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u0442\u0432\u043e.",
          "\u0411\u0435\u0437\u0441\u0442\u0440\u043e\u043a\u043e\u0432\u0438\u0439 \u0434\u043e\u0437\u0432\u0456\u043b \u043d\u0430 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0432 \u041f\u043e\u043b\u044c\u0449\u0456 \u2014 \u043a\u0440\u043e\u043a \u043f\u0435\u0440\u0435\u0434 \u0437\u0430\u044f\u0432\u043e\u044e \u043d\u0430 \u0433\u0440\u043e\u043c\u0430\u0434\u044f\u043d\u0441\u0442\u0432\u043e."
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
    title: loc("Procedura odwo\u0142awcza", "Appeals procedure", "\u041f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0430 \u043e\u0431\u0436\u0430\u043b\u043e\u0432\u0430\u043d\u0438\u044f", "\u041f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0430 \u043e\u0441\u043a\u0430\u0440\u0436\u0435\u043d\u043d\u044f"),
    description: loc(
      "Reprezentacja w przypadku przewlek\u0142o\u015bci post\u0119powania lub negatywnej decyzji urz\u0119du.",
      "Representation in case of procedural delays or negative decisions from authorities.",
      "\u041f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e \u043f\u0440\u0438 \u0437\u0430\u0442\u044f\u0433\u0438\u0432\u0430\u043d\u0438\u0438 \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u044b \u0438\u043b\u0438 \u043e\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u043c \u0440\u0435\u0448\u0435\u043d\u0438\u0438.",
      "\u041f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043d\u0438\u0446\u0442\u0432\u043e \u043f\u0440\u0438 \u0437\u0430\u0442\u044f\u0433\u0443\u0432\u0430\u043d\u043d\u0456 \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0438 \u0430\u0431\u043e \u043d\u0435\u0433\u0430\u0442\u0438\u0432\u043d\u043e\u043c\u0443 \u0440\u0456\u0448\u0435\u043d\u043d\u0456."
    ),
    services: [
      {
        slug: "ponaglenia-i-odwolania",
        categorySlug: "procedura-odwolawcza",
        order: 1,
        title: loc("Ponaglenia i odwo\u0142ania", "Appeals and complaints", "\u0416\u0430\u043b\u043e\u0431\u044b \u0438 \u0430\u043f\u0435\u043b\u043b\u044f\u0446\u0438\u0438", "\u0421\u043a\u0430\u0440\u0433\u0438 \u0442\u0430 \u0430\u043f\u0435\u043b\u044f\u0446\u0456\u0457"),
        shortDescription: loc(
          "Reprezentacja w przypadku przewlek\u0142o\u015bci post\u0119powania (ponaglenie) lub negatywnej decyzji wojewody (odwo\u0142anie).",
          "Representation in case of procedural delays (urgency complaint) or negative voivode decisions (appeal).",
          "\u041f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e \u043f\u0440\u0438 \u0437\u0430\u0442\u044f\u0436\u043a\u0435 \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u044b (\u0443\u0441\u043a\u043e\u0440\u0435\u043d\u0438\u0435) \u0438\u043b\u0438 \u043e\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u043c \u0440\u0435\u0448\u0435\u043d\u0438\u0438 (\u0430\u043f\u0435\u043b\u043b\u044f\u0446\u0438\u044f).",
          "\u041f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043d\u0438\u0446\u0442\u0432\u043e \u043f\u0440\u0438 \u0437\u0430\u0442\u044f\u0433\u0443\u0432\u0430\u043d\u043d\u0456 \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0438 (\u043f\u0440\u0438\u0441\u043a\u043e\u0440\u0435\u043d\u043d\u044f) \u0430\u0431\u043e \u043d\u0435\u0433\u0430\u0442\u0438\u0432\u043d\u043e\u043c\u0443 \u0440\u0456\u0448\u0435\u043d\u043d\u0456 (\u0430\u043f\u0435\u043b\u044f\u0446\u0456\u044f)."
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
    title: loc("T\u0142umaczenia przysi\u0119g\u0142e", "Sworn translations", "\u041f\u0440\u0438\u0441\u044f\u0436\u043d\u044b\u0435 \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u044b", "\u041f\u0440\u0438\u0441\u044f\u0436\u043d\u0456 \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434\u0438"),
    description: loc(
      "Pomoc w uzyskaniu t\u0142umacze\u0144 przysi\u0119g\u0142ych dokument\u00f3w wymaganych w procedurach legalizacyjnych.",
      "Help with obtaining sworn translations of documents required in legalization procedures.",
      "\u041f\u043e\u043c\u043e\u0449\u044c \u0432 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u0438 \u043f\u0440\u0438\u0441\u044f\u0436\u043d\u044b\u0445 \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u043e\u0432 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432 \u0434\u043b\u044f \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440 \u043b\u0435\u0433\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438.",
      "\u0414\u043e\u043f\u043e\u043c\u043e\u0433\u0430 \u0432 \u043e\u0442\u0440\u0438\u043c\u0430\u043d\u043d\u0456 \u043f\u0440\u0438\u0441\u044f\u0436\u043d\u0438\u0445 \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434\u0456\u0432 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0456\u0432 \u0434\u043b\u044f \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440 \u043b\u0435\u0433\u0430\u043b\u0456\u0437\u0430\u0446\u0456\u0457."
    ),
    services: [
      {
        slug: "tlumaczenia-przysiegle",
        categorySlug: "tlumaczenia-przysiegle",
        order: 1,
        title: loc("T\u0142umaczenia przysi\u0119g\u0142e dokument\u00f3w", "Sworn document translations", "\u041f\u0440\u0438\u0441\u044f\u0436\u043d\u044b\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0434 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432", "\u041f\u0440\u0438\u0441\u044f\u0436\u043d\u0438\u0439 \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0456\u0432"),
        shortDescription: loc(
          "T\u0142umaczenia uwierzytelnione dokument\u00f3w potrzebnych w procedurach pobytowych i pracowniczych.",
          "Certified translations of documents required for residence and employment procedures.",
          "\u041f\u0440\u0438\u0441\u044f\u0436\u043d\u044b\u0435 \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u044b \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432 \u0434\u043b\u044f \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u044f \u0438 \u0442\u0440\u0443\u0434\u043e\u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430.",
          "\u041f\u0440\u0438\u0441\u044f\u0436\u043d\u0456 \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434\u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0456\u0432 \u0434\u043b\u044f \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0442\u0430 \u043f\u0440\u0430\u0446\u0435\u0432\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f."
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

  /* ====================== 6. DLA PRACODAWC\u00d3W (Legalizacja pracy) ======== */
  {
    slug: "dla-pracodawcow",
    icon: "Briefcase",
    order: 6,
    title: loc(
      "Dla Pracodawc\u00f3w",
      "For Employers",
      "\u0414\u043b\u044f \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u0435\u0439",
      "\u0414\u043b\u044f \u0440\u043e\u0431\u043e\u0442\u043e\u0434\u0430\u0432\u0446\u0456\u0432"
    ),
    description: loc(
      "Legalizacja pracy cudzoziemc\u00f3w, zezwolenia, o\u015bwiadczenia, powiadomienia \u2014 kompleksowa obs\u0142uga pracodawc\u00f3w.",
      "Work legalization for foreigners, permits, declarations, notifications \u2014 comprehensive employer service.",
      "\u041b\u0435\u0433\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f \u0440\u0430\u0431\u043e\u0442\u044b \u0438\u043d\u043e\u0441\u0442\u0440\u0430\u043d\u0446\u0435\u0432, \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u044f, \u0437\u0430\u044f\u0432\u043b\u0435\u043d\u0438\u044f \u2014 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0441\u043d\u043e\u0435 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u0435.",
      "\u041b\u0435\u0433\u0430\u043b\u0456\u0437\u0430\u0446\u0456\u044f \u0440\u043e\u0431\u043e\u0442\u0438 \u0456\u043d\u043e\u0437\u0435\u043c\u0446\u0456\u0432, \u0434\u043e\u0437\u0432\u043e\u043b\u0438, \u0437\u0430\u044f\u0432\u0438 \u2014 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0441\u043d\u0435 \u043e\u0431\u0441\u043b\u0443\u0433\u043e\u0432\u0443\u0432\u0430\u043d\u043d\u044f."
    ),
    services: [
      {
        slug: "zezwolenie-na-prace",
        categorySlug: "dla-pracodawcow",
        order: 1,
        title: loc("Zezwolenie na prac\u0119", "Work permit", "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u0440\u0430\u0431\u043e\u0442\u0443", "\u0414\u043e\u0437\u0432\u0456\u043b \u043d\u0430 \u0440\u043e\u0431\u043e\u0442\u0443"),
        shortDescription: loc(
          "Zezwolenie wydawane przez wojewod\u0119 dla cudzoziemc\u00f3w spoza UE \u2014 wszystkie typy A, B, C, D, E.",
          "Permit issued by the voivode for non-EU foreigners \u2014 all types A, B, C, D, E.",
          "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435, \u0432\u044b\u0434\u0430\u0432\u0430\u0435\u043c\u043e\u0435 \u0432\u043e\u0435\u0432\u043e\u0434\u043e\u0439 \u0434\u043b\u044f \u0438\u043d\u043e\u0441\u0442\u0440\u0430\u043d\u0446\u0435\u0432 \u0438\u0437-\u0437\u0430 \u043f\u0440\u0435\u0434\u0435\u043b\u043e\u0432 \u0415\u0421 \u2014 \u0432\u0441\u0435 \u0442\u0438\u043f\u044b A, B, C, D, E.",
          "\u0414\u043e\u0437\u0432\u0456\u043b, \u0449\u043e \u0432\u0438\u0434\u0430\u0454\u0442\u044c\u0441\u044f \u0432\u043e\u0454\u0432\u043e\u0434\u043e\u044e \u0434\u043b\u044f \u0456\u043d\u043e\u0437\u0435\u043c\u0446\u0456\u0432 \u0437-\u043f\u043e\u0437\u0430 \u0404\u0421 \u2014 \u0432\u0441\u0456 \u0442\u0438\u043f\u0438 A, B, C, D, E."
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
        slug: "oswiadczenie-o-powierzeniu-pracy",
        categorySlug: "dla-pracodawcow",
        order: 2,
        title: loc("O\u015bwiadczenie o powierzeniu pracy", "Employer declaration", "\u0417\u0430\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u043e \u043f\u043e\u0440\u0443\u0447\u0435\u043d\u0438\u0438 \u0440\u0430\u0431\u043e\u0442\u044b", "\u0417\u0430\u044f\u0432\u0430 \u043f\u0440\u043e \u0434\u043e\u0440\u0443\u0447\u0435\u043d\u043d\u044f \u0440\u043e\u0431\u043e\u0442\u0438"),
        shortDescription: loc(
          "Uproszczona procedura dla obywateli Ukrainy, Bia\u0142orusi, Rosji, Mo\u0142dawii, Gruzji i Armenii \u2014 praca do 24 miesi\u0119cy.",
          "Simplified procedure for citizens of Ukraine, Belarus, Russia, Moldova, Georgia and Armenia \u2014 work up to 24 months.",
          "\u0423\u043f\u0440\u043e\u0449\u0451\u043d\u043d\u0430\u044f \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0430 \u0434\u043b\u044f \u0433\u0440\u0430\u0436\u0434\u0430\u043d \u0423\u043a\u0440\u0430\u0438\u043d\u044b, \u0411\u0435\u043b\u0430\u0440\u0443\u0441\u0438, \u0420\u043e\u0441\u0441\u0438\u0438, \u041c\u043e\u043b\u0434\u043e\u0432\u044b, \u0413\u0440\u0443\u0437\u0438\u0438 \u0438 \u0410\u0440\u043c\u0435\u043d\u0438\u0438 \u2014 \u0440\u0430\u0431\u043e\u0442\u0430 \u0434\u043e 24 \u043c\u0435\u0441\u044f\u0446\u0435\u0432.",
          "\u0421\u043f\u0440\u043e\u0449\u0435\u043d\u0430 \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0430 \u0434\u043b\u044f \u0433\u0440\u043e\u043c\u0430\u0434\u044f\u043d \u0423\u043a\u0440\u0430\u0457\u043d\u0438, \u0411\u0456\u043b\u043e\u0440\u0443\u0441\u0456, \u0420\u043e\u0441\u0456\u0457, \u041c\u043e\u043b\u0434\u043e\u0432\u0438, \u0413\u0440\u0443\u0437\u0456\u0457 \u0442\u0430 \u0412\u0456\u0440\u043c\u0435\u043d\u0456\u0457 \u2014 \u0440\u043e\u0431\u043e\u0442\u0430 \u0434\u043e 24 \u043c\u0456\u0441\u044f\u0446\u0456\u0432."
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
      {
        slug: "powiadomienia-o-powierzeniu-pracy",
        categorySlug: "dla-pracodawcow",
        order: 3,
        title: pl("Powiadomienia o powierzeniu pracy cudzoziemcowi"),
        shortDescription: pl(
          "Obowi\u0105zek powiadomienia PUP o powierzeniu pracy cudzoziemcowi \u2014 pomoc w terminowym zg\u0142oszeniu i dokumentacji."
        ),
        fullDescription: pl(
          "Pracodawca zatrudniający cudzoziemca ma obowiązek powiadomienia Powiatowego Urzędu Pracy o powierzeniu pracy w określonym terminie. Brak terminowego powiadomienia może skutkować sankcjami. Pomagamy w prawidłowym przygotowaniu i złożeniu powiadomienia, monitorujemy terminy i dbamy o kompletność dokumentacji po stronie pracodawcy."
        ),
        forWhom: pl(
          "Pracodawcy zatrudniający cudzoziemców, którzy muszą spełnić obowiązek powiadomienia PUP."
        ),
        requiredDocuments: plList([
          "Dane cudzoziemca (kopia paszportu)",
          "Dane pracodawcy (KRS, NIP)",
          "Informacje o warunkach zatrudnienia",
          "Kopia oświadczenia lub zezwolenia na pracę",
        ]),
        estimatedTime: pl("Do 7 dni"),
        price: null,
      },
      {
        slug: "legalizacja-pracy-fdk",
        categorySlug: "dla-pracodawcow",
        order: 4,
        title: pl("Legalizacja na podstawie Fundacji Firma Dla Każdego"),
        shortDescription: pl(
          "Legalizacja pracy za po\u015brednictwem Fundacji Firma Dla Ka\u017cdego \u2014 dedykowana \u015bcie\u017cka dla pracodawc\u00f3w i cudzoziemc\u00f3w."
        ),
        fullDescription: pl(
          "Legalizacja pracy na podstawie współpracy z Fundacją Firma Dla Każdego. Fundacja wspiera pracodawców i cudzoziemców w procesie legalizacji zatrudnienia, oferując dedykowane ścieżki proceduralne. Pomagamy w koordynacji z fundacją, przygotowaniu dokumentacji i reprezentacji przed urzędami."
        ),
        forWhom: pl(
          "Pracodawcy i cudzoziemcy korzystający ze wsparcia Fundacji Firma Dla Każdego."
        ),
        requiredDocuments: plList([
          "Dokumenty rejestrowe pracodawcy",
          "Kopia paszportu cudzoziemca",
          "Dokumenty potwierdzające współpracę z Fundacją Firma Dla Każdego",
          "Umowa o pracę lub umowa cywilnoprawna",
        ]),
        estimatedTime: pl("Od 1 do 3 miesięcy"),
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
