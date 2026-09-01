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
 * Tłumaczenia EN/RU/UK zostały dostarczone dla wszystkich usług.
 * PL pozostaje źródłem prawdy.
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

export interface ServiceFaqItem {
  question: LocalizedString;
  answer: LocalizedString;
}

export interface ServiceSection {
  heading: LocalizedString;
  /** HTML content — renderowany przez dangerouslySetInnerHTML */
  body: LocalizedString;
}

export interface Service {
  slug: string;
  categorySlug: string;
  title: LocalizedString;
  shortDescription: LocalizedString;
  fullDescription: LocalizedString;
  forWhom: LocalizedString;
  requiredDocuments: LocalizedList;
  estimatedTime: LocalizedString;
  /** Format "od X zł" lub null, jeśli wycena indywidualna. */
  price: string | null;
  order: number;
  /** Nowe sekcje treściowe — opcjonalne, renderowane w kolejności */
  sections?: ServiceSection[];
  /** FAQ — renderowane jako accordion + FAQPage JSON-LD */
  faq?: ServiceFaqItem[];
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
          "Tzw. \u201ejedno zezwolenie\u201d \u2014 \u0142\u0105czy pobyt z prawem do pracy w Polsce. Najpopularniejsza \u015bcie\u017cka legalizacji.",
          "The \"single permit\" \u2014 combines residence with the right to work in Poland. The most popular legalization path.",
          "\u00ab\u0415\u0434\u0438\u043d\u043e\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435\u00bb \u2014 \u043e\u0431\u044a\u0435\u0434\u0438\u043d\u044f\u0435\u0442 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0441 \u043f\u0440\u0430\u0432\u043e\u043c \u043d\u0430 \u0440\u0430\u0431\u043e\u0442\u0443 \u0432 \u041f\u043e\u043b\u044c\u0448\u0435.",
          "\u00ab\u0404\u0434\u0438\u043d\u0438\u0439 \u0434\u043e\u0437\u0432\u0456\u043b\u00bb \u2014 \u043f\u043e\u0454\u0434\u043d\u0443\u0454 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f \u0437 \u043f\u0440\u0430\u0432\u043e\u043c \u043d\u0430 \u0440\u043e\u0431\u043e\u0442\u0443 \u0432 \u041f\u043e\u043b\u044c\u0449\u0456."
        ),
        fullDescription: loc(
          "Zezwolenie na pobyt czasowy i pracę (tzw. zezwolenie jednolite, art. 114 ustawy o cudzoziemcach) to jedna decyzja wojewody, która legalizuje jednocześnie pobyt i zatrudnienie w Polsce. To najczęściej wybierana ścieżka dla cudzoziemca, który już przebywa w Polsce (na wizie, w ruchu bezwizowym albo na wcześniejszej karcie pobytu) i chce zostać dłużej, pracując dla polskiego podmiotu. Wniosek składa cudzoziemiec — nie pracodawca. Zezwolenie wydawane jest maksymalnie na 3 lata.",
          "The temporary residence and work permit, known as the \"single permit\", is the most popular path for non-EU foreigners working in Poland. It combines a residence permit with the right to work — eliminating the need for two separate proceedings. Depending on the basis of the permit, the foreigner may be tied to a specific employer or have open access to the labor market (e.g., graduates of Polish universities). We represent the foreigner before the voivode, ensuring full compliance of documentation with current legal requirements.",
          "Разрешение на временное пребывание и работу, известное как «единое разрешение», — самый популярный путь для иностранцев из-за пределов ЕС, работающих в Польше. Оно объединяет вид на жительство с правом на работу, исключая необходимость ведения двух параллельных процедур. В зависимости от основания разрешения иностранец может быть привязан к конкретному работодателю или иметь открытый доступ к рынку труда (например, выпускники польских вузов). Мы представляем интересы иностранца перед воеводой, обеспечивая полное соответствие документации актуальным правовым требованиям.",
          "Дозвіл на тимчасове перебування та роботу, відомий як «єдиний дозвіл», — найпопулярніший шлях для іноземців з-поза ЄС, що працюють у Польщі. Він поєднує дозвіл на проживання з правом на роботу, усуваючи потребу у двох паралельних процедурах. Залежно від підстави дозволу іноземець може бути прив'язаний до конкретного роботодавця або мати відкритий доступ до ринку праці (наприклад, випускники польських ВНЗ). Ми представляємо інтереси іноземця перед воєводою, забезпечуючи повну відповідність документації чинним правовим вимогам."
        ),
        forWhom: loc(
          "Cudzoziemcy spoza UE pracujący lub planujący podjąć pracę w Polsce.",
          "Non-EU foreigners working or planning to work in Poland.",
          "Иностранцы из-за пределов ЕС, работающие или планирующие работать в Польше.",
          "Іноземці з-поза ЄС, що працюють або планують працювати в Польщі."
        ),
        requiredDocuments: {
          pl: [
            "Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji.",
          ],
          en: [
            "The detailed list of documents depends on the individual situation — it will be presented during the consultation.",
          ],
          ru: [
            "Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации.",
          ],
          uk: [
            "Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації.",
          ],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
        price: null,
        sections: [
          {
            heading: pl("Warunki"),
            body: pl("<p>Ubezpieczenie zdrowotne (ZUS lub prywatne pokrywające leczenie w Polsce). Wynagrodzenie cudzoziemca nie niższe niż porównywalnych pracowników i <strong>nie niższe niż minimalne wynagrodzenie niezależnie od wymiaru czasu pracy</strong> (w 2026 roku to 4 806 zł brutto). W zawodach regulowanych wymagane są dokumenty potwierdzające uprawnienia. Procedura nie obejmuje m.in. pracowników delegowanych, pracowników sezonowych i osób na wizach turystycznych.</p>"),
          },
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>analiza sytuacji pobytowej i wybór optymalnej ścieżki;</li><li>przygotowanie kompletu dokumentów i załączników;</li><li>wypełnienie i złożenie wniosku (elektronicznie przez portal MOS — mos.cudzoziemcy.gov.pl);</li><li>odpowiedzi na wezwania urzędu i uzupełnianie braków;</li><li>monitoring sprawy aż do wydania decyzji i odbioru karty pobytu.</li></ul>"),
          },
          {
            heading: pl("Wymagane dokumenty"),
            body: pl("<ul><li>ważny dokument podróży (wszystkie strony);</li><li>wypełniony wniosek z załącznikiem nr 1 od pracodawcy (potwierdzającym warunki zatrudnienia);</li><li>ubezpieczenie zdrowotne (ZUS lub prywatna polisa ubezpieczeniowa);</li><li>potwierdzenie źródła stabilnego dochodu (umowa, rachunki itp.);</li><li>fotografia (684 × 883 piksele, plik nie większy niż 2,5 MB, proporcje odpowiadające fotografii 35 × 45 mm);</li><li>potwierdzenie opłaty skarbowej (440 zł).</li></ul>"),
          },
          {
            heading: pl("Proces krok po kroku"),
            body: pl("<ol><li>Konsultacja i analiza dokumentów.</li><li>Kompletowanie załączników z pracodawcą.</li><li>Złożenie wniosku przez MOS.</li><li>Postępowanie przed wojewodą (w praktyce od kilku do kilkunastu miesięcy, zależnie od województwa) i oczekiwanie na ewentualne wezwania z urzędu.</li><li>Wydanie decyzji, następnie odbiór karty pobytu.</li></ol>"),
          },
          {
            heading: pl("Terminy i opłaty urzędowe"),
            body: pl("<p>Opłata skarbowa 440 zł (pobyt czasowy i praca); karta pobytu 100 zł; opłata od pełnomocnictwa 17 zł.</p>"),
          },
          {
            heading: pl("Obowiązki po uzyskaniu decyzji"),
            body: pl("<ul><li>zawiadomienie wojewody o utracie pracy w ciągu <strong>15 dni roboczych</strong>;</li><li>zmiana warunków pracy co do zasady wymaga zmiany zezwolenia (wyjątki: m.in. zmiana nazwy pracodawcy, przejście zakładu pracy, zwiększenie etatu z proporcjonalnym wynagrodzeniem, zamiana umowy cywilnoprawnej na umowę o pracę — wtedy wystarczy powiadomienie w ciągu 15 dni roboczych).</li></ul>"),
          },
          {
            heading: pl("Na co uważać"),
            body: pl("<ul><li>potwierdzenie otrzymane z systemu MOS nie uprawnia do podróżowania po strefie Schengen (poza powrotem do kraju pochodzenia);</li><li>praca w trakcie procedury zależy od wcześniejszych uprawnień do wykonywania pracy;</li><li>braki formalne nieuzupełnione w terminie kończą się pozostawieniem wniosku bez rozpoznania.</li></ul>"),
          },
        ],
        faq: [
          {
            question: pl("Czy mogę pracować, czekając na decyzję?"),
            answer: pl("Jeśli przed złożeniem wniosku miałeś prawo do pracy (np. oświadczenie, poprzednie zezwolenie), zwykle tak — jednak zawsze wymagana jest dokładna analiza sprawy."),
          },
          {
            question: pl("Co przy zmianie pracodawcy?"),
            answer: pl("W takim przypadku należy rozważyć złożenie nowego wniosku lub zmianę aktualnego zezwolenia."),
          },
          {
            question: pl("Jak długo czeka się na decyzję?"),
            answer: pl("Zależnie od województwa, w praktyce kilka–kilkanaście miesięcy. Prowadzimy monitoring spraw i w razie bezczynności składamy <a href=\"/uslugi/ponaglenia-i-odwolania\">ponaglenia</a>."),
          },
          {
            question: pl("Czy rodzina może dołączyć do mojego wniosku pobytowego?"),
            answer: pl("Tak, w odrębnej procedurze (<a href=\"/uslugi/karta-pobytu-czasowego\">pobyt czasowy dla członka rodziny</a>). Pomagamy również w procedurze łączenia rodzin."),
          },
          {
            question: pl("Na jak długo wydawane jest zezwolenie?"),
            answer: pl("Zezwolenie może być wydane maksymalnie na 3 lata (zależy to jednak od sprawy); potem wniosek o kolejne zezwolenie, a następnie analiza możliwości złożenia wniosku o <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">pobyt rezydenta długoterminowego UE</a>."),
          },
        ],
      },
      {
        slug: "karta-pobytu-czasowego",
        categorySlug: "legalizacja-pobytu",
        order: 2,
        title: loc("Zezwolenie na pobyt czasowy", "Temporary residence permit", "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u0438\u0435", "\u0414\u043e\u0437\u0432\u0456\u043b \u043d\u0430 \u0442\u0438\u043c\u0447\u0430\u0441\u043e\u0432\u0435 \u043f\u0440\u043e\u0436\u0438\u0432\u0430\u043d\u043d\u044f"),
        shortDescription: loc(
          "Karta pobytu wydawana przez wojewodę — dla studiów, rodziny, działalności i innych celów.",
          "Residence card issued by the voivode — for studies, family, business and other purposes.",
          "Карта проживания, выдаваемая воеводой — для учёбы, семьи, бизнеса и других целей.",
          "Карта проживання, що видається воєводою — для навчання, сім'ї, бізнесу та інших цілей."
        ),
        fullDescription: loc(
          "Zezwolenie na pobyt czasowy to decyzja wojewody legalizująca pobyt w Polsce powyżej 3 miesięcy (maksymalny okres ważności decyzji to 3 lata) w konkretnym celu innym niż samo zatrudnienie: studia i nauka, łączenie rodzin, prowadzenie działalności gospodarczej, badania naukowe, a także \u201einne okoliczności\u201d (art. 186–187 ustawy o cudzoziemcach). Po pozytywnej decyzji cudzoziemiec otrzymuje kartę pobytu.",
          "A temporary residence permit is a residence card issued by the voivode, intended for foreigners who have a specific purpose of stay in Poland: studies, family reunification, running a business, conducting scientific research, or other justified circumstances. We help with compiling the complete documentation required by the voivode, preparing the justification for the application, and representing the client at every stage of the administrative proceedings.",
          "Разрешение на временное пребывание — это карта побыту, выдаваемая воеводой, предназначенная для иностранцев, имеющих конкретную цель пребывания в Польше: учёба, воссоединение семьи, ведение бизнеса, научные исследования или другие обоснованные обстоятельства. Помогаем в сборе полного комплекта документов, подготовке обоснования заявления и представительстве клиента на каждом этапе административного процесса.",
          "Дозвіл на тимчасове перебування — це карта побуту, що видається воєводою, призначена для іноземців, які мають конкретну мету перебування в Польщі: навчання, возз'єднання сім'ї, ведення бізнесу, наукові дослідження або інші обґрунтовані обставини. Допомагаємо у зборі повного комплекту документів, підготовці обґрунтування заяви та представництві клієнта на кожному етапі адміністративного процесу."
        ),
        forWhom: loc(
          "Cudzoziemcy planujący dłuższy pobyt w Polsce z konkretnym celem (studia, rodzina, działalność, badania).",
          "Foreigners planning a longer stay in Poland with a specific purpose (studies, family, business, research).",
          "Иностранцы, планирующие длительное пребывание в Польше с конкретной целью (учёба, семья, бизнес, исследования).",
          "Іноземці, що планують тривале перебування в Польщі з конкретною метою (навчання, сім'я, бізнес, дослідження)."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
        price: null,
        sections: [
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>dobór właściwej podstawy prawnej pobytu;</li><li>przygotowanie kompletu dokumentów;</li><li>złożenie wniosku przez MOS oraz uzyskanie potwierdzenia złożenia wniosku;</li><li>obsługa wezwań z urzędu;</li><li>monitoring sprawy aż do wydania decyzji.</li></ul><p>Dla podstaw pobytu \u201erodzinnych\u201d i studenckich pilnujemy uprawnień dodatkowych — np. wiele zezwoleń z tytułów rodzinnych i studiów daje swobodny dostęp do rynku pracy.</p>"),
          },
          {
            heading: pl("Wymagane dokumenty (standardowe)"),
            body: pl("<ul><li>ważny dokument podróży (wszystkie strony);</li><li>wniosek o pobyt czasowy składany przez system MOS;</li><li>fotografia (684 × 883 piksele, plik nie większy niż 2,5 MB, proporcje odpowiadające fotografii 35 × 45 mm);</li><li>ubezpieczenie zdrowotne (ZUS lub prywatna polisa ubezpieczeniowa);</li><li>potwierdzenie stabilnego i regularnego źródła dochodu;</li><li>potwierdzenie miejsca zamieszkania;</li><li>dokumenty potwierdzające cel pobytu (zaświadczenie uczelni + opłata czesnego, akt małżeństwa/urodzenia, wpis do CEIDG/KRS i wyniki finansowe działalności, umowa z jednostką naukową itd.).</li></ul>"),
          },
          {
            heading: pl("Terminy i opłaty urzędowe"),
            body: pl("<p>Opłata skarbowa 340 zł, karta pobytu 100 zł, opłata od pełnomocnictwa 17 zł.</p><p>Studia: zezwolenie zwykle wydawane na okres studiów. Decyzje pobytowe wydawane są maksymalnie na okres 3 lat.</p>"),
          },
          {
            heading: pl("Na co uważać"),
            body: pl("<p>Cel pobytu trzeba realizować — porzucenie studiów czy fikcyjna działalność może oznaczać cofnięcie zezwolenia. Zmiana celu pobytu wymaga złożenia nowego wniosku. Wniosek trzeba złożyć najpóźniej ostatniego dnia legalnego pobytu.</p>"),
          },
        ],
        faq: [
          {
            question: pl("Czy karta pobytu czasowego pozwala pracować?"),
            answer: pl("Tylko jeśli podstawa decyzji daje dostęp do rynku pracy albo masz dokument legalizujący pracę."),
          },
          {
            question: pl("Czy mogę podróżować po UE?"),
            answer: pl("Po wydaniu karty pobytu — do 90 dni w okresie 180-dniowym (w celach turystycznych)."),
          },
          {
            question: pl("Co należy zrobić po 3 latach?"),
            answer: pl("Weryfikacja możliwości złożenia wniosku o kolejne zezwolenie."),
          },
          {
            question: pl("Czy urząd może wezwać na przesłuchanie?"),
            answer: pl("Istnieje taka możliwość — w przypadku wątpliwości ze strony urzędu."),
          },
        ],
      },
      {
        slug: "legalizacja-b2b-inkubator",
        categorySlug: "legalizacja-pobytu",
        order: 5,
        title: loc(
          "Legalizacja na podstawie umowy B2B w inkubatorze przedsiębiorczości",
          "Legalization via B2B contract in a business incubator",
          "Легализация на основе договора B2B в бизнес-инкубаторе",
          "Легалізація на основі договору B2B у бізнес-інкубаторі"
        ),
        shortDescription: loc(
          "Legalizacja pracy na podstawie umowy B2B w inkubatorze przedsiębiorczości — procedura obejmująca umowę współpracy i zezwolenie na pracę.",
          "Work legalization via a B2B contract in a business incubator — procedure involving a cooperation agreement and work permit.",
          "Легализация работы на основе договора B2B в бизнес-инкубаторе — процедура, включающая договор сотрудничества и разрешение на работу.",
          "Легалізація роботи на основі договору B2B у бізнес-інкубаторі — процедура, що включає договір співпраці та дозвіл на роботу."
        ),
        fullDescription: loc(
          "Rozwiązanie dla freelancerów, kontraktorów IT i specjalistów rozliczających się \u201ena B2B\u201d, którzy nie chcą albo nie mogą zakładać działalności gospodarczej w Polsce. Cudzoziemiec zawiera umowę z inkubatorem przedsiębiorczości (Fundacja Firma Dla Każdego) i pracuje w ramach jego osobowości prawnej — a umowa z inkubatorem staje się podstawą do legalizacji pobytu i pracy (zezwolenie na pobyt czasowy i pracę, Blue Card przy wysokich kwalifikacjach).",
          "Work legalization for a foreigner based on a B2B contract with a business incubator. The procedure involves concluding a cooperation agreement with the incubator and obtaining a work permit. We help with coordination with the incubator, documentation preparation, and obtaining the work permit.",
          "Легализация работы иностранца на основе договора B2B с бизнес-инкубатором. Процедура включает заключение договора сотрудничества с инкубатором и получение разрешения на работу. Помогаем с координацией с инкубатором, подготовкой документации и получением разрешения на работу.",
          "Легалізація роботи іноземця на основі договору B2B з бізнес-інкубатором. Процедура включає укладення договору співпраці з інкубатором та отримання дозволу на роботу. Допомагаємо з координацією з інкубатором, підготовкою документації та отриманням дозволу на роботу."
        ),
        forWhom: loc(
          "Cudzoziemcy chcący zalegalizować pobyt poprzez prowadzenie działalności gospodarczej w ramach umowy B2B w inkubatorze przedsiębiorczości.",
          "Foreigners wishing to legalize their stay by running a business under a B2B contract in a business incubator.",
          "Иностранцы, желающие легализовать пребывание через ведение бизнеса по договору B2B в бизнес-инкубаторе.",
          "Іноземці, що бажають легалізувати перебування через ведення бізнесу за договором B2B у бізнес-інкубаторі."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
        price: null,
        sections: [
          {
            heading: pl("Jak to działa"),
            body: pl("<ol><li>Weryfikacja przypadku oraz możliwości rozpoczęcia współpracy pod kątem legalizacji.</li><li>Podpisanie umowy z inkubatorem FDK.</li><li>Przygotowanie dokumentów legalizacyjnych z inkubatorem jako podmiotem powierzającym pracę (uzyskanie <a href=\"/uslugi/zezwolenie-na-prace\">zezwolenia na pracę</a> lub wpisu <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">oświadczenia</a> do ewidencji oświadczeń).</li><li>Fakturowanie klientów przez inkubator (bez własnej firmy, bez rejestracji działalności w ZUS).</li><li>Złożenie wniosku pobytowego przez MOS + uzyskanie potwierdzenia złożenia wniosku.</li><li>Uzyskanie decyzji pobytowej i karty pobytu.</li></ol>"),
          },
          {
            heading: pl("Dla kogo szczególnie"),
            body: pl("<p>Specjaliści z kontraktami zagranicznymi; freelancerzy z wieloma klientami.</p>"),
          },
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<p>Onboarding w inkubatorze; konstrukcja umowy pod wymogi legalizacyjne; obsługa księgowa faktur w inkubatorze; wsparcie w rozliczeniach i dokumentach do wypłat.</p>"),
          },
        ],
        faq: [
          {
            question: pl("Czy ta procedura jest legalna?"),
            answer: pl("Tak — praca w ramach inkubatora to standardowy model. Warunki umowy muszą spełniać wymogi ustawowe."),
          },
          {
            question: pl("Czy muszę mieć polskich klientów?"),
            answer: pl("Nie, możesz mieć klientów z innych krajów."),
          },
          {
            question: pl("Jakie dochody muszę wykazać?"),
            answer: pl("Jeśli jesteś w procedurze pobytowej (<a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">zezwolenie na pobyt czasowy i pracę</a> lub <a href=\"/uslugi/eu-blue-card\">Blue Card</a>), musisz zarabiać co najmniej 4 806 zł brutto miesięcznie (minimalne wynagrodzenie na 2026 r.)."),
          },
          {
            question: pl("Czy mogę przejść potem na własną działalność?"),
            answer: pl("Jest to możliwe, ale tylko po uzyskaniu odpowiedniego tytułu pobytowego uprawniającego do wykonywania działalności gospodarczej."),
          },
        ],
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
        fullDescription: loc(
          "Niebieska Karta UE to zezwolenie na pobyt czasowy i pracę w zawodzie wymagającym wysokich kwalifikacji (art. 127 ustawy o cudzoziemcach). Dla cudzoziemców z wyższym wykształceniem (wymagany dyplom uczelni oraz jego tłumaczenie przysięgłe) albo z potwierdzonym doświadczeniem zawodowym (wymagane potwierdzenie doświadczenia oraz tłumaczenie przysięgłe).",
          "The EU Blue Card is a residence and work permit dedicated to highly qualified specialists — it requires higher education and a salary above a specified threshold. Holding an EU Blue Card provides significant advantages: faster acquisition of a long-term resident permit, shorter required residence periods for family reunification, and easier access to the labor market in other EU member states. We assist with the entire application process, from verifying qualifications to representation before the authorities.",
          "EU Blue Card — это разрешение на пребывание и работу для высококвалифицированных специалистов, требующее высшего образования и заработной платы выше установленного порога. Наличие Голубой карты ЕС даёт значительные преимущества: ускоренное получение статуса долгосрочного резидента, сокращённые сроки пребывания при воссоединении семьи и упрощённый доступ к рынку труда в других странах ЕС. Помогаем на всех этапах — от проверки квалификации до представительства перед органами.",
          "EU Blue Card — це дозвіл на перебування та роботу для висококваліфікованих спеціалістів, що вимагає вищої освіти та заробітної плати вище встановленого порогу. Наявність Блакитної карти ЄС дає значні переваги: пришвидшене отримання статусу довгострокового резидента, скорочені терміни перебування при возз'єднанні сім'ї та спрощений доступ до ринку праці в інших країнах ЄС. Допомагаємо на всіх етапах — від перевірки кваліфікації до представництва перед органами."
        ),
        forWhom: loc(
          "Specjaliści IT, inżynierowie, lekarze, kadra managerska i inni wysoko wykwalifikowani specjaliści.",
          "IT specialists, engineers, doctors, managers and other highly qualified professionals.",
          "IT-специалисты, инженеры, врачи, управленцы и другие высококвалифицированные специалисты.",
          "IT-спеціалісти, інженери, лікарі, управлінці та інші висококваліфіковані спеціалісти."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Od 2 do 4 miesięcy", "2 to 4 months", "От 2 до 4 месяцев", "Від 2 до 4 місяців"),
        price: null,
        sections: [
          {
            heading: pl("Warunki"),
            body: pl("<ul><li>umowa (o pracę, cywilnoprawna, nakładcza) zawarta na <strong>co najmniej 6 miesięcy</strong>;</li><li>potwierdzenie kwalifikacji (dyplom lub doświadczenie);</li><li>wymóg wynagrodzenia — roczne wynagrodzenie brutto <strong>co najmniej 150% przeciętnego wynagrodzenia w gospodarce narodowej</strong> za rok poprzedni (ogłaszane przez GUS);</li><li>ubezpieczenie zdrowotne (ZUS lub prywatna polisa ubezpieczeniowa);</li><li>potwierdzenie zamieszkania w Polsce.</li></ul>"),
          },
          {
            heading: pl("Przewagi Blue Card nad zwykłym zezwoleniem"),
            body: pl("<p>Możliwość zmiany pracodawcy (zawiadomienie wojewody w 15 dni roboczych zamiast zmiany decyzji); ochrona przy utracie pracy (zezwolenia nie cofa się przy bezrobociu do 3 miesięcy, a po 2 latach na Karcie — do 6 miesięcy); <strong>mobilność w UE</strong> — po okresie pobytu w jednym państwie łatwiejsze przeniesienie do innego; szybsza ścieżka do <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">rezydenta długoterminowego UE</a> (łączenie okresów z różnych państw).</p>"),
          },
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>weryfikacja progu wynagrodzenia i kwalifikacji;</li><li>skompletowanie dokumentów (dyplomy/<a href=\"/uslugi/tlumaczenia-przysiegle\">tłumaczenia</a> w razie potrzeby);</li><li>złożenie wniosku przez MOS + potwierdzenie złożenia wniosku;</li><li>obsługa zmiany pracodawcy i obowiązków notyfikacyjnych.</li></ul>"),
          },
          {
            heading: pl("Terminy i opłaty urzędowe"),
            body: pl("<p>Opłata skarbowa 440 zł, karta pobytu 100 zł, opłata od pełnomocnictwa 17 zł.</p>"),
          },
          {
            heading: pl("Obowiązki po uzyskaniu decyzji"),
            body: pl("<p>Zawiadomienie wojewody w 15 dni roboczych o utracie pracy, zmianie pracodawcy, zaprzestaniu spełniania warunków.</p>"),
          },
        ],
        faq: [
          {
            question: pl("Czy do uzyskania Blue Card brany jest pod uwagę tylko dyplom?"),
            answer: pl("Nie, można również wykazać doświadczenie zawodowe (dokumenty potwierdzające kwalifikacje uzyskane w wyniku doświadczenia zawodowego na poziomie porównywalnym z poziomem kwalifikacji uzyskanych w wyniku ukończenia studiów wyższych)."),
          },
          {
            question: pl("Co się stanie, gdy stracę pracę, posiadając Blue Card?"),
            answer: pl("W zależności od sytuacji i okresu posiadanego zezwolenia masz 3–6 miesięcy ochrony na znalezienie nowego zatrudnienia. Należy jednak terminowo poinformować wojewodę o zakończeniu zatrudnienia."),
          },
          {
            question: pl("Czy rodzina dostaje pobyt?"),
            answer: pl("Członkowie rodziny mogą ubiegać się o pobyt (<a href=\"/uslugi/karta-pobytu-czasowego\">pobyt z cudzoziemcem</a>)."),
          },
          {
            question: pl("Czy mogę przenieść się do Niemiec/Francji?"),
            answer: pl("W ramach mobilności Blue Card, po spełnieniu warunków — wymagana jest jednak analiza konkretnej sytuacji."),
          },
        ],
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
        fullDescription: loc(
          "Karta pobytu jest dokumentem pobytowym wydawanym cudzoziemcom, którym udzielono w Polsce zezwolenia na pobyt. Wymiany dokonuje się, gdy: zmieniły się dane na karcie (nazwisko, adres — przy kartach z adresem), karta została zgubiona/skradziona/uszkodzona, zmienił się wygląd posiadacza, albo upływa termin ważności samej karty przy wciąż ważnym zezwoleniu (np. karta pobytu stałego wydawana na 10 lat, rezydenta — na 5 lat).",
          "Replacement of a residence card is necessary in situations such as loss, damage, or destruction of the document, change of personal data (e.g., surname after marriage), change of appearance, or expiration of the card itself (while the residence permit remains valid). We help quickly compile the application and documents so the foreigner avoids a gap in holding a valid residence document.",
          "Замена карты побыту необходима в таких ситуациях, как утеря документа, его повреждение или уничтожение, изменение персональных данных (например, фамилии после заключения брака), изменение внешности или истечение срока действия самой карты (при сохранении разрешения на пребывание). Помогаем быстро подготовить заявление и документы, чтобы иностранец избежал перерыва в наличии действующего документа.",
          "Заміна карти побуту необхідна у таких ситуаціях, як втрата документа, його пошкодження або знищення, зміна персональних даних (наприклад, прізвища після одруження), зміна зовнішності або закінчення терміну дії самої карти (при збереженні дозволу на перебування). Допомагаємо швидко підготувати заяву та документи, щоб іноземець уникнув перерви у наявності дійсного документа."
        ),
        forWhom: loc(
          "Posiadacze istniejącej karty pobytu, którzy potrzebują nowego egzemplarza dokumentu.",
          "Holders of an existing residence card who need a new copy of the document.",
          "Владельцы действующей карты побыту, которым необходим новый экземпляр документа.",
          "Власники діючої карти побуту, яким потрібен новий примірник документа."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Od 30 do 60 dni", "30 to 60 days", "От 30 до 60 дней", "Від 30 до 60 днів"),
        price: null,
        sections: [
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>ustalenie, czy wymagana jest wymiana karty;</li><li>wniosek do wojewody o wymianę/wydanie karty pobytu;</li><li>zgłoszenie utraty dokumentu (obowiązek w ciągu 3 dni od stwierdzenia utraty).</li></ul>"),
          },
          {
            heading: pl("Terminy i opłaty urzędowe"),
            body: pl("<p>Opłata za wydanie/wymianę karty: 100 zł (podwyższona przy zawinionej utracie/zniszczeniu: 200 zł przy pierwszej, 300 zł przy kolejnej utracie).</p>"),
          },
          {
            heading: pl("Na co uważać"),
            body: pl("<p>Wymiana karty NIE przedłuża zezwolenia pobytowego — jeśli kończy się decyzja, potrzebny jest nowy <a href=\"/uslugi/karta-pobytu-czasowego\">wniosek pobytowy</a>.</p>"),
          },
        ],
        faq: [
          {
            question: pl("Zgubiłem kartę za granicą — co mam zrobić?"),
            answer: pl("Należy zgłosić to do urzędu wojewódzkiego oraz policji."),
          },
          {
            question: pl("Czy mogę pracować, czekając na nową kartę?"),
            answer: pl("Tak, natomiast przekraczanie granic bez karty pobytu nie będzie możliwe."),
          },
          {
            question: pl("Ile trwa wymiana?"),
            answer: pl("Zależy od danego urzędu (zazwyczaj od miesiąca do kilku miesięcy)."),
          },
        ],
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
        fullDescription: loc(
          "Zezwolenie na pobyt rezydenta długoterminowego UE to bezterminowy status dla cudzoziemca, który przebywa w Polsce legalnie i nieprzerwanie co najmniej 5 lat i ma stabilne źródło dochodu. Daje swobodny dostęp do rynku pracy i ułatwia mobilność w ramach UE.",
          "EU long-term resident status is a residence document granting the holder broad rights: the right of permanent residence in Poland and significant facilitation in moving and settling in other EU member states. It requires meeting several conditions: 5 years of uninterrupted legal residence in Poland, a stable and regular source of income sufficient to support oneself and family, health insurance, and secured accommodation. We represent the client at every stage of the proceedings.",
          "Статус долгосрочного резидента ЕС — это документ на пребывание, дающий его владельцу широкие права: право постоянного проживания в Польше и значительные облегчения при переезде и проживании в других странах ЕС. Требует выполнения ряда условий: 5 лет непрерывного легального проживания в Польше, стабильного и регулярного источника дохода, медицинского страхования и обеспеченного места жительства. Представляем клиента на каждом этапе процедуры.",
          "Статус довгострокового резидента ЄС — це документ на перебування, що надає його власнику широкі права: право постійного проживання в Польщі та значні полегшення при переїзді та проживанні в інших країнах ЄС. Вимагає виконання ряду умов: 5 років безперервного легального проживання в Польщі, стабільного та регулярного джерела доходу, медичного страхування та забезпеченого місця проживання. Представляємо клієнта на кожному етапі процедури."
        ),
        forWhom: loc(
          "Cudzoziemcy legalnie mieszkający w Polsce od co najmniej 5 lat, ze stabilnym dochodem.",
          "Foreigners legally residing in Poland for at least 5 years with a stable income.",
          "Иностранцы, легально проживающие в Польше не менее 5 лет, со стабильным доходом.",
          "Іноземці, що легально проживають у Польщі не менше 5 років, зі стабільним доходом."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
        price: null,
        sections: [
          {
            heading: pl("Warunki"),
            body: pl("<ul><li>5 lat legalnego, nieprzerwanego pobytu bezpośrednio przed wnioskiem (do okresu wlicza się m.in. połowę pobytu na wizie studenckiej/zezwoleniu studenckim; posiadacze <a href=\"/uslugi/eu-blue-card\">Blue Card</a> mogą łączyć okresy z innych państw UE);</li><li>stabilne i regularne źródło dochodu przez wymagane okresy;</li><li>ubezpieczenie zdrowotne (ZUS lub polisa ubezpieczeniowa);</li><li><strong>potwierdzona znajomość języka polskiego na poziomie co najmniej B1</strong> (certyfikat państwowy, świadectwo ukończenia szkoły w Polsce);</li><li>zapewnione miejsce zamieszkania.</li></ul>"),
          },
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>analiza historii pobytu i zatrudnienia w Polsce (liczymy \u201enieprzerwaność\u201d pobytu);</li><li>kompletowanie zaświadczeń o dochodach (PIT-y, zaświadczenia);</li><li>weryfikacja certyfikatu językowego;</li><li>złożenie wniosku przez MOS;</li><li>odpowiedzi na wezwania, monitorowanie statusu sprawy do momentu wydania decyzji i karty pobytu.</li></ul>"),
          },
          {
            heading: pl("Terminy i opłaty urzędowe"),
            body: pl("<p>Opłata skarbowa 640 zł, karta pobytu 100 zł (karta wydawana na 5 lat, potem należy ją <a href=\"/uslugi/wymiana-karty-pobytu\">wymienić</a>), opłata od pełnomocnictwa 17 zł.</p>"),
          },
          {
            heading: pl("Na co uważać"),
            body: pl("<p>Przerwy w pobycie (pojedyncza przerwa nie może być dłuższa niż 6 miesięcy, a łącznie przerwy nie mogą przekraczać 10 miesięcy w okresie 5 lat — istnieją wyjątki w liczeniu przerw, np. wyjazdy służbowe); dochód liczony wstecz — braki w PIT-ach lub brak umów mogą być przyczyną odmowy; brak możliwości ubiegania się o zezwolenie bez potwierdzenia znajomości języka.</p>"),
          },
        ],
        faq: [
          {
            question: pl("Czy okres pobytu na podstawie stempla w paszporcie się liczy?"),
            answer: pl("Tak, pobyt w procedurze jest legalny."),
          },
          {
            question: pl("Czy studia liczą się do 5 lat?"),
            answer: pl("Okres ten liczony jest w połowie."),
          },
          {
            question: pl("Który pobyt wybrać: rezydent UE czy pobyt stały?"),
            answer: pl("To zależy od konkretnej sytuacji i spełnienia wymagań z ustawy o cudzoziemcach. Porównaj z <a href=\"/uslugi/karta-stalego-pobytu\">pobytem stałym</a>."),
          },
        ],
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
        fullDescription: loc(
          "Zezwolenie na pobyt stały jest bezterminowe i daje swobodny dostęp do rynku pracy — bez zezwoleń i oświadczeń. Najczęstsze podstawy: ważna Karta Polaka; polskie pochodzenie; małżeństwo z obywatelem RP (co najmniej 3 lata małżeństwa + bezpośrednio przed złożeniem wniosku minimum 2 lata nieprzerwanego pobytu w Polsce na zezwoleniu na pobyt czasowy udzielonym w związku z pozostawaniem w związku małżeńskim); dzieci posiadaczy pobytu stałego; ofiary handlu ludźmi; azyl/uchodźstwo w określonych konfiguracjach.",
          "A permanent residence permit is an indefinite residence permit — the last step before applying for Polish citizenship. To obtain it, a foreigner must meet specific conditions: Polish descent, marriage to a Polish citizen (after a specified period), holding a Karta Polaka (Pole's Card), refugee status or subsidiary protection, or a specified period of legal residence in Poland based on a previous permit. We help verify the legal basis of the application and guide the client through the entire process until receiving the permanent residence card.",
          "Разрешение на постоянное пребывание — это бессрочный вид на жительство, последний шаг перед подачей заявления на гражданство Польши. Для его получения иностранец должен соответствовать определённым условиям: польское происхождение, брак с гражданином Польши (после установленного периода), наличие Карты поляка, статус беженца или дополнительной защиты, либо определённый период легального проживания в Польше. Помогаем проверить правовое основание заявления и сопровождаем клиента через весь процесс до получения карты постоянного пребывания.",
          "Дозвіл на постійне перебування — це безстроковий вид на проживання, останній крок перед поданням заяви на громадянство Польщі. Для його отримання іноземець має відповідати певним умовам: польське походження, шлюб з громадянином Польщі (після встановленого періоду), наявність Карти поляка, статус біженця або додаткового захисту, або певний період легального проживання в Польщі. Допомагаємо перевірити правову підставу заяви та супроводжуємо клієнта через весь процес до отримання карти постійного перебування."
        ),
        forWhom: loc(
          "Cudzoziemcy z tytułem uprawniającym do pobytu stałego (pochodzenie polskie, małżeństwo, Karta Polaka, długi pobyt).",
          "Foreigners with a title entitling them to permanent residence (Polish descent, marriage, Karta Polaka, long-term stay).",
          "Иностранцы с основанием для постоянного проживания (польское происхождение, брак, Карта поляка, длительное пребывание).",
          "Іноземці з підставою для постійного проживання (польське походження, шлюб, Карта поляка, тривале перебування)."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
        price: null,
        sections: [
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>analiza, która podstawa jest osiągalna;</li><li>przygotowanie dowodów (dokumenty pochodzeniowe, akty stanu cywilnego z <a href=\"/uslugi/tlumaczenia-przysiegle\">tłumaczeniami przysięgłymi</a>, historia pobytu);</li><li>złożenie wniosku przez MOS + potwierdzenie złożenia wniosku;</li><li>przygotowanie do przesłuchania;</li><li>monitoring sprawy do momentu zakończenia postępowania, odpowiedzi na wezwania.</li></ul>"),
          },
          {
            heading: pl("Terminy i opłaty urzędowe"),
            body: pl("<p>Opłata skarbowa 640 zł (Karta Polaka: wniosek o pobyt stały bez opłaty skarbowej); karta pobytu 100 zł; opłata od pełnomocnictwa 17 zł. Karta wydawana na 10 lat (<a href=\"/uslugi/wymiana-karty-pobytu\">wymiana samej karty</a>).</p>"),
          },
          {
            heading: pl("Na co uważać"),
            body: pl("<p>Przy podstawie małżeńskiej urząd bada realność związku; pobyt stały można utracić przy dłuższej nieobecności w Polsce.</p>"),
          },
        ],
        faq: [
          {
            question: pl("Czym różni się pobyt stały od pobytu rezydenta UE?"),
            answer: pl("Podstawami prawnymi i mobilnością w UE. Szczegóły na stronie <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">rezydenta długoterminowego UE</a>."),
          },
          {
            question: pl("Czy po otrzymaniu zezwolenia mam otwarty dostęp do rynku pracy?"),
            answer: pl("Tak, decyzja daje swobodny dostęp do rynku pracy."),
          },
          {
            question: pl("Czy po pobycie stałym mogę ubiegać się o obywatelstwo?"),
            answer: pl("Pod pewnymi warunkami tak — jeśli spełnione są przesłanki z ustawy oraz określony upływ czasu."),
          },
        ],
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
        fullDescription: loc(
          "Ponaglenie i skarga do sądu. Gdy urząd nie wydaje decyzji w terminie, można złożyć ponaglenie (art. 37 KPA) na bezczynność lub przewlekłość wojewody. Jeśli ten środek nie przynosi rozwiązania, można rozważyć złożenie skargi do wojewódzkiego sądu administracyjnego. Odwołanie. Przysługuje od decyzji wojewody do Szefa Urzędu do Spraw Cudzoziemców w terminie 14 dni od doręczenia decyzji.",
          "We represent the client in two critical situations: when the residence proceedings are delayed (urgency complaint directed to the higher authority) and when the voivode has issued a negative decision (appeal to the Head of the Office for Foreigners). We prepare professional procedural documents with legal argumentation, compile additional evidence for the case, and represent the client before the authority at every stage. In many cases, a successful appeal changes a negative decision to a positive one.",
          "Мы представляем клиента в двух критических ситуациях: когда процедура по пребыванию затягивается (жалоба на бездействие, направленная в вышестоящий орган) и когда воевода вынес отрицательное решение (апелляция к Руководителю Управления по делам иностранцев). Подготавливаем профессиональные процессуальные документы с правовой аргументацией, собираем дополнительные доказательства и представляем клиента перед органом на каждом этапе. Во многих случаях успешная апелляция меняет отказ на положительное решение.",
          "Ми представляємо клієнта у двох критичних ситуаціях: коли процедура перебування затягується (скарга на бездіяльність, направлена до вищого органу) та коли воєвода видав негативне рішення (апеляція до Керівника Управління у справах іноземців). Підготовлюємо професійні процесуальні документи з правовою аргументацією, збираємо додаткові докази та представляємо клієнта перед органом на кожному етапі. У багатьох випадках успішна апеляція змінює відмову на позитивне рішення."
        ),
        forWhom: loc(
          "Cudzoziemcy, których sprawa utknęła w urzędzie lub którzy otrzymali decyzję odmowną.",
          "Foreigners whose case is stuck at the office or who have received a negative decision.",
          "Иностранцы, чьё дело застряло в ведомстве или которые получили отказ.",
          "Іноземці, чия справа застрягла у відомстві або які отримали відмову."
        ),
        requiredDocuments: {
          pl: [
            "Decyzja wojewody (w przypadku odwołania)",
            "Pełnomocnictwo do reprezentacji",
            "Kompletna dotychczasowa dokumentacja sprawy",
            "Dodatkowe dowody na okoliczności sprawy",
            "Aktualne dokumenty potwierdzające status pobytowy",
          ],
          en: [
            "Voivode's decision (in case of appeal)",
            "Power of attorney for representation",
            "Complete existing case documentation",
            "Additional evidence supporting the case",
            "Current documents confirming residence status",
          ],
          ru: [
            "Решение воеводы (в случае апелляции)",
            "Доверенность на представительство",
            "Полная существующая документация по делу",
            "Дополнительные доказательства по обстоятельствам дела",
            "Актуальные документы, подтверждающие статус пребывания",
          ],
          uk: [
            "Рішення воєводи (у разі апеляції)",
            "Довіреність на представництво",
            "Повна наявна документація по справі",
            "Додаткові докази за обставинами справи",
            "Актуальні документи, що підтверджують статус перебування",
          ],
        },
        estimatedTime: loc("Od 1 do 4 miesięcy", "1 to 4 months", "От 1 до 4 месяцев", "Від 1 до 4 місяців"),
        price: null,
        sections: [
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>analiza sprawy i przygotowanie dokumentów;</li><li>złożenie ponaglenia lub odwołania;</li><li>reprezentacja przed Szefem UdSC i WSA we współpracy z radcą prawnym;</li><li>po wygranej pilnujemy wykonania decyzji przez wojewodę.</li></ul>"),
          },
          {
            heading: pl("Terminy"),
            body: pl("<p>Odwołanie: <strong>14 dni od doręczenia decyzji</strong> (przywrócenie terminu tylko wyjątkowo). Skarga do wojewódzkiego sądu administracyjnego: <strong>30 dni od dnia doręczenia skarżącemu rozstrzygnięcia</strong>.</p>"),
          },
        ],
        faq: [
          {
            question: pl("Czy ponaglenie może być pomocne w procedurze pobytowej?"),
            answer: pl("Tak — często wymusza podjęcie działań oraz jest wymagane przed złożeniem skargi do sądu."),
          },
          {
            question: pl("Przegapiłem termin 14 dni — czy nie mogę się już odwołać?"),
            answer: pl("Zwykle nie można; wyjątkiem jest spełnienie przesłanek przywrócenia terminu na złożenie odwołania."),
          },
          {
            question: pl("Czy mogę zostać w Polsce w trakcie procedowania odwołania?"),
            answer: pl("Jeśli odwołanie zostało złożone w ustawowym terminie, pobyt w procedurze odwoławczej pozostaje legalny."),
          },
        ],
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
        fullDescription: loc(
          "Dokumenty obcojęzyczne składane w polskich urzędach (akty stanu cywilnego, dyplomy, zaświadczenia o niekaralności, dokumenty pracownicze) muszą być przetłumaczone przez tłumacza przysięgłego wpisanego na listę Ministra Sprawiedliwości. Zwykłe tłumaczenie nie jest akceptowane w postępowaniach pobytowych.",
          "We cooperate with sworn translators of various languages — we help clients quickly obtain sworn translations of documents needed in legalization procedures: birth certificates, marriage certificates, criminal record certificates, university diplomas, employment certificates, employment contracts, commercial register extracts, and other documents issued abroad. We handle the entire communication process with the translator — the client receives ready-made, properly certified translations ready for submission to the authorities.",
          "Мы сотрудничаем с присяжными переводчиками различных языков — помогаем клиенту быстро получить присяжные переводы документов, необходимых в процедурах легализации: свидетельств о рождении, свидетельств о браке, справок о несудимости, дипломов, трудовых книжек, трудовых договоров, выписок из торговых реестров и других документов, выданных за рубежом. Берём на себя весь процесс коммуникации с переводчиком — клиент получает готовые, правильно заверенные переводы для подачи в ведомство.",
          "Ми співпрацюємо з присяжними перекладачами різних мов — допомагаємо клієнту швидко отримати присяжні переклади документів, необхідних у процедурах легалізації: свідоцтв про народження, свідоцтв про шлюб, довідок про несудимість, дипломів, трудових книжок, трудових договорів, виписок з торгових реєстрів та інших документів, виданих за кордоном. Беремо на себе весь процес комунікації з перекладачем — клієнт отримує готові, правильно засвідчені переклади для подачі у відомство."
        ),
        forWhom: loc(
          "Wszyscy klienci procedur legalizacyjnych wymagających dokumentów wydanych za granicą.",
          "All clients of legalization procedures requiring documents issued abroad.",
          "Все клиенты процедур легализации, которым требуются документы, выданные за рубежом.",
          "Усі клієнти процедур легалізації, яким потрібні документи, видані за кордоном."
        ),
        requiredDocuments: {
          pl: [
            "Oryginał dokumentu lub poświadczona kopia",
            "Apostille lub legalizacja konsularna (jeśli wymagana)",
            "Wskazanie języka źródłowego i docelowego",
          ],
          en: [
            "Original document or certified copy",
            "Apostille or consular legalization (if required)",
            "Indication of source and target language",
          ],
          ru: [
            "Оригинал документа или заверенная копия",
            "Апостиль или консульская легализация (если требуется)",
            "Указание исходного и целевого языка",
          ],
          uk: [
            "Оригінал документа або засвідчена копія",
            "Апостиль або консульська легалізація (якщо потрібно)",
            "Вказівка вихідної та цільової мови",
          ],
        },
        estimatedTime: loc("Od 3 do 14 dni", "3 to 14 days", "От 3 до 14 дней", "Від 3 до 14 днів"),
        price: null,
        sections: [
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>weryfikacja, które dokumenty w Twojej sprawie faktycznie wymagają tłumaczenia (nie płacisz za zbędne);</li><li>tłumaczenie przysięgłe (najczęstsze języki naszych klientów to ukraiński, rosyjski, angielski i białoruski — obsługujemy również inne).</li></ul>"),
          },
          {
            heading: pl("Wycena"),
            body: pl("<p>Wycena indywidualna — zależy od liczby stron i języka dokumentu.</p>"),
          },
        ],
        faq: [
          {
            question: pl("Czy tłumaczenie dokumentu wykonane w Ukrainie będzie uznane?"),
            answer: pl("Nie, urzędy wymagają tłumaczenia wykonanego przez tłumacza przysięgłego w Polsce."),
          },
          {
            question: pl("Jak szybko mogę uzyskać tłumaczenie dokumentu?"),
            answer: pl("Zależy od liczby stron dokumentu. Zwykle zajmuje to kilka dni; sprawy bardziej skomplikowane — kilkanaście dni."),
          },
        ],
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
        fullDescription: loc(
          "Zezwolenie na pracę legalizuje samą pracę (nie pobyt) i jest wydawane przez wojewodę na wniosek podmiotu powierzającego wykonywanie pracy. Od 1.06.2025 obowiązuje nowa ustawa o warunkach dopuszczalności powierzania pracy cudzoziemcom. Wnioski składa się wyłącznie elektronicznie przez praca.gov.pl.",
          "A work permit is a document issued by the voivode for non-EU foreigners taking up employment in Poland. It covers all permit types: A (employment contract with a Polish employer), B (company board member), C (intra-corporate transfer), D (secondment for export service delivery), E (other secondment cases). We help both with preparing complete documentation and representation before the voivodeship office until the decision is collected.",
          "Разрешение на работу — это документ, выдаваемый воеводой для иностранцев из-за пределов Европейского Союза, которые трудоустраиваются в Польше. Охватывает все типы разрешений: A (работа по договору с польским работодателем), B (член правления компании), C (внутрикорпоративный перевод), D (откомандирование для оказания экспортных услуг), E (другие случаи откомандирования). Помогаем как с подготовкой полного комплекта документов, так и с представительством перед воеводским управлением.",
          "Дозвіл на роботу — це документ, що видається воєводою для іноземців з-поза Європейського Союзу, які працевлаштовуються в Польщі. Охоплює всі типи дозволів: A (робота за договором з польським роботодавцем), B (член правління компанії), C (внутрішньокорпоративне переведення), D (відрядження для надання експортних послуг), E (інші випадки відрядження). Допомагаємо як з підготовкою повного комплекту документів, так і з представництвом перед воєводським управлінням."
        ),
        forWhom: loc(
          "Pracodawcy zatrudniający obcokrajowców oraz cudzoziemcy potrzebujący legalnej podstawy pracy w Polsce.",
          "Employers hiring foreigners and foreigners needing a legal basis for work in Poland.",
          "Работодатели, нанимающие иностранцев, и иностранцы, которым нужно легальное основание для работы в Польше.",
          "Роботодавці, що наймають іноземців, та іноземці, яким потрібна легальна підстава для роботи в Польщі."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Od 1 do 3 miesięcy", "1 to 3 months", "От 1 до 3 месяцев", "Від 1 до 3 місяців"),
        price: null,
        sections: [
          {
            heading: pl("Warunki"),
            body: pl("<p>Wynagrodzenie nie niższe niż porównywalnych pracowników, wymiar czasu pracy od 1/4 do pełnego etatu; cudzoziemiec musi mieć osobno tytuł pobytowy pozwalający na wykonywanie pracy.</p>"),
          },
          {
            heading: pl("Co obejmuje usługa GetPermit (dla pracodawcy)"),
            body: pl("<ul><li>weryfikacja, czy zezwolenie w ogóle jest potrzebne (szeroki katalog zwolnień z tego obowiązku — m.in. Karta Polaka, absolwenci polskich uczelni, pobyt stały, rezydent UE);</li><li>przygotowanie i złożenie wniosku na praca.gov.pl;</li><li>korekty braków na wezwanie urzędu;</li><li>pilnowanie obowiązków po wydaniu zezwolenia (obowiązki notyfikacyjne, zgłoszenie kopii umowy przed rozpoczęciem pracy).</li></ul>"),
          },
          {
            heading: pl("Terminy i opłaty urzędowe"),
            body: pl("<p>Opłata skarbowa: 200 zł (praca do 3 miesięcy), <strong>400 zł</strong> (powierzenie pracy powyżej 3 miesięcy).</p>"),
          },
          {
            heading: pl("Na co uważać"),
            body: pl("<p>Obowiązki notyfikacyjne podmiotu powierzającego wykonywanie pracy oraz obowiązek zgłoszenia kopii umowy cudzoziemca przynajmniej dzień przed rozpoczęciem pracy.</p>"),
          },
        ],
        faq: [
          {
            question: pl("Czy zezwolenie na pracę legalizuje pobyt?"),
            answer: pl("Nie, wymagana jest dodatkowo legalizacja pobytu — np. <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">zezwolenie na pobyt czasowy i pracę</a>."),
          },
          {
            question: pl("Kto składa wniosek?"),
            answer: pl("Podmiot powierzający wykonywanie pracy."),
          },
          {
            question: pl("Jak długo się czeka?"),
            answer: pl("Zależy od danego urzędu wojewódzkiego. Zazwyczaj procedura trwa kilka miesięcy. W razie bezczynności pomagamy z <a href=\"/uslugi/ponaglenia-i-odwolania\">ponagleniami</a>."),
          },
          {
            question: pl("Czy można zmienić stanowisko pracy na zezwoleniu na pracę?"),
            answer: pl("W większości przypadków wymagane jest uzyskanie nowego zezwolenia na pracę — należy konkretnie przeanalizować sytuację."),
          },
        ],
      },
      {
        slug: "oswiadczenie-o-powierzeniu-pracy",
        categorySlug: "dla-pracodawcow",
        order: 2,
        title: loc("O\u015bwiadczenie o powierzeniu pracy", "Employer declaration", "\u0417\u0430\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u043e \u043f\u043e\u0440\u0443\u0447\u0435\u043d\u0438\u0438 \u0440\u0430\u0431\u043e\u0442\u044b", "\u0417\u0430\u044f\u0432\u0430 \u043f\u0440\u043e \u0434\u043e\u0440\u0443\u0447\u0435\u043d\u043d\u044f \u0440\u043e\u0431\u043e\u0442\u0438"),
        shortDescription: loc(
          "Uproszczona procedura dla obywateli Ukrainy, Bia\u0142orusi, Mo\u0142dawii i Armenii \u2014 praca do 24 miesi\u0119cy.",
          "Simplified procedure for citizens of Ukraine, Belarus, Moldova and Armenia \u2014 work up to 24 months.",
          "\u0423\u043f\u0440\u043e\u0449\u0451\u043d\u043d\u0430\u044f \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0430 \u0434\u043b\u044f \u0433\u0440\u0430\u0436\u0434\u0430\u043d \u0423\u043a\u0440\u0430\u0438\u043d\u044b, \u0411\u0435\u043b\u0430\u0440\u0443\u0441\u0438, \u041c\u043e\u043b\u0434\u043e\u0432\u044b \u0438 \u0410\u0440\u043c\u0435\u043d\u0438\u0438 \u2014 \u0440\u0430\u0431\u043e\u0442\u0430 \u0434\u043e 24 \u043c\u0435\u0441\u044f\u0446\u0435\u0432.",
          "\u0421\u043f\u0440\u043e\u0449\u0435\u043d\u0430 \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u0430 \u0434\u043b\u044f \u0433\u0440\u043e\u043c\u0430\u0434\u044f\u043d \u0423\u043a\u0440\u0430\u0457\u043d\u0438, \u0411\u0456\u043b\u043e\u0440\u0443\u0441\u0456, \u041c\u043e\u043b\u0434\u043e\u0432\u0438 \u0442\u0430 \u0412\u0456\u0440\u043c\u0435\u043d\u0456\u0457 \u2014 \u0440\u043e\u0431\u043e\u0442\u0430 \u0434\u043e 24 \u043c\u0456\u0441\u044f\u0446\u0456\u0432."
        ),
        fullDescription: loc(
          "Najszybsza ścieżka legalizacji pracy dla obywateli Armenii, Białorusi, Mołdawii i Ukrainy (bez ochrony czasowej): pracodawca składa wniosek o wpisanie oświadczenia do ewidencji elektronicznie, przed rozpoczęciem pracy, przez system praca.gov.pl. Dotyczy pracy niesezonowej; oświadczenie wydawane jest na okres do 24 miesięcy. Wskazana we wniosku data rozpoczęcia pracy — maksymalnie 6 miesięcy od daty złożenia.",
          "An employer declaration on entrusting work to a foreigner is a simplified procedure intended for citizens of four countries: Ukraine, Belarus, Moldova, and Armenia. The declaration is registered at the District Labor Office appropriate for the employer's registered office and allows the foreigner to work in Poland for up to 24 months. The procedure is significantly faster than a standard work permit. We help employers with correctly completing the application, reporting the start of work, and handling all formalities with the office.",
          "Заявление о поручении работы иностранцу — это упрощённая процедура, предназначенная для граждан четырёх государств: Украины, Беларуси, Молдовы и Армении. Заявление регистрируется в районном управлении труда по месту нахождения работодателя и позволяет иностранцу работать в Польше до 24 месяцев. Процедура значительно быстрее стандартного разрешения на работу. Помогаем работодателям с правильным заполнением заявления, уведомлением о начале работы и решением всех формальностей.",
          "Заява про доручення роботи іноземцю — це спрощена процедура, призначена для громадян чотирьох держав: України, Білорусі, Молдови та Вірменії. Заява реєструється в районному управлінні праці за місцем знаходження роботодавця і дозволяє іноземцю працювати в Польщі до 24 місяців. Процедура значно швидша за стандартний дозвіл на роботу. Допомагаємо роботодавцям з правильним заповненням заяви, повідомленням про початок роботи та вирішенням усіх формальностей."
        ),
        forWhom: loc(
          "Pracodawcy zatrudniający obywateli Ukrainy, Białorusi, Mołdawii lub Armenii.",
          "Employers hiring citizens of Ukraine, Belarus, Moldova, or Armenia.",
          "Работодатели, нанимающие граждан Украины, Беларуси, Молдовы или Армении.",
          "Роботодавці, що наймають громадян України, Білорусі, Молдови або Вірменії."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Od 7 do 30 dni", "7 to 30 days", "От 7 до 30 дней", "Від 7 до 30 днів"),
        price: null,
        sections: [
          {
            heading: pl("Procedura"),
            body: pl("<p>Opłata skarbowa <strong>400 zł</strong>. <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">Oświadczenie</a> składane przez <strong>praca.gov.pl</strong> z wymaganymi załącznikami (w tym wszystkie zapisane strony paszportu cudzoziemca).</p><p>Czas oczekiwania zależy od danego urzędu — wpisanie do ewidencji może zająć tydzień lub kilka tygodni.</p><p>Pracę można rozpocząć <strong>dopiero po wpisie do ewidencji</strong>, na warunkach z oświadczenia.</p><p>Dla cudzoziemca za granicą wpisane oświadczenie to podstawa do ubiegania się o wizę (cel 05a).</p>"),
          },
          {
            heading: pl("Obowiązki pracodawcy po wpisie"),
            body: pl("<ul><li>zgłoszenie <strong>podjęcia</strong> pracy w ciągu 7 dni od rozpoczęcia pracy oraz <strong>niepodjęcia</strong> pracy w ciągu 14 dni od daty rozpoczęcia pracy wskazanej w oświadczeniu;</li><li>zgłoszenie zakończenia pracy cudzoziemca;</li><li>przesłanie kopii umowy zgodnej z oświadczeniem (co najmniej dzień przed rozpoczęciem pracy);</li><li>przekazanie dokumentów cudzoziemcowi.</li></ul><p>Wszystkie zgłoszenia przez praca.gov.pl, pod rygorem grzywny.</p>"),
          },
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>weryfikacja, czy oświadczenie to właściwy tryb dla danego cudzoziemca (alternatywa: <a href=\"/uslugi/powiadomienia-o-powierzeniu-pracy\">powiadomienie</a> dla obywateli Ukrainy lub <a href=\"/uslugi/zezwolenie-na-prace\">zezwolenie na pracę</a>);</li><li>przygotowanie i złożenie wniosku przez praca.gov.pl.</li></ul>"),
          },
        ],
        faq: [
          {
            question: pl("Ile kosztuje wpisanie oświadczenia do ewidencji?"),
            answer: pl("Opłata skarbowa to 400 zł."),
          },
          {
            question: pl("Kiedy pracownik może zacząć pracę?"),
            answer: pl("Po wpisie oświadczenia do ewidencji."),
          },
          {
            question: pl("Czy oświadczenie legalizuje pobyt?"),
            answer: pl("Nie, wymagana jest dodatkowo legalizacja pobytu w Polsce — np. <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">zezwolenie na pobyt czasowy i pracę</a>."),
          },
        ],
      },
      {
        slug: "powiadomienia-o-powierzeniu-pracy",
        categorySlug: "dla-pracodawcow",
        order: 3,
        title: loc(
          "Powiadomienia o powierzeniu pracy cudzoziemcowi",
          "Notifications of entrusting work to a foreigner",
          "Уведомления о поручении работы иностранцу",
          "Повідомлення про доручення роботи іноземцю"
        ),
        shortDescription: loc(
          "Obowiązek powiadomienia PUP o powierzeniu pracy cudzoziemcowi — pomoc w terminowym zgłoszeniu i dokumentacji.",
          "Obligation to notify the District Labor Office about entrusting work to a foreigner — help with timely filing and documentation.",
          "Обязанность уведомить районное управление труда о поручении работы иностранцу — помощь в своевременной подаче и документации.",
          "Обов'язок повідомити районне управління праці про доручення роботи іноземцю — допомога у своєчасній подачі та документації."
        ),
        fullDescription: loc(
          "Powiadomienie to bezpłatne zgłoszenie dotyczące podjęcia pracy przez obywatela Ukrainy lub osobę posiadającą status PESEL UKR. Cudzoziemiec najpierw podejmuje pracę, a pracodawca w ciągu 7 dni od rozpoczęcia pracy powiadamia powiatowy urząd pracy przez praca.gov.pl. To jedyna ścieżka legalizacji pracy dla osób objętych ochroną czasową (status UKR). Obywatele Ukrainy z innym tytułem pobytowym (wiza, karta pobytu, ruch bezwizowy) mogą korzystać z powiadomienia albo oświadczenia o powierzeniu pracy.",
          "An employer hiring a foreigner is obliged to notify the District Labor Office about entrusting work within a specified deadline. Failure to notify on time may result in sanctions. We help with proper preparation and submission of the notification, monitor deadlines, and ensure complete documentation on the employer's side.",
          "Работодатель, нанимающий иностранца, обязан уведомить районное управление труда о поручении работы в установленный срок. Несвоевременное уведомление может повлечь санкции. Помогаем с правильной подготовкой и подачей уведомления, отслеживаем сроки и обеспечиваем полноту документации.",
          "Роботодавець, що наймає іноземця, зобов'язаний повідомити районне управління праці про доручення роботи у визначений термін. Несвоєчасне повідомлення може спричинити санкції. Допомагаємо з правильною підготовкою та подачею повідомлення, відстежуємо терміни та забезпечуємо повноту документації."
        ),
        forWhom: loc(
          "Pracodawcy zatrudniający cudzoziemców, którzy muszą spełnić obowiązek powiadomienia PUP.",
          "Employers hiring foreigners who must fulfill the obligation to notify the District Labor Office.",
          "Работодатели, нанимающие иностранцев и обязанные уведомить районное управление труда.",
          "Роботодавці, що наймають іноземців та зобов'язані повідомити районне управління праці."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Do 7 dni", "Up to 7 days", "До 7 дней", "До 7 днів"),
        price: null,
        sections: [
          {
            heading: pl("Warunki ważności"),
            body: pl("<p>Terminowe powiadomienie z prawidłowymi danymi. Każda zmiana pracodawcy rodzi obowiązek złożenia nowego powiadomienia. W powiadomieniach nie wskazuje się daty zakończenia pracy.</p>"),
          },
          {
            heading: pl("Ważne terminy (ochrona czasowa)"),
            body: pl("<p>Koniec ochrony czasowej: <strong>4.03.2027</strong> — do tej daty należy złożyć wniosek o <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">pobyt czasowy</a>.</p>"),
          },
          {
            heading: pl("Co obejmuje usługa GetPermit"),
            body: pl("<ul><li>ustalenie właściwej ścieżki (status UKR vs inne tytuły pobytowe — alternatywa: <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">oświadczenie o powierzeniu pracy</a>);</li><li>złożenie powiadomienia w terminie;</li><li>strategia na koniec ochrony czasowej oraz wsparcie w składaniu wniosków o pobyt czasowy.</li></ul>"),
          },
        ],
        faq: [
          {
            question: pl("Ile kosztuje złożenie powiadomienia przez pracodawcę?"),
            answer: pl("Powiadomienie jest bezpłatne."),
          },
          {
            question: pl("Co w przypadku, gdy minie 7 dni na złożenie powiadomienia?"),
            answer: pl("Powiadomienie spóźnione nie legalizuje pracy wstecz."),
          },
          {
            question: pl("Czy zmiana stanowiska wymaga nowego powiadomienia?"),
            answer: pl("Zazwyczaj tak, jednak wymagana jest analiza w konkretnej sprawie."),
          },
        ],
      },
      {
        slug: "legalizacja-pracy-b2b-inkubator",
        categorySlug: "dla-pracodawcow",
        order: 4,
        title: loc(
          "Legalizacja pracy na podstawie umowy B2B w inkubatorze przedsiębiorczości",
          "Work legalization via B2B contract in a business incubator",
          "Легализация работы на основе договора B2B в бизнес-инкубаторе",
          "Легалізація роботи на основі договору B2B у бізнес-інкубаторі"
        ),
        shortDescription: loc(
          "Legalizacja pracy na podstawie umowy B2B w inkubatorze przedsiębiorczości — dedykowana ścieżka dla pracodawców i cudzoziemców.",
          "Work legalization via a B2B contract in a business incubator — a dedicated path for employers and foreigners.",
          "Легализация работы на основе договора B2B в бизнес-инкубаторе — выделенный путь для работодателей и иностранцев.",
          "Легалізація роботи на основі договору B2B у бізнес-інкубаторі — виділений шлях для роботодавців та іноземців."
        ),
        fullDescription: loc(
          "Legalizacja pracy cudzoziemca na podstawie umowy B2B zawartej z inkubatorem przedsiębiorczości. Procedura obejmuje zawarcie umowy współpracy z inkubatorem oraz uzyskanie zezwolenia na pracę. Pomagamy pracodawcom i cudzoziemcom w koordynacji z inkubatorem, przygotowaniu dokumentacji i reprezentacji przed urzędami.",
          "Work legalization for a foreigner based on a B2B contract with a business incubator. The procedure involves a cooperation agreement with the incubator and obtaining a work permit. We help employers and foreigners with coordination with the incubator, documentation preparation, and representation before authorities.",
          "Легализация работы иностранца на основе договора B2B с бизнес-инкубатором. Процедура включает договор сотрудничества с инкубатором и получение разрешения на работу. Помогаем работодателям и иностранцам с координацией с инкубатором, подготовкой документации и представительством перед органами.",
          "Легалізація роботи іноземця на основі договору B2B з бізнес-інкубатором. Процедура включає договір співпраці з інкубатором та отримання дозволу на роботу. Допомагаємо роботодавцям та іноземцям з координацією з інкубатором, підготовкою документації та представництвом перед органами."
        ),
        forWhom: loc(
          "Pracodawcy i cudzoziemcy korzystający z umowy B2B w inkubatorze przedsiębiorczości.",
          "Employers and foreigners using a B2B contract in a business incubator.",
          "Работодатели и иностранцы, использующие договор B2B в бизнес-инкубаторе.",
          "Роботодавці та іноземці, що використовують договір B2B у бізнес-інкубаторі."
        ),
        requiredDocuments: {
          pl: ["Szczegółowa lista dokumentów zależy od indywidualnej sytuacji — zostanie przedstawiona na konsultacji."],
          en: ["The detailed list of documents depends on the individual situation — it will be presented during the consultation."],
          ru: ["Подробный список документов зависит от индивидуальной ситуации — он будет представлен на консультации."],
          uk: ["Детальний список документів залежить від індивідуальної ситуації — він буде представлений на консультації."],
        },
        estimatedTime: loc("Od 1 do 3 miesięcy", "1 to 3 months", "От 1 до 3 месяцев", "Від 1 до 3 місяців"),
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
