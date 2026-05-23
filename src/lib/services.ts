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
        fullDescription: loc(
          "Zezwolenie na pobyt czasowy i pracę, znane jako \u201ejedno zezwolenie\u201d, to najpopularniejsza ścieżka dla cudzoziemców spoza UE pracujących w Polsce. Łączy w sobie zezwolenie pobytowe i prawo do wykonywania pracy u konkretnego pracodawcy — eliminuje konieczność prowadzenia dwóch równoległych postępowań. Reprezentujemy zarówno cudzoziemca, jak i pracodawcę przed wojewodą, dbając o pełną zgodność dokumentacji z aktualnymi wymogami prawnymi.",
          "The temporary residence and work permit, known as the \"single permit\", is the most popular path for non-EU foreigners working in Poland. It combines a residence permit with the right to work for a specific employer — eliminating the need for two separate proceedings. We represent both the foreigner and the employer before the voivode, ensuring full compliance of documentation with current legal requirements.",
          "Разрешение на временное пребывание и работу, известное как «единое разрешение», — самый популярный путь для иностранцев из-за пределов ЕС, работающих в Польше. Оно объединяет вид на жительство с правом работы у конкретного работодателя, исключая необходимость ведения двух параллельных процедур. Мы представляем интересы как иностранца, так и работодателя перед воеводой, обеспечивая полное соответствие документации актуальным правовым требованиям.",
          "Дозвіл на тимчасове перебування та роботу, відомий як «єдиний дозвіл», — найпопулярніший шлях для іноземців з-поза ЄС, що працюють у Польщі. Він поєднує дозвіл на проживання з правом на роботу у конкретного роботодавця, усуваючи потребу у двох паралельних процедурах. Ми представляємо інтереси як іноземця, так і роботодавця перед воєводою, забезпечуючи повну відповідність документації чинним правовим вимогам."
        ),
        forWhom: loc(
          "Pracujący cudzoziemcy spoza UE oraz ich pracodawcy — w jednym, połączonym postępowaniu.",
          "Non-EU working foreigners and their employers — in a single, combined procedure.",
          "Работающие иностранцы из-за пределов ЕС и их работодатели — в одной объединённой процедуре.",
          "Працюючі іноземці з-поза ЄС та їхні роботодавці — в одній об'єднаній процедурі."
        ),
        requiredDocuments: {
          pl: [
            "Wniosek o udzielenie zezwolenia na pobyt czasowy i pracę",
            "Załącznik nr 1 do wniosku (od pracodawcy)",
            "Cztery fotografie",
            "Kopia ważnego dokumentu podróży",
            "Informacja starosty (test rynku pracy, jeśli wymagany)",
            "Umowa o pracę lub umowa cywilnoprawna",
            "Potwierdzenie ubezpieczenia zdrowotnego i miejsca zamieszkania",
          ],
          en: [
            "Application for a temporary residence and work permit",
            "Appendix No. 1 to the application (from the employer)",
            "Four photographs",
            "Copy of a valid travel document",
            "Starost's information (labor market test, if required)",
            "Employment contract or civil law contract",
            "Confirmation of health insurance and place of residence",
          ],
          ru: [
            "Заявление на получение разрешения на временное пребывание и работу",
            "Приложение № 1 к заявлению (от работодателя)",
            "Четыре фотографии",
            "Копия действующего проездного документа",
            "Информация старосты (тест рынка труда, если требуется)",
            "Трудовой договор или гражданско-правовой договор",
            "Подтверждение медицинского страхования и места проживания",
          ],
          uk: [
            "Заява на отримання дозволу на тимчасове перебування та роботу",
            "Додаток № 1 до заяви (від роботодавця)",
            "Чотири фотографії",
            "Копія дійсного проїзного документа",
            "Інформація старости (тест ринку праці, якщо потрібно)",
            "Трудовий договір або цивільно-правовий договір",
            "Підтвердження медичного страхування та місця проживання",
          ],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
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
        fullDescription: loc(
          "Zezwolenie na pobyt czasowy to karta pobytu wydawana przez wojewodę na okres do 3 lat, przeznaczona dla cudzoziemców, którzy mają konkretny cel pobytu w Polsce: studia, łączenie rodzin, prowadzenie działalności gospodarczej, prowadzenie badań naukowych lub inne uzasadnione okoliczności. Pomagamy w skompletowaniu pełnej dokumentacji wymaganej przez wojewodę, przygotowaniu uzasadnienia wniosku oraz reprezentacji klienta na każdym etapie postępowania administracyjnego.",
          "A temporary residence permit is a residence card issued by the voivode for up to 3 years, intended for foreigners who have a specific purpose of stay in Poland: studies, family reunification, running a business, conducting scientific research, or other justified circumstances. We help with compiling the complete documentation required by the voivode, preparing the justification for the application, and representing the client at every stage of the administrative proceedings.",
          "Разрешение на временное пребывание — это карта побыту, выдаваемая воеводой на срок до 3 лет, предназначенная для иностранцев, имеющих конкретную цель пребывания в Польше: учёба, воссоединение семьи, ведение бизнеса, научные исследования или другие обоснованные обстоятельства. Помогаем в сборе полного комплекта документов, подготовке обоснования заявления и представительстве клиента на каждом этапе административного процесса.",
          "Дозвіл на тимчасове перебування — це карта побуту, що видається воєводою на термін до 3 років, призначена для іноземців, які мають конкретну мету перебування в Польщі: навчання, возз'єднання сім'ї, ведення бізнесу, наукові дослідження або інші обґрунтовані обставини. Допомагаємо у зборі повного комплекту документів, підготовці обґрунтування заяви та представництві клієнта на кожному етапі адміністративного процесу."
        ),
        forWhom: loc(
          "Cudzoziemcy planujący dłuższy pobyt w Polsce z konkretnym celem (studia, rodzina, działalność, badania).",
          "Foreigners planning a longer stay in Poland with a specific purpose (studies, family, business, research).",
          "Иностранцы, планирующие длительное пребывание в Польше с конкретной целью (учёба, семья, бизнес, исследования).",
          "Іноземці, що планують тривале перебування в Польщі з конкретною метою (навчання, сім'я, бізнес, дослідження)."
        ),
        requiredDocuments: {
          pl: [
            "Wniosek o udzielenie zezwolenia na pobyt czasowy",
            "Cztery aktualne fotografie",
            "Kopia ważnego dokumentu podróży",
            "Dokumenty potwierdzające cel pobytu (zaświadczenie z uczelni, akt małżeństwa, wpis do CEIDG itp.)",
            "Potwierdzenie posiadania ubezpieczenia zdrowotnego",
            "Potwierdzenie posiadania źródła stabilnego dochodu",
            "Potwierdzenie miejsca zamieszkania",
          ],
          en: [
            "Application for a temporary residence permit",
            "Four recent photographs",
            "Copy of a valid travel document",
            "Documents confirming the purpose of stay (university certificate, marriage certificate, CEIDG entry, etc.)",
            "Confirmation of health insurance",
            "Confirmation of a stable source of income",
            "Confirmation of place of residence",
          ],
          ru: [
            "Заявление на получение разрешения на временное пребывание",
            "Четыре актуальные фотографии",
            "Копия действующего проездного документа",
            "Документы, подтверждающие цель пребывания (справка из вуза, свидетельство о браке, запись в CEIDG и т.д.)",
            "Подтверждение наличия медицинского страхования",
            "Подтверждение стабильного источника дохода",
            "Подтверждение места проживания",
          ],
          uk: [
            "Заява на отримання дозволу на тимчасове перебування",
            "Чотири актуальні фотографії",
            "Копія дійсного проїзного документа",
            "Документи, що підтверджують мету перебування (довідка з університету, свідоцтво про шлюб, запис у CEIDG тощо)",
            "Підтвердження наявності медичного страхування",
            "Підтвердження стабільного джерела доходу",
            "Підтвердження місця проживання",
          ],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
        price: null,
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
          "Legalizacja pobytu i pracy na podstawie umowy B2B w inkubatorze przedsiębiorczości — dedykowana ścieżka dla cudzoziemców prowadzących działalność.",
          "Residence and work legalization via a B2B contract in a business incubator — a dedicated path for foreigners running a business.",
          "Легализация пребывания и работы на основе договора B2B в бизнес-инкубаторе — выделенный путь для иностранцев, ведущих бизнес.",
          "Легалізація перебування та роботи на основі договору B2B у бізнес-інкубаторі — виділений шлях для іноземців, що ведуть бізнес."
        ),
        fullDescription: loc(
          "Legalizacja pobytu i pracy na podstawie umowy B2B zawartej w ramach inkubatora przedsiębiorczości. Inkubator wspiera cudzoziemców w zakładaniu i prowadzeniu działalności gospodarczej w Polsce, co stanowi jedną ze ścieżek uzyskania zezwolenia na pobyt czasowy. Pomagamy w przygotowaniu kompletnej dokumentacji, reprezentacji przed urzędem i koordynacji z inkubatorem.",
          "Residence and work legalization based on a B2B contract within a business incubator. The incubator supports foreigners in establishing and running a business in Poland, which is one of the paths to obtaining a temporary residence permit. We help with preparing complete documentation, representation before authorities, and coordination with the incubator.",
          "Легализация пребывания и работы на основе договора B2B в рамках бизнес-инкубатора. Инкубатор поддерживает иностранцев в создании и ведении бизнеса в Польше, что является одним из путей получения разрешения на временное пребывание. Помогаем с подготовкой документации, представительством перед органами и координацией с инкубатором.",
          "Легалізація перебування та роботи на основі договору B2B у рамках бізнес-інкубатора. Інкубатор підтримує іноземців у створенні та веденні бізнесу в Польщі, що є одним зі шляхів отримання дозволу на тимчасове перебування. Допомагаємо з підготовкою документації, представництвом перед органами та координацією з інкубатором."
        ),
        forWhom: loc(
          "Cudzoziemcy chcący zalegalizować pobyt poprzez prowadzenie działalności gospodarczej w ramach umowy B2B w inkubatorze przedsiębiorczości.",
          "Foreigners wishing to legalize their stay by running a business under a B2B contract in a business incubator.",
          "Иностранцы, желающие легализовать пребывание через ведение бизнеса по договору B2B в бизнес-инкубаторе.",
          "Іноземці, що бажають легалізувати перебування через ведення бізнесу за договором B2B у бізнес-інкубаторі."
        ),
        requiredDocuments: {
          pl: [
            "Wniosek o udzielenie zezwolenia na pobyt czasowy",
            "Dokumenty rejestrowe działalności",
            "Umowa B2B z inkubatorem przedsiębiorczości",
            "Cztery fotografie",
            "Kopia ważnego dokumentu podróży",
            "Potwierdzenie ubezpieczenia zdrowotnego",
            "Potwierdzenie miejsca zamieszkania",
          ],
          en: [
            "Application for a temporary residence permit",
            "Business registration documents",
            "B2B contract with a business incubator",
            "Four photographs",
            "Copy of a valid travel document",
            "Confirmation of health insurance",
            "Confirmation of place of residence",
          ],
          ru: [
            "Заявление на получение разрешения на временное пребывание",
            "Регистрационные документы деятельности",
            "Договор B2B с бизнес-инкубатором",
            "Четыре фотографии",
            "Копия действующего проездного документа",
            "Подтверждение медицинского страхования",
            "Подтверждение места проживания",
          ],
          uk: [
            "Заява на отримання дозволу на тимчасове перебування",
            "Реєстраційні документи діяльності",
            "Договір B2B з бізнес-інкубатором",
            "Чотири фотографії",
            "Копія дійсного проїзного документа",
            "Підтвердження медичного страхування",
            "Підтвердження місця проживання",
          ],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
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
        fullDescription: loc(
          "EU Blue Card to zezwolenie na pobyt i pracę dedykowane wysoko wykwalifikowanym specjalistom — wymaga wykształcenia wyższego oraz wynagrodzenia powyżej określonego progu. Posiadanie Niebieskiej Karty UE daje istotne ułatwienia: szybsze uzyskanie zezwolenia na pobyt rezydenta długoterminowego, krótsze wymagane okresy pobytu przy łączeniu rodzin oraz ułatwiony dostęp do rynku pracy w innych państwach członkowskich UE. Pomagamy w pełnym procesie aplikacyjnym, od weryfikacji uprawnień po reprezentację przed urzędem.",
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
          pl: [
            "Wniosek o udzielenie zezwolenia na pobyt czasowy w celu wykonywania pracy w zawodzie wymagającym wysokich kwalifikacji",
            "Dyplom ukończenia studiów wyższych (uznany w Polsce)",
            "Umowa o pracę lub oferta pracy na co najmniej rok",
            "Potwierdzenie wynagrodzenia powyżej wymaganego progu",
            "Cztery fotografie",
            "Kopia ważnego dokumentu podróży",
            "Potwierdzenie ubezpieczenia zdrowotnego",
          ],
          en: [
            "Application for a temporary residence permit for the purpose of highly qualified employment",
            "Higher education diploma (recognized in Poland)",
            "Employment contract or job offer for at least one year",
            "Confirmation of salary above the required threshold",
            "Four photographs",
            "Copy of a valid travel document",
            "Confirmation of health insurance",
          ],
          ru: [
            "Заявление на получение разрешения на временное пребывание для работы по специальности, требующей высокой квалификации",
            "Диплом о высшем образовании (признанный в Польше)",
            "Трудовой договор или предложение работы минимум на один год",
            "Подтверждение заработной платы выше установленного порога",
            "Четыре фотографии",
            "Копия действующего проездного документа",
            "Подтверждение медицинского страхования",
          ],
          uk: [
            "Заява на отримання дозволу на тимчасове перебування для роботи за спеціальністю, що вимагає високої кваліфікації",
            "Диплом про вищу освіту (визнаний у Польщі)",
            "Трудовий договір або пропозиція роботи мінімум на один рік",
            "Підтвердження заробітної плати вище встановленого порогу",
            "Чотири фотографії",
            "Копія дійсного проїзного документа",
            "Підтвердження медичного страхування",
          ],
        },
        estimatedTime: loc("Od 2 do 4 miesięcy", "2 to 4 months", "От 2 до 4 месяцев", "Від 2 до 4 місяців"),
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
        fullDescription: loc(
          "Wymiana karty pobytu jest konieczna w sytuacjach takich jak utrata dokumentu, jego uszkodzenie lub zniszczenie, zmiana danych osobowych (np. nazwiska po zawarciu małżeństwa), zmiana wizerunku oraz upływ terminu ważności samej karty (przy utrzymującym się zezwoleniu na pobyt). Pomagamy szybko skompletować wniosek i dokumenty, aby cudzoziemiec uniknął luki w posiadaniu ważnego dokumentu pobytowego.",
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
          pl: [
            "Wniosek o wymianę karty pobytu",
            "Aktualna fotografia",
            "Kopia ważnego dokumentu podróży",
            "Dotychczasowa karta pobytu (jeśli posiadana)",
            "Dokument potwierdzający zmianę danych (jeśli dotyczy)",
            "Potwierdzenie wpłaty opłaty",
          ],
          en: [
            "Application for residence card replacement",
            "Recent photograph",
            "Copy of a valid travel document",
            "Current residence card (if available)",
            "Document confirming the change of data (if applicable)",
            "Confirmation of fee payment",
          ],
          ru: [
            "Заявление на замену карты побыту",
            "Актуальная фотография",
            "Копия действующего проездного документа",
            "Текущая карта побыту (при наличии)",
            "Документ, подтверждающий изменение данных (если применимо)",
            "Подтверждение оплаты сбора",
          ],
          uk: [
            "Заява на заміну карти побуту",
            "Актуальна фотографія",
            "Копія дійсного проїзного документа",
            "Поточна карта побуту (за наявності)",
            "Документ, що підтверджує зміну даних (якщо застосовно)",
            "Підтвердження оплати збору",
          ],
        },
        estimatedTime: loc("Od 30 do 60 dni", "30 to 60 days", "От 30 до 60 дней", "Від 30 до 60 днів"),
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
        fullDescription: loc(
          "Status rezydenta długoterminowego UE jest dokumentem pobytowym dającym posiadaczowi szerokie uprawnienia: prawo stałego pobytu w Polsce oraz znaczne ułatwienia w przemieszczaniu się i osiedlaniu w innych państwach członkowskich UE. Wymaga spełnienia kilku warunków: 5 lat nieprzerwanego legalnego pobytu w Polsce, stabilnego i regularnego źródła dochodu wystarczającego na utrzymanie siebie i rodziny, ubezpieczenia zdrowotnego oraz zapewnionego miejsca zamieszkania. Reprezentujemy klienta na każdym etapie postępowania.",
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
          pl: [
            "Wniosek o udzielenie zezwolenia na pobyt rezydenta długoterminowego UE",
            "Cztery fotografie",
            "Kopia ważnego dokumentu podróży",
            "Dokumenty potwierdzające 5 lat nieprzerwanego legalnego pobytu",
            "Dokumenty potwierdzające źródło stabilnego dochodu",
            "Potwierdzenie posiadania ubezpieczenia zdrowotnego",
            "Potwierdzenie tytułu prawnego do lokalu mieszkalnego",
            "Zaświadczenie o znajomości języka polskiego (poziom B1)",
          ],
          en: [
            "Application for an EU long-term resident permit",
            "Four photographs",
            "Copy of a valid travel document",
            "Documents confirming 5 years of uninterrupted legal residence",
            "Documents confirming a stable source of income",
            "Confirmation of health insurance",
            "Confirmation of legal title to a residential property",
            "Certificate of Polish language proficiency (B1 level)",
          ],
          ru: [
            "Заявление на получение разрешения на пребывание долгосрочного резидента ЕС",
            "Четыре фотографии",
            "Копия действующего проездного документа",
            "Документы, подтверждающие 5 лет непрерывного легального проживания",
            "Документы, подтверждающие стабильный источник дохода",
            "Подтверждение медицинского страхования",
            "Подтверждение правового основания на жильё",
            "Сертификат о знании польского языка (уровень B1)",
          ],
          uk: [
            "Заява на отримання дозволу на перебування довгострокового резидента ЄС",
            "Чотири фотографії",
            "Копія дійсного проїзного документа",
            "Документи, що підтверджують 5 років безперервного легального проживання",
            "Документи, що підтверджують стабільне джерело доходу",
            "Підтвердження медичного страхування",
            "Підтвердження правової підстави на житло",
            "Сертифікат про знання польської мови (рівень B1)",
          ],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
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
        fullDescription: loc(
          "Zezwolenie na pobyt stały to bezterminowe zezwolenie pobytowe — ostatni krok przed złożeniem wniosku o obywatelstwo polskie. Aby je uzyskać, cudzoziemiec musi spełniać określone warunki: pochodzenie polskie, małżeństwo z obywatelem Polski (po określonym okresie), posiadanie Karty Polaka, status uchodźcy lub ochrony uzupełniającej, albo określony okres legalnego pobytu w Polsce na podstawie wcześniejszego zezwolenia. Pomagamy zweryfikować podstawę prawną wniosku i prowadzimy klienta przez cały proces aż do otrzymania karty pobytu stałego.",
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
          pl: [
            "Wniosek o udzielenie zezwolenia na pobyt stały",
            "Cztery fotografie",
            "Kopia ważnego dokumentu podróży",
            "Dokumenty potwierdzające podstawę prawną wniosku (np. akt małżeństwa, Karta Polaka, dokumenty potwierdzające pochodzenie polskie)",
            "Zaświadczenie o znajomości języka polskiego (jeśli wymagane)",
            "Potwierdzenie zameldowania",
          ],
          en: [
            "Application for a permanent residence permit",
            "Four photographs",
            "Copy of a valid travel document",
            "Documents confirming the legal basis of the application (e.g., marriage certificate, Karta Polaka, documents confirming Polish descent)",
            "Certificate of Polish language proficiency (if required)",
            "Confirmation of registration of residence",
          ],
          ru: [
            "Заявление на получение разрешения на постоянное пребывание",
            "Четыре фотографии",
            "Копия действующего проездного документа",
            "Документы, подтверждающие правовое основание заявления (свидетельство о браке, Карта поляка, документы о польском происхождении и т.д.)",
            "Сертификат о знании польского языка (если требуется)",
            "Подтверждение регистрации по месту жительства",
          ],
          uk: [
            "Заява на отримання дозволу на постійне перебування",
            "Чотири фотографії",
            "Копія дійсного проїзного документа",
            "Документи, що підтверджують правову підставу заяви (свідоцтво про шлюб, Карта поляка, документи про польське походження тощо)",
            "Сертифікат про знання польської мови (якщо потрібно)",
            "Підтвердження реєстрації за місцем проживання",
          ],
        },
        estimatedTime: loc("Od 3 do 6 miesięcy", "3 to 6 months", "От 3 до 6 месяцев", "Від 3 до 6 місяців"),
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
        fullDescription: loc(
          "Reprezentujemy klienta w dwóch sytuacjach krytycznych: gdy postępowanie pobytowe się przedłuża (ponaglenie kierowane do organu wyższego stopnia) oraz gdy wojewoda wydał decyzję odmowną (odwołanie do Szefa Urzędu do Spraw Cudzoziemców). Przygotowujemy profesjonalne pisma procesowe wraz z argumentacją prawną, kompletujemy dodatkowe dowody w sprawie i reprezentujemy klienta przed organem na każdym etapie. W wielu przypadkach skuteczne odwołanie zmienia decyzję odmowną na pozytywną.",
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
          "Współpracujemy z tłumaczami przysięgłymi różnych języków — pomagamy klientowi szybko uzyskać tłumaczenia przysięgłe dokumentów potrzebnych w procedurach legalizacyjnych: aktów urodzenia, aktów małżeństwa, zaświadczeń o niekaralności, dyplomów ukończenia studiów, świadectw pracy, umów o pracę, wyciągów z rejestrów handlowych i innych dokumentów wydanych za granicą. Bierzemy na siebie cały proces komunikacji z tłumaczem — klient otrzymuje gotowe, prawidłowo uwierzytelnione tłumaczenia gotowe do złożenia w urzędzie.",
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
          "Zezwolenie na pracę jest dokumentem wydawanym przez wojewodę dla cudzoziemców spoza Unii Europejskiej, którzy podejmują pracę w Polsce. Obejmuje wszystkie typy zezwoleń: A (praca na podstawie umowy z polskim pracodawcą), B (członek zarządu spółki), C (oddelegowanie wewnątrz korporacji), D (oddelegowanie do realizacji usług eksportowych), E (inne przypadki oddelegowania). Pomagamy zarówno w przygotowaniu kompletnej dokumentacji, jak i w reprezentacji przed urzędem wojewódzkim — od testu rynku pracy po odbiór decyzji.",
          "A work permit is a document issued by the voivode for non-EU foreigners taking up employment in Poland. It covers all permit types: A (employment contract with a Polish employer), B (company board member), C (intra-corporate transfer), D (secondment for export service delivery), E (other secondment cases). We help both with preparing complete documentation and representation before the voivodeship office — from the labor market test to collecting the decision.",
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
          pl: [
            "Wniosek o wydanie zezwolenia na pracę",
            "Kopia paszportu cudzoziemca",
            "Dokumenty potwierdzające kwalifikacje zawodowe",
            "Informacja starosty o braku możliwości zaspokojenia potrzeb kadrowych (test rynku pracy, jeśli wymagany)",
            "Oświadczenie pracodawcy o niekaralności",
            "Potwierdzenie wpłaty opłaty skarbowej",
          ],
          en: [
            "Application for a work permit",
            "Copy of the foreigner's passport",
            "Documents confirming professional qualifications",
            "Starost's information on inability to meet staffing needs (labor market test, if required)",
            "Employer's declaration of no criminal record",
            "Confirmation of stamp duty payment",
          ],
          ru: [
            "Заявление на получение разрешения на работу",
            "Копия паспорта иностранца",
            "Документы, подтверждающие профессиональную квалификацию",
            "Информация старосты о невозможности удовлетворить кадровые потребности (тест рынка труда, если требуется)",
            "Заявление работодателя о несудимости",
            "Подтверждение оплаты гербового сбора",
          ],
          uk: [
            "Заява на отримання дозволу на роботу",
            "Копія паспорта іноземця",
            "Документи, що підтверджують професійну кваліфікацію",
            "Інформація старости про неможливість задовольнити кадрові потреби (тест ринку праці, якщо потрібно)",
            "Заява роботодавця про несудимість",
            "Підтвердження оплати гербового збору",
          ],
        },
        estimatedTime: loc("Od 1 do 3 miesięcy", "1 to 3 months", "От 1 до 3 месяцев", "Від 1 до 3 місяців"),
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
        fullDescription: loc(
          "Oświadczenie o powierzeniu wykonywania pracy cudzoziemcowi to uproszczona procedura, przeznaczona dla obywateli sześciu państw: Ukrainy, Białorusi, Rosji, Mołdawii, Gruzji i Armenii. Oświadczenie rejestrowane jest w Powiatowym Urzędzie Pracy właściwym dla siedziby pracodawcy i pozwala cudzoziemcowi pracować w Polsce do 24 miesięcy. Procedura jest znacząco szybsza niż klasyczne zezwolenie na pracę. Pomagamy pracodawcom w prawidłowym wypełnieniu wniosku, zgłoszeniu rozpoczęcia pracy i obsłudze wszelkich formalności po stronie urzędu.",
          "An employer declaration on entrusting work to a foreigner is a simplified procedure intended for citizens of six countries: Ukraine, Belarus, Russia, Moldova, Georgia, and Armenia. The declaration is registered at the District Labor Office appropriate for the employer's registered office and allows the foreigner to work in Poland for up to 24 months. The procedure is significantly faster than a standard work permit. We help employers with correctly completing the application, reporting the start of work, and handling all formalities with the office.",
          "Заявление о поручении работы иностранцу — это упрощённая процедура, предназначенная для граждан шести государств: Украины, Беларуси, России, Молдовы, Грузии и Армении. Заявление регистрируется в районном управлении труда по месту нахождения работодателя и позволяет иностранцу работать в Польше до 24 месяцев. Процедура значительно быстрее стандартного разрешения на работу. Помогаем работодателям с правильным заполнением заявления, уведомлением о начале работы и решением всех формальностей.",
          "Заява про доручення роботи іноземцю — це спрощена процедура, призначена для громадян шести держав: України, Білорусі, Росії, Молдови, Грузії та Вірменії. Заява реєструється в районному управлінні праці за місцем знаходження роботодавця і дозволяє іноземцю працювати в Польщі до 24 місяців. Процедура значно швидша за стандартний дозвіл на роботу. Допомагаємо роботодавцям з правильним заповненням заяви, повідомленням про початок роботи та вирішенням усіх формальностей."
        ),
        forWhom: loc(
          "Pracodawcy zatrudniający obywateli Ukrainy, Białorusi, Rosji, Mołdawii, Gruzji lub Armenii oraz sami cudzoziemcy z tych krajów.",
          "Employers hiring citizens of Ukraine, Belarus, Russia, Moldova, Georgia, or Armenia, and the foreigners themselves from these countries.",
          "Работодатели, нанимающие граждан Украины, Беларуси, России, Молдовы, Грузии или Армении, а также сами иностранцы из этих стран.",
          "Роботодавці, що наймають громадян України, Білорусі, Росії, Молдови, Грузії або Вірменії, та самі іноземці з цих країн."
        ),
        requiredDocuments: {
          pl: [
            "Wniosek (oświadczenie) o powierzeniu wykonywania pracy",
            "Kopia paszportu cudzoziemca",
            "Dokumenty rejestrowe pracodawcy",
            "Oświadczenie pracodawcy o niekaralności",
            "Potwierdzenie wpłaty opłaty",
          ],
          en: [
            "Application (declaration) on entrusting work",
            "Copy of the foreigner's passport",
            "Employer's registration documents",
            "Employer's declaration of no criminal record",
            "Confirmation of fee payment",
          ],
          ru: [
            "Заявление (декларация) о поручении работы",
            "Копия паспорта иностранца",
            "Регистрационные документы работодателя",
            "Заявление работодателя о несудимости",
            "Подтверждение оплаты сбора",
          ],
          uk: [
            "Заява (декларація) про доручення роботи",
            "Копія паспорта іноземця",
            "Реєстраційні документи роботодавця",
            "Заява роботодавця про несудимість",
            "Підтвердження оплати збору",
          ],
        },
        estimatedTime: loc("Od 7 do 30 dni", "7 to 30 days", "От 7 до 30 дней", "Від 7 до 30 днів"),
        price: null,
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
          "Pracodawca zatrudniający cudzoziemca ma obowiązek powiadomienia Powiatowego Urzędu Pracy o powierzeniu pracy w określonym terminie. Brak terminowego powiadomienia może skutkować sankcjami. Pomagamy w prawidłowym przygotowaniu i złożeniu powiadomienia, monitorujemy terminy i dbamy o kompletność dokumentacji po stronie pracodawcy.",
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
          pl: [
            "Dane cudzoziemca (kopia paszportu)",
            "Dane pracodawcy (KRS, NIP)",
            "Informacje o warunkach zatrudnienia",
            "Kopia oświadczenia lub zezwolenia na pracę",
          ],
          en: [
            "Foreigner's data (passport copy)",
            "Employer's data (KRS, NIP)",
            "Information about employment conditions",
            "Copy of the declaration or work permit",
          ],
          ru: [
            "Данные иностранца (копия паспорта)",
            "Данные работодателя (KRS, NIP)",
            "Информация об условиях трудоустройства",
            "Копия заявления или разрешения на работу",
          ],
          uk: [
            "Дані іноземця (копія паспорта)",
            "Дані роботодавця (KRS, NIP)",
            "Інформація про умови працевлаштування",
            "Копія заяви або дозволу на роботу",
          ],
        },
        estimatedTime: loc("Do 7 dni", "Up to 7 days", "До 7 дней", "До 7 днів"),
        price: null,
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
          "Legalizacja pracy na podstawie umowy B2B zawartej w ramach inkubatora przedsiębiorczości. Inkubator wspiera pracodawców i cudzoziemców w procesie legalizacji zatrudnienia, oferując dedykowane ścieżki proceduralne. Pomagamy w koordynacji z inkubatorem, przygotowaniu dokumentacji i reprezentacji przed urzędami.",
          "Work legalization based on a B2B contract within a business incubator. The incubator supports employers and foreigners in the employment legalization process, offering dedicated procedural paths. We help with coordination with the incubator, documentation preparation, and representation before authorities.",
          "Легализация работы на основе договора B2B в рамках бизнес-инкубатора. Инкубатор поддерживает работодателей и иностранцев в процессе легализации трудоустройства. Помогаем с координацией с инкубатором, подготовкой документации и представительством перед органами.",
          "Легалізація роботи на основі договору B2B у рамках бізнес-інкубатора. Інкубатор підтримує роботодавців та іноземців у процесі легалізації працевлаштування. Допомагаємо з координацією з інкубатором, підготовкою документації та представництвом перед органами."
        ),
        forWhom: loc(
          "Pracodawcy i cudzoziemcy korzystający z umowy B2B w inkubatorze przedsiębiorczości.",
          "Employers and foreigners using a B2B contract in a business incubator.",
          "Работодатели и иностранцы, использующие договор B2B в бизнес-инкубаторе.",
          "Роботодавці та іноземці, що використовують договір B2B у бізнес-інкубаторі."
        ),
        requiredDocuments: {
          pl: [
            "Dokumenty rejestrowe pracodawcy",
            "Kopia paszportu cudzoziemca",
            "Umowa B2B z inkubatorem przedsiębiorczości",
            "Umowa o pracę lub umowa cywilnoprawna",
          ],
          en: [
            "Employer's registration documents",
            "Copy of the foreigner's passport",
            "B2B contract with a business incubator",
            "Employment contract or civil law contract",
          ],
          ru: [
            "Регистрационные документы работодателя",
            "Копия паспорта иностранца",
            "Договор B2B с бизнес-инкубатором",
            "Трудовой договор или гражданско-правовой договор",
          ],
          uk: [
            "Реєстраційні документи роботодавця",
            "Копія паспорта іноземця",
            "Договір B2B з бізнес-інкубатором",
            "Трудовий договір або цивільно-правовий договір",
          ],
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
