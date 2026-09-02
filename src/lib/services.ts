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
          "The temporary residence and work permit (zezwolenie na pobyt czasowy i prace), also known as the single permit (Article 114 of the Act on Foreigners), is a single decision of the voivode that legalizes both residence and employment in Poland at the same time. It is the most commonly chosen path for foreigners already in Poland (on a visa, in visa-free travel, or on a previous residence card) who want to stay longer while working for a Polish entity. The application is submitted by the foreigner — not the employer. The permit is issued for a maximum of 3 years.",
          "Разрешение на временное проживание и работу (zezwolenie na pobyt czasowy i pracę), так называемое единое разрешение (art. 114 закона об иностранцах), — это одно решение воеводы (wojewoda), которое легализует одновременно проживание и трудоустройство в Польше. Это наиболее часто выбираемый путь для иностранца, который уже находится в Польше (по визе, в безвизовом режиме или с предыдущей картой побыту (karta pobytu)) и хочет остаться дольше, работая на польский субъект. Заявление подаёт иностранец — не работодатель. Разрешение выдаётся максимально на 3 года.",
          "Дозвіл на тимчасове проживання та роботу (zezwolenie na pobyt czasowy i pracę), так званий єдиний дозвіл (ст. 114 закону про іноземців), — це одне рішення воєводи (wojewoda), яке легалізує одночасно проживання та працевлаштування в Польщі. Це найчастіше обирана процедура для іноземця, який вже перебуває в Польщі (за візою, у безвізовому режимі або з попередньою картою побиту (посвідка на проживання)) і хоче залишитися довше, працюючи на польський суб'єкт. Заяву подає іноземець — не роботодавець. Дозвіл видається максимально на 3 роки."
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
            heading: loc("Warunki", "Requirements", "Условия", "Умови"),
            body: loc("<p>Ubezpieczenie zdrowotne (ZUS lub prywatne pokrywające leczenie w Polsce). Wynagrodzenie cudzoziemca nie niższe niż porównywalnych pracowników i <strong>nie niższe niż minimalne wynagrodzenie niezależnie od wymiaru czasu pracy</strong> (w 2026 roku to 4 806 zł brutto). W zawodach regulowanych wymagane są dokumenty potwierdzające uprawnienia. Procedura nie obejmuje m.in. pracowników delegowanych, pracowników sezonowych i osób na wizach turystycznych.</p>", "<p>Health insurance (ZUS or private insurance covering treatment in Poland). The foreigner's salary must be no lower than that of comparable employees and <strong>no lower than the minimum wage regardless of working hours</strong> (in 2026 this is 4,806 PLN gross). In regulated professions, documents confirming qualifications are required. The procedure does not cover, among others, posted workers, seasonal workers, and persons on tourist visas.</p>", "<p>Медицинская страховка (ZUS или частная, покрывающая лечение в Польше). Заработная плата иностранца не ниже, чем у сопоставимых работников, и <strong>не ниже минимальной заработной платы независимо от продолжительности рабочего времени</strong> (в 2026 году — 4 806 злотых брутто). В регулируемых профессиях требуются документы, подтверждающие квалификацию. Процедура не распространяется, в частности, на командированных работников, сезонных работников и лиц с туристическими визами.</p>", "<p>Медичне страхування (ubezpieczenie zdrowotne) (ZUS або приватне, що покриває лікування в Польщі). Заробітна плата іноземця не нижча, ніж у порівнянних працівників, і <strong>не нижча за мінімальну заробітну плату незалежно від обсягу робочого часу</strong> (у 2026 році — 4 806 злотих брутто). У регульованих професіях необхідні документи, що підтверджують кваліфікацію. Процедура не поширюється, зокрема, на відряджених працівників, сезонних працівників та осіб із туристичними візами.</p>"),
          },
          {
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>analiza sytuacji pobytowej i wybór optymalnej ścieżki;</li><li>przygotowanie kompletu dokumentów i załączników;</li><li>wypełnienie i złożenie wniosku (elektronicznie przez portal MOS — mos.cudzoziemcy.gov.pl);</li><li>odpowiedzi na wezwania urzędu i uzupełnianie braków;</li><li>monitoring sprawy aż do wydania decyzji i odbioru karty pobytu.</li></ul>", "<ul><li>analysis of your residence situation and selection of the optimal path;</li><li>preparation of a complete set of documents and attachments;</li><li>completing and submitting the application (electronically via the MOS portal — mos.cudzoziemcy.gov.pl);</li><li>responding to office requests and supplementing deficiencies;</li><li>case monitoring until the decision is issued and the residence card is collected.</li></ul>", "<ul><li>анализ ситуации с проживанием и выбор оптимального пути;</li><li>подготовка полного комплекта документов и приложений;</li><li>заполнение и подача заявления (электронно через портал MOS — mos.cudzoziemcy.gov.pl);</li><li>ответы на запросы ведомства и устранение недостатков;</li><li>мониторинг дела до вынесения решения и получения карты побыту (karta pobytu).</li></ul>", "<ul><li>аналіз ситуації з проживанням та вибір оптимального шляху;</li><li>підготовка повного комплекту документів та додатків;</li><li>заповнення та подання заяви (електронно через портал MOS — mos.cudzoziemcy.gov.pl);</li><li>відповіді на запити відомства та усунення недоліків;</li><li>моніторинг справи до видачі рішення та отримання карти побиту (посвідка на проживання).</li></ul>"),
          },
          {
            heading: loc("Wymagane dokumenty", "Required documents", "Необходимые документы", "Необхідні документи"),
            body: loc("<ul><li>ważny dokument podróży (wszystkie strony);</li><li>wypełniony wniosek z załącznikiem nr 1 od pracodawcy (potwierdzającym warunki zatrudnienia);</li><li>ubezpieczenie zdrowotne (ZUS lub prywatna polisa ubezpieczeniowa);</li><li>potwierdzenie źródła stabilnego dochodu (umowa, rachunki itp.);</li><li>fotografia (684 × 883 piksele, plik nie większy niż 2,5 MB, proporcje odpowiadające fotografii 35 × 45 mm);</li><li>potwierdzenie opłaty skarbowej (440 zł).</li></ul>", "<ul><li>valid travel document (all pages);</li><li>completed application with Annex 1 from the employer (confirming employment conditions);</li><li>health insurance (ZUS or private insurance policy);</li><li>proof of a stable source of income (contract, invoices, etc.);</li><li>photograph (684 x 883 pixels, file no larger than 2.5 MB, proportions corresponding to a 35 x 45 mm photo);</li><li>proof of stamp duty payment (440 PLN).</li></ul>", "<ul><li>действующий проездной документ (все страницы);</li><li>заполненное заявление с приложением № 1 от работодателя (подтверждающим условия трудоустройства);</li><li>медицинская страховка (ZUS или частный страховой полис);</li><li>подтверждение стабильного источника дохода (договор, счета и т. д.);</li><li>фотография (684 × 883 пикселей, файл не более 2,5 МБ, пропорции соответствуют фото 35 × 45 мм);</li><li>подтверждение оплаты гербового сбора (opłata skarbowa) — 440 злотых.</li></ul>", "<ul><li>дійсний документ для подорожі (усі сторінки);</li><li>заповнена заява з додатком № 1 від роботодавця (що підтверджує умови працевлаштування);</li><li>медичне страхування (ubezpieczenie zdrowotne) (ZUS або приватний страховий поліс);</li><li>підтвердження стабільного джерела доходу (договір, рахунки тощо);</li><li>фотографія (684 × 883 пікселі, файл не більше 2,5 МБ, пропорції відповідають фото 35 × 45 мм);</li><li>підтвердження оплати гербового збору (opłata skarbowa) — 440 злотих.</li></ul>"),
          },
          {
            heading: loc("Proces krok po kroku", "Step-by-step process", "Процесс шаг за шагом", "Процес крок за кроком"),
            body: loc("<ol><li>Konsultacja i analiza dokumentów.</li><li>Kompletowanie załączników z pracodawcą.</li><li>Złożenie wniosku przez MOS.</li><li>Postępowanie przed wojewodą (w praktyce od kilku do kilkunastu miesięcy, zależnie od województwa) i oczekiwanie na ewentualne wezwania z urzędu.</li><li>Wydanie decyzji, następnie odbiór karty pobytu.</li></ol>", "<ol><li>Consultation and document analysis.</li><li>Compiling attachments with the employer.</li><li>Submitting the application via MOS.</li><li>Proceedings before the voivode (in practice several to over a dozen months, depending on the voivodeship) and awaiting any requests from the office.</li><li>Issuance of the decision, followed by collection of the residence card.</li></ol>", "<ol><li>Консультация и анализ документов.</li><li>Подготовка приложений совместно с работодателем.</li><li>Подача заявления через MOS.</li><li>Производство перед воеводой (wojewoda) (на практике от нескольких до нескольких десятков месяцев, в зависимости от воеводства) и ожидание возможных запросов из ведомства.</li><li>Вынесение решения, затем получение карты побыту (karta pobytu).</li></ol>", "<ol><li>Консультація та аналіз документів.</li><li>Комплектування додатків з роботодавцем.</li><li>Подання заяви через MOS.</li><li>Провадження перед воєводою (wojewoda) (на практиці від кількох до кільканадцяти місяців, залежно від воєводства) та очікування на можливі запити з відомства.</li><li>Видача рішення, потім отримання карти побиту (посвідка на проживання).</li></ol>"),
          },
          {
            heading: loc("Terminy i opłaty urzędowe", "Deadlines and official fees", "Сроки и государственные сборы", "Строки та державні збори"),
            body: loc("<p>Opłata skarbowa 440 zł (pobyt czasowy i praca); karta pobytu 100 zł; opłata od pełnomocnictwa 17 zł.</p>", "<p>Stamp duty 440 PLN (temporary residence and work); residence card 100 PLN; power of attorney fee 17 PLN.</p>", "<p>Гербовый сбор (opłata skarbowa) 440 злотых (временное проживание и работа); карта побыту (karta pobytu) 100 злотых; сбор за доверенность 17 злотых.</p>", "<p>Гербовий збір (opłata skarbowa) 440 злотих (тимчасове проживання та робота); карта побиту (посвідка на проживання) 100 злотих; збір за довіреність 17 злотих.</p>"),
          },
          {
            heading: loc("Obowiązki po uzyskaniu decyzji", "Obligations after the decision", "Обязанности после получения решения", "Обов'язки після отримання рішення"),
            body: loc("<ul><li>zawiadomienie wojewody o utracie pracy w ciągu <strong>15 dni roboczych</strong>;</li><li>zmiana warunków pracy co do zasady wymaga zmiany zezwolenia (wyjątki: m.in. zmiana nazwy pracodawcy, przejście zakładu pracy, zwiększenie etatu z proporcjonalnym wynagrodzeniem, zamiana umowy cywilnoprawnej na umowę o pracę — wtedy wystarczy powiadomienie w ciągu 15 dni roboczych).</li></ul>", "<ul><li>notifying the voivode of job loss within <strong>15 business days</strong>;</li><li>changing work conditions generally requires amending the permit (exceptions include: change of employer name, transfer of the workplace, increase in working hours with proportional salary, replacement of a civil-law contract with an employment contract — in those cases a notification within 15 business days is sufficient).</li></ul>", "<ul><li>уведомление воеводы (wojewoda) об утрате работы в течение <strong>15 рабочих дней</strong>;</li><li>изменение условий работы, как правило, требует изменения разрешения (исключения: в т. ч. смена наименования работодателя, переход предприятия, увеличение занятости с пропорциональной оплатой, замена гражданско-правового договора на трудовой — тогда достаточно уведомления в течение 15 рабочих дней).</li></ul>", "<ul><li>повідомлення воєводи (wojewoda) про втрату роботи протягом <strong>15 робочих днів</strong>;</li><li>зміна умов роботи, як правило, потребує зміни дозволу (винятки: зокрема, зміна назви роботодавця, перехід підприємства, збільшення зайнятості з пропорційною оплатою, заміна цивільно-правового договору на трудовий — тоді достатньо повідомлення протягом 15 робочих днів).</li></ul>"),
          },
          {
            heading: loc("Na co uważać", "What to watch out for", "На что обратить внимание", "На що звернути увагу"),
            body: loc("<ul><li>potwierdzenie otrzymane z systemu MOS nie uprawnia do podróżowania po strefie Schengen (poza powrotem do kraju pochodzenia);</li><li>praca w trakcie procedury zależy od wcześniejszych uprawnień do wykonywania pracy;</li><li>braki formalne nieuzupełnione w terminie kończą się pozostawieniem wniosku bez rozpoznania.</li></ul>", "<ul><li>the confirmation received from the MOS system does not entitle you to travel within the Schengen area (except for returning to your country of origin);</li><li>the right to work during the procedure depends on your previous work entitlements;</li><li>formal deficiencies not supplemented within the deadline result in the application being left without examination.</li></ul>", "<ul><li>подтверждение, полученное из системы MOS, не даёт права на поездки по Шенгенской зоне (кроме возвращения в страну происхождения);</li><li>право на работу во время процедуры зависит от ранее имевшихся оснований для выполнения работы;</li><li>формальные недостатки, не устранённые в срок, приводят к оставлению заявления без рассмотрения.</li></ul>", "<ul><li>підтвердження, отримане з системи MOS, не дає права на подорожі по Шенгенській зоні (крім повернення до країни походження);</li><li>право на роботу під час процедури залежить від раніше наявних підстав для виконання роботи;</li><li>формальні недоліки, не усунуті вчасно, призводять до залишення заяви без розгляду.</li></ul>"),
          },
        ],
        faq: [
          {
            question: loc("Czy mogę pracować, czekając na decyzję?", "Can I work while waiting for the decision?", "Могу ли я работать, ожидая решения?", "Чи можу я працювати, чекаючи на рішення?"),
            answer: loc("Jeśli przed złożeniem wniosku miałeś prawo do pracy (np. oświadczenie, poprzednie zezwolenie), zwykle tak — jednak zawsze wymagana jest dokładna analiza sprawy.", "If you had the right to work before submitting the application (e.g., an employer's declaration on entrusting work, a previous permit), usually yes — however, a thorough analysis of each case is always required.", "Если до подачи заявления у вас было право на работу (например, заявление о поручении работы (oświadczenie), предыдущее разрешение), обычно да — однако всегда требуется тщательный анализ дела.", "Якщо до подання заяви ви мали право на роботу (наприклад, заява про доручення роботи (oświadczenie), попередній дозвіл), зазвичай так — однак завжди необхідний ретельний аналіз справи."),
          },
          {
            question: loc("Co przy zmianie pracodawcy?", "What happens when changing employers?", "Что делать при смене работодателя?", "Що робити при зміні роботодавця?"),
            answer: loc("W takim przypadku należy rozważyć złożenie nowego wniosku lub zmianę aktualnego zezwolenia.", "In such a case, you should consider submitting a new application or amending your current permit.", "В таком случае следует рассмотреть подачу нового заявления или изменение действующего разрешения.", "У такому випадку слід розглянути подання нової заяви або зміну чинного дозволу."),
          },
          {
            question: loc("Jak długo czeka się na decyzję?", "How long does it take to get a decision?", "Сколько ждать решения?", "Як довго чекати на рішення?"),
            answer: loc("Zależnie od województwa, w praktyce kilka–kilkanaście miesięcy. Prowadzimy monitoring spraw i w razie bezczynności składamy <a href=\"/uslugi/ponaglenia-i-odwolania\">ponaglenia</a>.", "Depending on the voivodeship, in practice several to over a dozen months. We monitor cases and in the event of inactivity, we file <a href=\"/uslugi/ponaglenia-i-odwolania\">reminders for failure to act</a>.", "В зависимости от воеводства — на практике от нескольких до нескольких десятков месяцев. Мы ведём мониторинг дел и в случае бездействия подаём <a href=\"/uslugi/ponaglenia-i-odwolania\">понаглене (жалобу на бездействие)</a>.", "Залежно від воєводства, на практиці від кількох до кільканадцяти місяців. Ми ведемо моніторинг справ і у разі бездіяльності подаємо <a href=\"/uslugi/ponaglenia-i-odwolania\">понаглення (скарга на бездіяльність)</a>."),
          },
          {
            question: loc("Czy rodzina może dołączyć do mojego wniosku pobytowego?", "Can my family join my residence application?", "Может ли семья присоединиться к моему заявлению на проживание?", "Чи може сім'я приєднатися до моєї заяви на проживання?"),
            answer: loc("Tak, w odrębnej procedurze (<a href=\"/uslugi/karta-pobytu-czasowego\">pobyt czasowy dla członka rodziny</a>). Pomagamy również w procedurze łączenia rodzin.", "Yes, in a separate procedure (<a href=\"/uslugi/karta-pobytu-czasowego\">temporary residence for a family member</a>). We also assist with the family reunification procedure.", "Да, в отдельной процедуре (<a href=\"/uslugi/karta-pobytu-czasowego\">разрешение на временное проживание для члена семьи</a>). Мы также помогаем в процедуре воссоединения семей.", "Так, в окремій процедурі (<a href=\"/uslugi/karta-pobytu-czasowego\">дозвіл на тимчасове проживання для члена сім'ї</a>). Допомагаємо також у процедурі возз'єднання сімей."),
          },
          {
            question: loc("Na jak długo wydawane jest zezwolenie?", "How long is the permit issued for?", "На какой срок выдаётся разрешение?", "На який термін видається дозвіл?"),
            answer: loc("Zezwolenie może być wydane maksymalnie na 3 lata (zależy to jednak od sprawy); potem wniosek o kolejne zezwolenie, a następnie analiza możliwości złożenia wniosku o <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">pobyt rezydenta długoterminowego UE</a>.", "The permit can be issued for a maximum of 3 years (this depends on the case); afterwards you apply for a subsequent permit, and then analyse the possibility of applying for <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">EU long-term resident status</a>.", "Разрешение может быть выдано максимально на 3 года (зависит от дела); затем подаётся заявление на очередное разрешение, а далее — анализ возможности подачи заявления на <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">разрешение на проживание долгосрочного резидента ЕС</a>.", "Дозвіл може бути виданий максимально на 3 роки (це залежить від справи); потім подається заява на наступний дозвіл, а далі — аналіз можливості подання заяви на <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">дозвіл на проживання довгострокового резидента ЄС</a>."),
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
          "A temporary residence permit (zezwolenie na pobyt czasowy) is a decision of the voivode that legalizes a stay in Poland exceeding 3 months (maximum validity of 3 years) for a specific purpose other than employment itself: studies, family reunification, running a business, scientific research, and other circumstances (Articles 186-187 of the Act on Foreigners). Upon a positive decision, the foreigner receives a residence card (karta pobytu).",
          "Разрешение на временное проживание (zezwolenie na pobyt czasowy) — это решение воеводы (wojewoda), легализующее проживание в Польше свыше 3 месяцев (максимальный срок действия решения — 3 года) с конкретной целью, отличной от самого трудоустройства: учёба, воссоединение семей, ведение предпринимательской деятельности, научные исследования, а также «иные обстоятельства» (ст. 186–187 закона об иностранцах). После положительного решения иностранец получает карту побыту (karta pobytu).",
          "Дозвіл на тимчасове проживання (zezwolenie na pobyt czasowy) — це рішення воєводи (wojewoda), що легалізує перебування в Польщі понад 3 місяці (максимальний строк дії рішення — 3 роки) з конкретною метою, відмінною від самого працевлаштування: навчання, возз'єднання сімей, ведення підприємницької діяльності, наукові дослідження, а також «інші обставини» (ст. 186–187 закону про іноземців). Після позитивного рішення іноземець отримує карту побиту (посвідка на проживання)."
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
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>dobór właściwej podstawy prawnej pobytu;</li><li>przygotowanie kompletu dokumentów;</li><li>złożenie wniosku przez MOS oraz uzyskanie potwierdzenia złożenia wniosku;</li><li>obsługa wezwań z urzędu;</li><li>monitoring sprawy aż do wydania decyzji.</li></ul><p>Dla podstaw pobytu \u201erodzinnych\u201d i studenckich pilnujemy uprawnień dodatkowych — np. wiele zezwoleń z tytułów rodzinnych i studiów daje swobodny dostęp do rynku pracy.</p>", "<ul><li>selecting the appropriate legal basis for your stay;</li><li>preparing a complete set of documents;</li><li>submitting the application via MOS and obtaining confirmation of submission;</li><li>handling requests from the office;</li><li>case monitoring until the decision is issued.</li></ul><p>For family-based and student-based residence grounds, we ensure additional entitlements are secured — e.g., many permits based on family ties or studies grant unrestricted access to the labor market.</p>", "<ul><li>подбор надлежащего правового основания для проживания;</li><li>подготовка полного комплекта документов;</li><li>подача заявления через MOS и получение подтверждения подачи;</li><li>обработка запросов из ведомства;</li><li>мониторинг дела до вынесения решения.</li></ul><p>Для «семейных» и студенческих оснований проживания мы следим за дополнительными правами — например, многие разрешения по семейным основаниям и учёбе дают свободный доступ к рынку труда.</p>", "<ul><li>підбір належної правової підстави для проживання;</li><li>підготовка повного комплекту документів;</li><li>подання заяви через MOS та отримання підтвердження подання заяви;</li><li>обробка запитів з відомства;</li><li>моніторинг справи до видачі рішення.</li></ul><p>Для «сімейних» і студентських підстав проживання ми стежимо за додатковими правами — наприклад, багато дозволів за сімейними підставами та навчанням дають вільний доступ до ринку праці.</p>"),
          },
          {
            heading: loc("Wymagane dokumenty (standardowe)", "Required documents (standard)", "Необходимые документы (стандартные)", "Необхідні документи (стандартні)"),
            body: loc("<ul><li>ważny dokument podróży (wszystkie strony);</li><li>wniosek o pobyt czasowy składany przez system MOS;</li><li>fotografia (684 × 883 piksele, plik nie większy niż 2,5 MB, proporcje odpowiadające fotografii 35 × 45 mm);</li><li>ubezpieczenie zdrowotne (ZUS lub prywatna polisa ubezpieczeniowa);</li><li>potwierdzenie stabilnego i regularnego źródła dochodu;</li><li>potwierdzenie miejsca zamieszkania;</li><li>dokumenty potwierdzające cel pobytu (zaświadczenie uczelni + opłata czesnego, akt małżeństwa/urodzenia, wpis do CEIDG/KRS i wyniki finansowe działalności, umowa z jednostką naukową itd.).</li></ul>", "<ul><li>valid travel document (all pages);</li><li>temporary residence application submitted via the MOS system;</li><li>photograph (684 x 883 pixels, file no larger than 2.5 MB, proportions corresponding to a 35 x 45 mm photo);</li><li>health insurance (ZUS or private insurance policy);</li><li>proof of a stable and regular source of income;</li><li>proof of accommodation;</li><li>documents confirming the purpose of stay (university certificate + tuition payment, marriage/birth certificate, CEIDG/KRS registration and financial results, contract with a research institution, etc.).</li></ul>", "<ul><li>действующий проездной документ (все страницы);</li><li>заявление на разрешение на временное проживание (zezwolenie na pobyt czasowy), подаваемое через систему MOS;</li><li>фотография (684 × 883 пикселей, файл не более 2,5 МБ, пропорции соответствуют фото 35 × 45 мм);</li><li>медицинская страховка (ZUS или частный страховой полис);</li><li>подтверждение стабильного и регулярного источника дохода;</li><li>подтверждение места проживания;</li><li>документы, подтверждающие цель пребывания (справка из вуза + оплата обучения, свидетельство о браке/рождении, запись в CEIDG/KRS и финансовые результаты деятельности, договор с научным учреждением и т. д.).</li></ul>", "<ul><li>дійсний документ для подорожі (усі сторінки);</li><li>заява на дозвіл на тимчасове проживання (zezwolenie na pobyt czasowy), що подається через систему MOS;</li><li>фотографія (684 × 883 пікселі, файл не більше 2,5 МБ, пропорції відповідають фото 35 × 45 мм);</li><li>медичне страхування (ubezpieczenie zdrowotne) (ZUS або приватний страховий поліс);</li><li>підтвердження стабільного та регулярного джерела доходу;</li><li>підтвердження місця проживання;</li><li>документи, що підтверджують мету перебування (довідка з ВНЗ + оплата навчання, свідоцтво про шлюб/народження, запис у CEIDG/KRS та фінансові результати діяльності, договір з науковою установою тощо).</li></ul>"),
          },
          {
            heading: loc("Terminy i opłaty urzędowe", "Deadlines and official fees", "Сроки и государственные сборы", "Строки та державні збори"),
            body: loc("<p>Opłata skarbowa 340 zł, karta pobytu 100 zł, opłata od pełnomocnictwa 17 zł.</p><p>Studia: zezwolenie zwykle wydawane na okres studiów. Decyzje pobytowe wydawane są maksymalnie na okres 3 lat.</p>", "<p>Stamp duty 340 PLN, residence card 100 PLN, power of attorney fee 17 PLN.</p><p>Studies: the permit is usually issued for the duration of the studies. Residence decisions are issued for a maximum period of 3 years.</p>", "<p>Гербовый сбор (opłata skarbowa) 340 злотых, карта побыту (karta pobytu) 100 злотых, сбор за доверенность 17 злотых.</p><p>Учёба: разрешение обычно выдаётся на период обучения. Решения о проживании выдаются максимально на 3 года.</p>", "<p>Гербовий збір (opłata skarbowa) 340 злотих, карта побиту (посвідка на проживання) 100 злотих, збір за довіреність 17 злотих.</p><p>Навчання: дозвіл зазвичай видається на період навчання. Рішення про проживання видаються максимально на 3 роки.</p>"),
          },
          {
            heading: loc("Na co uważać", "What to watch out for", "На что обратить внимание", "На що звернути увагу"),
            body: loc("<p>Cel pobytu trzeba realizować — porzucenie studiów czy fikcyjna działalność może oznaczać cofnięcie zezwolenia. Zmiana celu pobytu wymaga złożenia nowego wniosku. Wniosek trzeba złożyć najpóźniej ostatniego dnia legalnego pobytu.</p>", "<p>You must fulfill the purpose of your stay — abandoning studies or fictitious business activity may result in the revocation of the permit. Changing the purpose of stay requires submitting a new application. The application must be submitted no later than the last day of legal stay.</p>", "<p>Цель пребывания необходимо осуществлять — прекращение учёбы или фиктивная деятельность могут повлечь отмену разрешения. Изменение цели пребывания требует подачи нового заявления. Заявление необходимо подать не позднее последнего дня легального пребывания.</p>", "<p>Мету перебування потрібно реалізовувати — припинення навчання чи фіктивна діяльність може означати скасування дозволу. Зміна мети перебування потребує подання нової заяви. Заяву потрібно подати не пізніше останнього дня легального перебування.</p>"),
          },
        ],
        faq: [
          {
            question: loc("Czy karta pobytu czasowego pozwala pracować?", "Does a temporary residence card allow you to work?", "Позволяет ли карта временного проживания работать?", "Чи дозволяє карта тимчасового проживання працювати?"),
            answer: loc("Tylko jeśli podstawa decyzji daje dostęp do rynku pracy albo masz dokument legalizujący pracę.", "Only if the basis of the decision grants access to the labor market or you hold a document authorizing work.", "Только если основание решения даёт доступ к рынку труда или у вас есть документ, легализующий работу.", "Тільки якщо підстава рішення дає доступ до ринку праці або ви маєте документ, що легалізує роботу."),
          },
          {
            question: loc("Czy mogę podróżować po UE?", "Can I travel within the EU?", "Могу ли я путешествовать по ЕС?", "Чи можу я подорожувати по ЄС?"),
            answer: loc("Po wydaniu karty pobytu — do 90 dni w okresie 180-dniowym (w celach turystycznych).", "After the residence card is issued — up to 90 days within a 180-day period (for tourist purposes).", "После выдачи карты побыту (karta pobytu) — до 90 дней в 180-дневный период (в туристических целях).", "Після видачі карти побиту (посвідка на проживання) — до 90 днів у 180-денний період (у туристичних цілях)."),
          },
          {
            question: loc("Co należy zrobić po 3 latach?", "What should you do after 3 years?", "Что делать после 3 лет?", "Що потрібно зробити після 3 років?"),
            answer: loc("Weryfikacja możliwości złożenia wniosku o kolejne zezwolenie.", "Verify the possibility of applying for a subsequent permit.", "Проверка возможности подачи заявления на очередное разрешение.", "Перевірка можливості подання заяви на наступний дозвіл."),
          },
          {
            question: loc("Czy urząd może wezwać na przesłuchanie?", "Can the office summon you for an interview?", "Может ли ведомство вызвать на собеседование?", "Чи може відомство викликати на співбесіду?"),
            answer: loc("Istnieje taka możliwość — w przypadku wątpliwości ze strony urzędu.", "This is possible — in the event of doubts on the part of the office.", "Такая возможность существует — в случае сомнений со стороны ведомства.", "Така можливість існує — у разі сумнівів з боку відомства."),
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
          "A solution for freelancers, IT contractors, and specialists working on a B2B basis who do not want to or cannot establish their own business in Poland. The foreigner signs a contract with a business incubator (Fundacja Firma Dla Każdego) and works under its legal personality — and the contract with the incubator becomes the basis for legalizing residence and work (temporary residence and work permit, or EU Blue Card for highly qualified professionals).",
          "Решение для фрилансеров, IT-контракторов и специалистов, работающих «на B2B», которые не хотят или не могут открывать предпринимательскую деятельность в Польше. Иностранец заключает договор с бизнес-инкубатором (inkubator przedsiębiorczości) Fundacja Firma Dla Każdego и работает в рамках его юридического лица — а договор с инкубатором становится основанием для легализации проживания и работы (разрешение на временное проживание и работу (единое разрешение), Голубая карта ЕС (Blue Card) при высокой квалификации).",
          "Рішення для фрілансерів, IT-контракторів та спеціалістів, що працюють «на B2B», які не хочуть або не можуть відкривати підприємницьку діяльність у Польщі. Іноземець укладає договір з бізнес-інкубатором (inkubator przedsiębiorczości) Fundacja Firma Dla Każdego і працює в межах його юридичної особи — а договір з інкубатором стає підставою для легалізації проживання та роботи (дозвіл на тимчасове проживання та роботу (єдиний дозвіл), Блакитна карта ЄС (Blue Card) при високій кваліфікації)."
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
            heading: loc("Jak to działa", "How it works", "Как это работает", "Як це працює"),
            body: loc("<ol><li>Weryfikacja przypadku oraz możliwości rozpoczęcia współpracy pod kątem legalizacji.</li><li>Podpisanie umowy z inkubatorem FDK.</li><li>Przygotowanie dokumentów legalizacyjnych z inkubatorem jako podmiotem powierzającym pracę (uzyskanie <a href=\"/uslugi/zezwolenie-na-prace\">zezwolenia na pracę</a> lub wpisu <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">oświadczenia</a> do ewidencji oświadczeń).</li><li>Fakturowanie klientów przez inkubator (bez własnej firmy, bez rejestracji działalności w ZUS).</li><li>Złożenie wniosku pobytowego przez MOS + uzyskanie potwierdzenia złożenia wniosku.</li><li>Uzyskanie decyzji pobytowej i karty pobytu.</li></ol>", "<ol><li>Verification of your case and the possibility of starting cooperation for legalization purposes.</li><li>Signing a contract with the Fundacja Firma Dla Każdego (business incubator).</li><li>Preparing legalization documents with the incubator as the entity entrusting work (obtaining a <a href=\"/uslugi/zezwolenie-na-prace\">work permit</a> or registration of an <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">employer's declaration</a> in the declaration registry).</li><li>Invoicing clients through the incubator (no need for your own company or ZUS business registration).</li><li>Submitting the residence application via MOS + obtaining confirmation of submission.</li><li>Obtaining the residence decision and the residence card.</li></ol>", "<ol><li>Проверка ситуации и возможности начала сотрудничества с точки зрения легализации.</li><li>Подписание договора с бизнес-инкубатором (inkubator przedsiębiorczości) Fundacja Firma Dla Każdego.</li><li>Подготовка документов для легализации с инкубатором в качестве субъекта, поручающего работу (получение <a href=\"/uslugi/zezwolenie-na-prace\">разрешения на работу</a> или регистрация <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">заявления о поручении работы (oświadczenie)</a> в реестре).</li><li>Выставление счетов клиентам через инкубатор (без собственной фирмы, без регистрации деятельности в ZUS).</li><li>Подача заявления на проживание через MOS + получение подтверждения подачи.</li><li>Получение решения о проживании и карты побыту (karta pobytu).</li></ol>", "<ol><li>Перевірка ситуації та можливості початку співпраці з точки зору легалізації.</li><li>Підписання договору з бізнес-інкубатором (inkubator przedsiębiorczości) Fundacja Firma Dla Każdego.</li><li>Підготовка документів для легалізації з інкубатором як суб'єктом, що доручає роботу (отримання <a href=\"/uslugi/zezwolenie-na-prace\">дозволу на роботу</a> або реєстрація <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">заяви про доручення роботи (oświadczenie)</a> у реєстрі).</li><li>Виставлення рахунків клієнтам через інкубатор (без власної фірми, без реєстрації діяльності в ZUS).</li><li>Подання заяви на проживання через MOS + отримання підтвердження подання.</li><li>Отримання рішення про проживання та карти побиту (посвідка на проживання).</li></ol>"),
          },
          {
            heading: loc("Dla kogo szczególnie", "Especially for", "Для кого особенно", "Для кого особливо"),
            body: loc("<p>Specjaliści z kontraktami zagranicznymi; freelancerzy z wieloma klientami.</p>", "<p>Specialists with international contracts; freelancers with multiple clients.</p>", "<p>Специалисты с зарубежными контрактами; фрилансеры с несколькими клиентами.</p>", "<p>Спеціалісти з міжнародними контрактами; фрілансери з кількома клієнтами.</p>"),
          },
          {
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<p>Onboarding w inkubatorze; konstrukcja umowy pod wymogi legalizacyjne; obsługa księgowa faktur w inkubatorze; wsparcie w rozliczeniach i dokumentach do wypłat.</p>", "<p>Onboarding in the incubator; structuring the contract to meet legalization requirements; accounting support for invoices within the incubator; assistance with settlements and payout documentation.</p>", "<p>Онбординг в инкубаторе; построение договора под требования легализации; бухгалтерское обслуживание счетов в инкубаторе; поддержка в расчётах и документах для выплат.</p>", "<p>Онбордінг в інкубаторі; побудова договору під вимоги легалізації; бухгалтерське обслуговування рахунків в інкубаторі; підтримка у розрахунках та документах для виплат.</p>"),
          },
        ],
        faq: [
          {
            question: loc("Czy ta procedura jest legalna?", "Is this procedure legal?", "Является ли эта процедура легальной?", "Чи ця процедура легальна?"),
            answer: loc("Tak — praca w ramach inkubatora to standardowy model. Warunki umowy muszą spełniać wymogi ustawowe.", "Yes — working within a business incubator is a standard model. The contract terms must meet statutory requirements.", "Да — работа в рамках бизнес-инкубатора (inkubator przedsiębiorczości) является стандартной моделью. Условия договора должны соответствовать требованиям закона.", "Так — робота в межах бізнес-інкубатора (inkubator przedsiębiorczości) є стандартною моделлю. Умови договору повинні відповідати вимогам закону."),
          },
          {
            question: loc("Czy muszę mieć polskich klientów?", "Do I need to have Polish clients?", "Нужно ли мне иметь польских клиентов?", "Чи повинен я мати польських клієнтів?"),
            answer: loc("Nie, możesz mieć klientów z innych krajów.", "No, you can have clients from other countries.", "Нет, вы можете иметь клиентов из других стран.", "Ні, ви можете мати клієнтів з інших країн."),
          },
          {
            question: loc("Jakie dochody muszę wykazać?", "What income do I need to demonstrate?", "Какой доход необходимо подтвердить?", "Які доходи потрібно підтвердити?"),
            answer: loc("Jeśli jesteś w procedurze pobytowej (<a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">zezwolenie na pobyt czasowy i pracę</a> lub <a href=\"/uslugi/eu-blue-card\">Blue Card</a>), musisz zarabiać co najmniej 4 806 zł brutto miesięcznie (minimalne wynagrodzenie na 2026 r.).", "If you are in a residence procedure (<a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">temporary residence and work permit</a> or <a href=\"/uslugi/eu-blue-card\">EU Blue Card</a>), you must earn at least 4,806 PLN gross per month (minimum wage for 2026).", "Если вы находитесь в процедуре получения разрешения на проживание (<a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">разрешение на временное проживание и работу (единое разрешение)</a> или <a href=\"/uslugi/eu-blue-card\">Голубая карта ЕС</a>), вы должны зарабатывать не менее 4 806 злотых брутто в месяц (минимальная заработная плата на 2026 г.).", "Якщо ви перебуваєте у процедурі отримання дозволу на проживання (<a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">дозвіл на тимчасове проживання та роботу (єдиний дозвіл)</a> або <a href=\"/uslugi/eu-blue-card\">Блакитна карта ЄС</a>), ви повинні заробляти щонайменше 4 806 злотих брутто на місяць (мінімальна заробітна плата на 2026 р.)."),
          },
          {
            question: loc("Czy mogę przejść potem na własną działalność?", "Can I later switch to my own business?", "Могу ли я потом перейти на собственный бизнес?", "Чи можу я потім перейти на власну діяльність?"),
            answer: loc("Jest to możliwe, ale tylko po uzyskaniu odpowiedniego tytułu pobytowego uprawniającego do wykonywania działalności gospodarczej.", "This is possible, but only after obtaining an appropriate residence title that authorizes you to conduct business activity.", "Это возможно, но только после получения соответствующего вида на жительство, дающего право на ведение предпринимательской деятельности.", "Це можливо, але лише після отримання відповідного дозволу на проживання, що дає право на ведення підприємницької діяльності."),
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
          "The EU Blue Card (Niebieska Karta UE) is a temporary residence and work permit for highly qualified professions (Article 127 of the Act on Foreigners). It is intended for foreigners with higher education (a university diploma and its sworn translation are required) or with confirmed professional experience (proof of experience and a sworn translation are required).",
          "Голубая карта ЕС (Niebieska Karta UE) — это разрешение на временное проживание и работу в профессии, требующей высокой квалификации (ст. 127 закона об иностранцах). Для иностранцев с высшим образованием (требуется диплом вуза и его присяжный перевод (tłumaczenie przysięgłe)) или с подтверждённым профессиональным опытом (требуется подтверждение опыта и присяжный перевод).",
          "Блакитна карта ЄС (Niebieska Karta UE) — це дозвіл на тимчасове проживання та роботу у професії, що вимагає високої кваліфікації (ст. 127 закону про іноземців). Для іноземців з вищою освітою (необхідний диплом ВНЗ та його присяжний переклад (tłumaczenie przysięgłe)) або з підтвердженим професійним досвідом (необхідне підтвердження досвіду та присяжний переклад)."
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
            heading: loc("Warunki", "Requirements", "Условия", "Умови"),
            body: loc("<ul><li>umowa (o pracę, cywilnoprawna, nakładcza) zawarta na <strong>co najmniej 6 miesięcy</strong>;</li><li>potwierdzenie kwalifikacji (dyplom lub doświadczenie);</li><li>wymóg wynagrodzenia — roczne wynagrodzenie brutto <strong>co najmniej 150% przeciętnego wynagrodzenia w gospodarce narodowej</strong> za rok poprzedni (ogłaszane przez GUS);</li><li>ubezpieczenie zdrowotne (ZUS lub prywatna polisa ubezpieczeniowa);</li><li>potwierdzenie zamieszkania w Polsce.</li></ul>", "<ul><li>a contract (employment, civil-law, or outwork) concluded for <strong>at least 6 months</strong>;</li><li>proof of qualifications (diploma or experience);</li><li>salary requirement — gross annual salary of <strong>at least 150% of the average salary in the national economy</strong> for the previous year (announced by GUS);</li><li>health insurance (ZUS or private insurance policy);</li><li>proof of accommodation in Poland.</li></ul>", "<ul><li>договор (трудовой, гражданско-правовой, надомный), заключённый на <strong>не менее 6 месяцев</strong>;</li><li>подтверждение квалификации (диплом или опыт);</li><li>требование к заработной плате — годовая заработная плата брутто <strong>не менее 150% средней заработной платы в народном хозяйстве</strong> за предыдущий год (объявляется GUS);</li><li>медицинская страховка (ZUS или частный страховой полис);</li><li>подтверждение места проживания в Польше.</li></ul>", "<ul><li>договір (трудовий, цивільно-правовий, надомний), укладений на <strong>щонайменше 6 місяців</strong>;</li><li>підтвердження кваліфікації (диплом або досвід);</li><li>вимога до заробітної плати — річна заробітна плата брутто <strong>щонайменше 150% середньої заробітної плати в національній економіці</strong> за попередній рік (оголошується GUS);</li><li>медичне страхування (ubezpieczenie zdrowotne) (ZUS або приватний страховий поліс);</li><li>підтвердження місця проживання в Польщі.</li></ul>"),
          },
          {
            heading: loc("Przewagi Blue Card nad zwykłym zezwoleniem", "Blue Card advantages over a regular permit", "Преимущества Blue Card перед обычным разрешением", "Переваги Blue Card перед звичайним дозволом"),
            body: loc("<p>Możliwość zmiany pracodawcy (zawiadomienie wojewody w 15 dni roboczych zamiast zmiany decyzji); ochrona przy utracie pracy (zezwolenia nie cofa się przy bezrobociu do 3 miesięcy, a po 2 latach na Karcie — do 6 miesięcy); <strong>mobilność w UE</strong> — po okresie pobytu w jednym państwie łatwiejsze przeniesienie do innego; szybsza ścieżka do <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">rezydenta długoterminowego UE</a> (łączenie okresów z różnych państw).</p>", "<p>Ability to change employers (notifying the voivode within 15 business days instead of amending the decision); protection in case of job loss (the permit is not revoked if unemployment lasts up to 3 months, and after 2 years on the Card — up to 6 months); <strong>EU mobility</strong> — after a period of residence in one member state, easier transfer to another; faster path to <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">EU long-term resident status</a> (combining periods from different member states).</p>", "<p>Возможность смены работодателя (уведомление воеводы в 15 рабочих дней вместо изменения решения); защита при потере работы (разрешение не отменяется при безработице до 3 месяцев, а после 2 лет на Карте — до 6 месяцев); <strong>мобильность в ЕС</strong> — после периода проживания в одном государстве упрощённый переезд в другое; ускоренный путь к <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">разрешению на проживание долгосрочного резидента ЕС</a> (объединение периодов из разных государств).</p>", "<p>Можливість зміни роботодавця (повідомлення воєводи (wojewoda) протягом 15 робочих днів замість зміни рішення); захист при втраті роботи (дозвіл не скасовується при безробітті до 3 місяців, а після 2 років на Карті — до 6 місяців); <strong>мобільність у ЄС</strong> — після періоду проживання в одній державі спрощене переміщення до іншої; прискорений шлях до <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">дозволу на проживання довгострокового резидента ЄС</a> (поєднання періодів з різних держав).</p>"),
          },
          {
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>weryfikacja progu wynagrodzenia i kwalifikacji;</li><li>skompletowanie dokumentów (dyplomy/<a href=\"/uslugi/tlumaczenia-przysiegle\">tłumaczenia</a> w razie potrzeby);</li><li>złożenie wniosku przez MOS + potwierdzenie złożenia wniosku;</li><li>obsługa zmiany pracodawcy i obowiązków notyfikacyjnych.</li></ul>", "<ul><li>verification of the salary threshold and qualifications;</li><li>compiling documents (diplomas/<a href=\"/uslugi/tlumaczenia-przysiegle\">sworn translations</a> if needed);</li><li>submitting the application via MOS + confirmation of submission;</li><li>handling employer changes and notification obligations.</li></ul>", "<ul><li>проверка порога заработной платы и квалификации;</li><li>подготовка документов (дипломы/<a href=\"/uslugi/tlumaczenia-przysiegle\">присяжные переводы</a> при необходимости);</li><li>подача заявления через MOS + подтверждение подачи;</li><li>обработка смены работодателя и уведомительных обязанностей.</li></ul>", "<ul><li>перевірка порогу заробітної плати та кваліфікації;</li><li>комплектування документів (дипломи/<a href=\"/uslugi/tlumaczenia-przysiegle\">присяжні переклади</a> за потреби);</li><li>подання заяви через MOS + підтвердження подання заяви;</li><li>обробка зміни роботодавця та повідомних обов'язків.</li></ul>"),
          },
          {
            heading: loc("Terminy i opłaty urzędowe", "Deadlines and official fees", "Сроки и государственные сборы", "Строки та державні збори"),
            body: loc("<p>Opłata skarbowa 440 zł, karta pobytu 100 zł, opłata od pełnomocnictwa 17 zł.</p>", "<p>Stamp duty 440 PLN, residence card 100 PLN, power of attorney fee 17 PLN.</p>", "<p>Гербовый сбор (opłata skarbowa) 440 злотых, карта побыту (karta pobytu) 100 злотых, сбор за доверенность 17 злотых.</p>", "<p>Гербовий збір (opłata skarbowa) 440 злотих, карта побиту (посвідка на проживання) 100 злотих, збір за довіреність 17 злотих.</p>"),
          },
          {
            heading: loc("Obowiązki po uzyskaniu decyzji", "Obligations after the decision", "Обязанности после получения решения", "Обов'язки після отримання рішення"),
            body: loc("<p>Zawiadomienie wojewody w 15 dni roboczych o utracie pracy, zmianie pracodawcy, zaprzestaniu spełniania warunków.</p>", "<p>Notifying the voivode within 15 business days of job loss, change of employer, or ceasing to meet the conditions.</p>", "<p>Уведомление воеводы (wojewoda) в 15 рабочих дней об утрате работы, смене работодателя, прекращении соответствия условиям.</p>", "<p>Повідомлення воєводи (wojewoda) протягом 15 робочих днів про втрату роботи, зміну роботодавця, припинення відповідності умовам.</p>"),
          },
        ],
        faq: [
          {
            question: loc("Czy do uzyskania Blue Card brany jest pod uwagę tylko dyplom?", "Is only a diploma considered for obtaining the EU Blue Card?", "Для получения Голубой карты ЕС (Blue Card) учитывается только диплом?", "Чи для отримання Блакитної карти ЄС (Blue Card) враховується лише диплом?"),
            answer: loc("Nie, można również wykazać doświadczenie zawodowe (dokumenty potwierdzające kwalifikacje uzyskane w wyniku doświadczenia zawodowego na poziomie porównywalnym z poziomem kwalifikacji uzyskanych w wyniku ukończenia studiów wyższych).", "No, you can also demonstrate professional experience (documents confirming qualifications obtained through professional experience at a level comparable to qualifications obtained through completion of higher education).", "Нет, можно также подтвердить профессиональный опыт (документы, подтверждающие квалификацию, полученную в результате профессионального опыта на уровне, сопоставимом с квалификацией, полученной в результате окончания высшего учебного заведения).", "Ні, можна також підтвердити професійний досвід (документи, що підтверджують кваліфікацію, отриману внаслідок професійного досвіду на рівні, порівнянному з рівнем кваліфікації, отриманої внаслідок закінчення вищого навчального закладу)."),
          },
          {
            question: loc("Co się stanie, gdy stracę pracę, posiadając Blue Card?", "What happens if I lose my job while holding an EU Blue Card?", "Что произойдёт, если я потеряю работу, имея Голубую карту ЕС (Blue Card)?", "Що станеться, якщо я втрачу роботу, маючи Блакитну карту ЄС (Blue Card)?"),
            answer: loc("W zależności od sytuacji i okresu posiadanego zezwolenia masz 3–6 miesięcy ochrony na znalezienie nowego zatrudnienia. Należy jednak terminowo poinformować wojewodę o zakończeniu zatrudnienia.", "Depending on your situation and the duration of your permit, you have 3 to 6 months of protection to find new employment. However, you must notify the voivode of the termination of employment in a timely manner.", "В зависимости от ситуации и срока действия имеющегося разрешения у вас есть 3–6 месяцев защиты для поиска нового трудоустройства. Однако необходимо своевременно уведомить воеводу (wojewoda) о прекращении трудоустройства.", "Залежно від ситуації та строку наявного дозволу ви маєте 3–6 місяців захисту для пошуку нового працевлаштування. Проте необхідно вчасно повідомити воєводу (wojewoda) про припинення працевлаштування."),
          },
          {
            question: loc("Czy rodzina dostaje pobyt?", "Does my family get residence?", "Получает ли семья право на проживание?", "Чи отримує сім'я право на проживання?"),
            answer: loc("Członkowie rodziny mogą ubiegać się o pobyt (<a href=\"/uslugi/karta-pobytu-czasowego\">pobyt z cudzoziemcem</a>).", "Family members can apply for residence (<a href=\"/uslugi/karta-pobytu-czasowego\">residence with a foreigner</a>).", "Члены семьи могут подать заявление на проживание (<a href=\"/uslugi/karta-pobytu-czasowego\">разрешение на временное проживание с иностранцем</a>).", "Члени сім'ї можуть подати заяву на проживання (<a href=\"/uslugi/karta-pobytu-czasowego\">дозвіл на тимчасове проживання з іноземцем</a>)."),
          },
          {
            question: loc("Czy mogę przenieść się do Niemiec/Francji?", "Can I move to Germany/France?", "Могу ли я переехать в Германию/Францию?", "Чи можу я переїхати до Німеччини/Франції?"),
            answer: loc("W ramach mobilności Blue Card, po spełnieniu warunków — wymagana jest jednak analiza konkretnej sytuacji.", "Within the EU Blue Card mobility framework, after meeting the conditions — however, an analysis of your specific situation is required.", "В рамках мобильности Голубой карты ЕС (Blue Card), при выполнении условий — однако требуется анализ конкретной ситуации.", "У межах мобільності Блакитної карти ЄС (Blue Card), за умови виконання вимог — однак необхідний аналіз конкретної ситуації."),
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
          "A residence card (karta pobytu) is a residence document issued to foreigners who have been granted a residence permit in Poland. Replacement is required when: the data on the card has changed (surname, address — for cards with an address), the card has been lost/stolen/damaged, the holder's appearance has changed, or the card itself is expiring while the permit remains valid (e.g., a permanent residence card issued for 10 years, a long-term resident card — for 5 years).",
          "Карта побыту (karta pobytu) — это документ, выдаваемый иностранцам, которым предоставлено разрешение на проживание в Польше. Замена производится, когда: изменились данные на карте (фамилия, адрес — для карт с адресом), карта утеряна/украдена/повреждена, изменилась внешность владельца или истекает срок действия самой карты при всё ещё действующем разрешении (например, карта постоянного проживания выдаётся на 10 лет, карта долгосрочного резидента — на 5 лет).",
          "Карта побиту (karta pobytu, посвідка на проживання) — це документ, що видається іноземцям, яким надано дозвіл на проживання в Польщі. Заміна здійснюється, коли: змінилися дані на карті (прізвище, адреса — для карт з адресою), карта загублена/вкрадена/пошкоджена, змінився зовнішній вигляд власника або закінчується строк дії самої карти при ще чинному дозволі (наприклад, карта постійного проживання видається на 10 років, карта довгострокового резидента — на 5 років)."
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
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>ustalenie, czy wymagana jest wymiana karty;</li><li>wniosek do wojewody o wymianę/wydanie karty pobytu;</li><li>zgłoszenie utraty dokumentu (obowiązek w ciągu 3 dni od stwierdzenia utraty).</li></ul>", "<ul><li>determining whether a card replacement is required;</li><li>application to the voivode for replacement/issuance of a residence card;</li><li>reporting document loss (obligation within 3 days of discovering the loss).</li></ul>", "<ul><li>определение, требуется ли замена карты;</li><li>заявление воеводе (wojewoda) о замене/выдаче карты побыту (karta pobytu);</li><li>сообщение об утрате документа (обязательно в течение 3 дней с момента обнаружения утраты).</li></ul>", "<ul><li>встановлення, чи необхідна заміна карти;</li><li>заява до воєводи (wojewoda) про заміну/видачу карти побиту (посвідка на проживання);</li><li>повідомлення про втрату документа (обов'язок протягом 3 днів від виявлення втрати).</li></ul>"),
          },
          {
            heading: loc("Terminy i opłaty urzędowe", "Deadlines and official fees", "Сроки и государственные сборы", "Строки та державні збори"),
            body: loc("<p>Opłata za wydanie/wymianę karty: 100 zł (podwyższona przy zawinionej utracie/zniszczeniu: 200 zł przy pierwszej, 300 zł przy kolejnej utracie).</p>", "<p>Fee for issuance/replacement of the card: 100 PLN (increased for loss/damage due to fault: 200 PLN for the first, 300 PLN for subsequent losses).</p>", "<p>Сбор за выдачу/замену карты: 100 злотых (увеличен при утрате/уничтожении по вине владельца: 200 злотых при первой, 300 злотых при повторной утрате).</p>", "<p>Збір за видачу/заміну карти: 100 злотих (підвищений при винній втраті/знищенні: 200 злотих при першій, 300 злотих при наступній втраті).</p>"),
          },
          {
            heading: loc("Na co uważać", "What to watch out for", "На что обратить внимание", "На що звернути увагу"),
            body: loc("<p>Wymiana karty NIE przedłuża zezwolenia pobytowego — jeśli kończy się decyzja, potrzebny jest nowy <a href=\"/uslugi/karta-pobytu-czasowego\">wniosek pobytowy</a>.</p>", "<p>Replacing the card does NOT extend your residence permit — if your decision is expiring, you need a new <a href=\"/uslugi/karta-pobytu-czasowego\">residence application</a>.</p>", "<p>Замена карты НЕ продлевает разрешение на проживание — если срок решения истекает, необходимо подать новое <a href=\"/uslugi/karta-pobytu-czasового\">заявление на проживание</a>.</p>", "<p>Заміна карти НЕ подовжує дозволу на проживання — якщо закінчується рішення, потрібна нова <a href=\"/uslugi/karta-pobytu-czasowego\">заява на проживання</a>.</p>"),
          },
        ],
        faq: [
          {
            question: loc("Zgubiłem kartę za granicą — co mam zrobić?", "I lost my card abroad — what should I do?", "Я потерял карту за границей — что делать?", "Я загубив карту за кордоном — що мені робити?"),
            answer: loc("Należy zgłosić to do urzędu wojewódzkiego oraz policji.", "You should report it to the voivodeship office and the police.", "Необходимо сообщить об этом в воеводское управление и полицию.", "Необхідно повідомити про це до воєводського управління та поліції."),
          },
          {
            question: loc("Czy mogę pracować, czekając na nową kartę?", "Can I work while waiting for a new card?", "Могу ли я работать, ожидая новую карту?", "Чи можу я працювати, чекаючи на нову карту?"),
            answer: loc("Tak, natomiast przekraczanie granic bez karty pobytu nie będzie możliwe.", "Yes, however crossing borders without a residence card will not be possible.", "Да, однако пересечение границ без карты побыту (karta pobytu) будет невозможно.", "Так, проте перетинання кордонів без карти побиту (посвідка на проживання) буде неможливим."),
          },
          {
            question: loc("Ile trwa wymiana?", "How long does the replacement take?", "Сколько длится замена?", "Скільки триває заміна?"),
            answer: loc("Zależy od danego urzędu (zazwyczaj od miesiąca do kilku miesięcy).", "It depends on the specific office (usually from one month to several months).", "Зависит от конкретного ведомства (обычно от месяца до нескольких месяцев).", "Залежить від конкретного відомства (зазвичай від місяця до кількох місяців)."),
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
          "The EU long-term resident permit (zezwolenie na pobyt rezydenta dlugoterminowego UE) is an indefinite status for foreigners who have been living legally and continuously in Poland for at least 5 years and have a stable source of income. It grants unrestricted access to the labor market and facilitates mobility within the EU.",
          "Разрешение на проживание долгосрочного резидента ЕС (zezwolenie na pobyt rezydenta długoterminowego UE) — это бессрочный статус для иностранца, который проживает в Польше легально и непрерывно не менее 5 лет и имеет стабильный источник дохода. Даёт свободный доступ к рынку труда и облегчает мобильность в рамках ЕС.",
          "Дозвіл на проживання довгострокового резидента ЄС (zezwolenie na pobyt rezydenta długoterminowego UE) — це безстроковий статус для іноземця, який проживає в Польщі легально та безперервно щонайменше 5 років і має стабільне джерело доходу. Надає вільний доступ до ринку праці та полегшує мобільність у межах ЄС."
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
            heading: loc("Warunki", "Requirements", "Условия", "Умови"),
            body: loc("<ul><li>5 lat legalnego, nieprzerwanego pobytu bezpośrednio przed wnioskiem (do okresu wlicza się m.in. połowę pobytu na wizie studenckiej/zezwoleniu studenckim; posiadacze <a href=\"/uslugi/eu-blue-card\">Blue Card</a> mogą łączyć okresy z innych państw UE);</li><li>stabilne i regularne źródło dochodu przez wymagane okresy;</li><li>ubezpieczenie zdrowotne (ZUS lub polisa ubezpieczeniowa);</li><li><strong>potwierdzona znajomość języka polskiego na poziomie co najmniej B1</strong> (certyfikat państwowy, świadectwo ukończenia szkoły w Polsce);</li><li>zapewnione miejsce zamieszkania.</li></ul>", "<ul><li>5 years of legal, uninterrupted residence immediately before the application (this period includes, among others, half of the stay on a student visa/student permit; <a href=\"/uslugi/eu-blue-card\">EU Blue Card</a> holders can combine periods from other EU member states);</li><li>stable and regular source of income for the required periods;</li><li>health insurance (ZUS or insurance policy);</li><li><strong>confirmed Polish language proficiency at a minimum B1 level</strong> (state certificate, completion certificate from a school in Poland);</li><li>secured accommodation.</li></ul>", "<ul><li>5 лет легального, непрерывного проживания непосредственно перед подачей заявления (в этот период засчитывается, в частности, половина пребывания по студенческой визе/студенческому разрешению; обладатели <a href=\"/uslugi/eu-blue-card\">Голубой карты ЕС (Blue Card)</a> могут объединять периоды из других государств ЕС);</li><li>стабильный и регулярный источник дохода за требуемые периоды;</li><li>медицинская страховка (ZUS или страховой полис);</li><li><strong>подтверждённое знание польского языка на уровне не ниже B1</strong> (государственный сертификат, свидетельство об окончании школы в Польше);</li><li>обеспеченное место проживания.</li></ul>", "<ul><li>5 років легального, безперервного проживання безпосередньо перед подачею заяви (до цього періоду зараховується, зокрема, половина перебування за студентською візою/студентським дозволом; власники <a href=\"/uslugi/eu-blue-card\">Блакитної карти ЄС (Blue Card)</a> можуть поєднувати періоди з інших держав ЄС);</li><li>стабільне та регулярне джерело доходу за необхідні періоди;</li><li>медичне страхування (ubezpieczenie zdrowotne) (ZUS або страховий поліс);</li><li><strong>підтверджене знання польської мови на рівні щонайменше B1</strong> (державний сертифікат, свідоцтво про закінчення школи в Польщі);</li><li>забезпечене місце проживання.</li></ul>"),
          },
          {
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>analiza historii pobytu i zatrudnienia w Polsce (liczymy \u201enieprzerwaność\u201d pobytu);</li><li>kompletowanie zaświadczeń o dochodach (PIT-y, zaświadczenia);</li><li>weryfikacja certyfikatu językowego;</li><li>złożenie wniosku przez MOS;</li><li>odpowiedzi na wezwania, monitorowanie statusu sprawy do momentu wydania decyzji i karty pobytu.</li></ul>", "<ul><li>analysis of your residence and employment history in Poland (we calculate the continuity of your stay);</li><li>compiling income certificates (PIT tax returns, certificates);</li><li>verification of the language certificate;</li><li>submitting the application via MOS;</li><li>responding to requests, monitoring case status until the decision is issued and the residence card is collected.</li></ul>", "<ul><li>анализ истории проживания и трудоустройства в Польше (рассчитываем «непрерывность» пребывания);</li><li>подготовка справок о доходах (декларации PIT, справки);</li><li>проверка языкового сертификата;</li><li>подача заявления через MOS;</li><li>ответы на запросы, мониторинг статуса дела до вынесения решения и получения карты побыту (karta pobytu).</li></ul>", "<ul><li>аналіз історії проживання та працевлаштування в Польщі (розраховуємо «безперервність» перебування);</li><li>комплектування довідок про доходи (декларації PIT, довідки);</li><li>перевірка мовного сертифіката;</li><li>подання заяви через MOS;</li><li>відповіді на запити, моніторинг статусу справи до видачі рішення та отримання карти побиту (посвідка на проживання).</li></ul>"),
          },
          {
            heading: loc("Terminy i opłaty urzędowe", "Deadlines and official fees", "Сроки и государственные сборы", "Строки та державні збори"),
            body: loc("<p>Opłata skarbowa 640 zł, karta pobytu 100 zł (karta wydawana na 5 lat, potem należy ją <a href=\"/uslugi/wymiana-karty-pobytu\">wymienić</a>), opłata od pełnomocnictwa 17 zł.</p>", "<p>Stamp duty 640 PLN, residence card 100 PLN (the card is issued for 5 years, then it needs to be <a href=\"/uslugi/wymiana-karty-pobytu\">replaced</a>), power of attorney fee 17 PLN.</p>", "<p>Гербовый сбор (opłata skarbowa) 640 злотых, карта побыту (karta pobytu) 100 злотых (карта выдаётся на 5 лет, затем её необходимо <a href=\"/uslugi/wymiana-karty-pobytu\">заменить</a>), сбор за доверенность 17 злотых.</p>", "<p>Гербовий збір (opłata skarbowa) 640 злотих, карта побиту (посвідка на проживання) 100 злотих (карта видається на 5 років, потім її необхідно <a href=\"/uslugi/wymiana-karty-pobytu\">замінити</a>), збір за довіреність 17 злотих.</p>"),
          },
          {
            heading: loc("Na co uważać", "What to watch out for", "На что обратить внимание", "На що звернути увагу"),
            body: loc("<p>Przerwy w pobycie (pojedyncza przerwa nie może być dłuższa niż 6 miesięcy, a łącznie przerwy nie mogą przekraczać 10 miesięcy w okresie 5 lat — istnieją wyjątki w liczeniu przerw, np. wyjazdy służbowe); dochód liczony wstecz — braki w PIT-ach lub brak umów mogą być przyczyną odmowy; brak możliwości ubiegania się o zezwolenie bez potwierdzenia znajomości języka.</p>", "<p>Breaks in residence (a single break cannot exceed 6 months, and total breaks cannot exceed 10 months over the 5-year period — there are exceptions in counting breaks, e.g., business trips); income is calculated retrospectively — gaps in PIT tax returns or missing contracts may result in refusal; it is not possible to apply for the permit without confirmed language proficiency.</p>", "<p>Перерывы в проживании (отдельный перерыв не может превышать 6 месяцев, а суммарно перерывы не могут превышать 10 месяцев за 5 лет — существуют исключения в подсчёте перерывов, например, командировки); доход рассчитывается ретроспективно — пробелы в декларациях PIT или отсутствие договоров могут быть причиной отказа; невозможно подать заявление без подтверждения знания языка.</p>", "<p>Перерви у проживанні (окрема перерва не може перевищувати 6 місяців, а загалом перерви не можуть перевищувати 10 місяців за 5 років — існують винятки у підрахунку перерв, наприклад, службові відрядження); дохід розраховується ретроспективно — прогалини у деклараціях PIT або відсутність договорів можуть бути причиною відмови; неможливо подати заяву без підтвердження знання мови.</p>"),
          },
        ],
        faq: [
          {
            question: loc("Czy okres pobytu na podstawie stempla w paszporcie się liczy?", "Does the residence period based on a stamp in the passport count?", "Засчитывается ли период пребывания на основании штампа в паспорте?", "Чи зараховується період перебування на підставі штампа в паспорті?"),
            answer: loc("Tak, pobyt w procedurze jest legalny.", "Yes, residence during the procedure is legal.", "Да, пребывание в ходе процедуры является легальным.", "Так, перебування під час процедури є легальним."),
          },
          {
            question: loc("Czy studia liczą się do 5 lat?", "Do studies count towards the 5 years?", "Засчитывается ли учёба в 5 лет?", "Чи зараховується навчання до 5 років?"),
            answer: loc("Okres ten liczony jest w połowie.", "This period is counted at half.", "Этот период засчитывается наполовину.", "Цей період зараховується наполовину."),
          },
          {
            question: loc("Który pobyt wybrać: rezydent UE czy pobyt stały?", "Which residence to choose: EU long-term resident or permanent residence?", "Какой вид на жительство выбрать: долгосрочный резидент ЕС или постоянное проживание?", "Який дозвіл обрати: довгостроковий резидент ЄС чи постійне проживання?"),
            answer: loc("To zależy od konkretnej sytuacji i spełnienia wymagań z ustawy o cudzoziemcach. Porównaj z <a href=\"/uslugi/karta-stalego-pobytu\">pobytem stałym</a>.", "It depends on your specific situation and meeting the requirements of the Act on Foreigners. Compare with <a href=\"/uslugi/karta-stalego-pobytu\">permanent residence</a>.", "Это зависит от конкретной ситуации и выполнения требований закона об иностранцах. Сравните с <a href=\"/uslugi/karta-stalego-pobytu\">разрешением на постоянное проживание</a>.", "Це залежить від конкретної ситуації та виконання вимог закону про іноземців. Порівняйте з <a href=\"/uslugi/karta-stalego-pobytu\">дозволом на постійне проживання</a>."),
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
          "The permanent residence permit (zezwolenie na pobyt staly) is indefinite and grants unrestricted access to the labor market — without work permits or declarations. The most common grounds include: a valid Karta Polaka (Pole's Card); Polish descent; marriage to a Polish citizen (at least 3 years of marriage + at least 2 years of uninterrupted residence in Poland on a temporary residence permit issued in connection with the marriage immediately before the application); children of permanent residence holders; victims of human trafficking; and asylum/refugee status in certain configurations.",
          "Разрешение на постоянное проживание (zezwolenie na pobyt stały) является бессрочным и даёт свободный доступ к рынку труда — без разрешений на работу и заявлений. Наиболее частые основания: действующая Карта Поляка (Karta Polaka); польское происхождение; брак с гражданином РП (не менее 3 лет брака + непосредственно перед подачей заявления минимум 2 года непрерывного проживания в Польше на разрешении на временное проживание, выданном в связи с нахождением в браке); дети обладателей постоянного проживания; жертвы торговли людьми; убежище/статус беженца в определённых конфигурациях.",
          "Дозвіл на постійне проживання (zezwolenie na pobyt stały) є безстроковим і надає вільний доступ до ринку праці — без дозволів на роботу та заяв. Найпоширеніші підстави: чинна Карта Поляка (Karta Polaka); польське походження; шлюб з громадянином РП (щонайменше 3 роки шлюбу + безпосередньо перед подачею заяви мінімум 2 роки безперервного проживання в Польщі на дозволі на тимчасове проживання (zezwolenie na pobyt czasowy), наданому у зв'язку з перебуванням у шлюбі); діти власників постійного проживання; жертви торгівлі людьми; притулок/статус біженця у визначених конфігураціях."
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
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>analiza, która podstawa jest osiągalna;</li><li>przygotowanie dowodów (dokumenty pochodzeniowe, akty stanu cywilnego z <a href=\"/uslugi/tlumaczenia-przysiegle\">tłumaczeniami przysięgłymi</a>, historia pobytu);</li><li>złożenie wniosku przez MOS + potwierdzenie złożenia wniosku;</li><li>przygotowanie do przesłuchania;</li><li>monitoring sprawy do momentu zakończenia postępowania, odpowiedzi na wezwania.</li></ul>", "<ul><li>analysis of which legal basis is achievable;</li><li>preparing evidence (documents of origin, civil status records with <a href=\"/uslugi/tlumaczenia-przysiegle\">sworn translations</a>, residence history);</li><li>submitting the application via MOS + confirmation of submission;</li><li>preparation for the interview;</li><li>case monitoring until proceedings are concluded, responding to requests.</li></ul>", "<ul><li>анализ, какое правовое основание является достижимым;</li><li>подготовка доказательств (документы о происхождении, акты гражданского состояния с <a href=\"/uslugi/tlumaczenia-przysiegle\">присяжными переводами</a>, история проживания);</li><li>подача заявления через MOS + подтверждение подачи;</li><li>подготовка к собеседованию;</li><li>мониторинг дела до завершения производства, ответы на запросы.</li></ul>", "<ul><li>аналіз, яка правова підстава є досяжною;</li><li>підготовка доказів (документи про походження, акти цивільного стану з <a href=\"/uslugi/tlumaczenia-przysiegle\">присяжними перекладами</a>, історія проживання);</li><li>подання заяви через MOS + підтвердження подання заяви;</li><li>підготовка до співбесіди;</li><li>моніторинг справи до завершення провадження, відповіді на запити.</li></ul>"),
          },
          {
            heading: loc("Terminy i opłaty urzędowe", "Deadlines and official fees", "Сроки и государственные сборы", "Строки та державні збори"),
            body: loc("<p>Opłata skarbowa 640 zł (Karta Polaka: wniosek o pobyt stały bez opłaty skarbowej); karta pobytu 100 zł; opłata od pełnomocnictwa 17 zł. Karta wydawana na 10 lat (<a href=\"/uslugi/wymiana-karty-pobytu\">wymiana samej karty</a>).</p>", "<p>Stamp duty 640 PLN (Karta Polaka: permanent residence application is exempt from stamp duty); residence card 100 PLN; power of attorney fee 17 PLN. The card is issued for 10 years (<a href=\"/uslugi/wymiana-karty-pobytu\">card replacement</a>).</p>", "<p>Гербовый сбор (opłata skarbowa) 640 злотых (Карта Поляка (Karta Polaka): заявление на постоянное проживание без гербового сбора); карта побыту (karta pobytu) 100 злотых; сбор за доверенность 17 злотых. Карта выдаётся на 10 лет (<a href=\"/uslugi/wymiana-karty-pobytu\">замена самой карты</a>).</p>", "<p>Гербовий збір (opłata skarbowa) 640 злотих (Карта Поляка (Karta Polaka): заява на постійне проживання без гербового збору); карта побиту (посвідка на проживання) 100 злотих; збір за довіреність 17 злотих. Карта видається на 10 років (<a href=\"/uslugi/wymiana-karty-pobytu\">заміна самої карти</a>).</p>"),
          },
          {
            heading: loc("Na co uważać", "What to watch out for", "На что обратить внимание", "На що звернути увагу"),
            body: loc("<p>Przy podstawie małżeńskiej urząd bada realność związku; pobyt stały można utracić przy dłuższej nieobecności w Polsce.</p>", "<p>For marriage-based applications, the office examines the authenticity of the relationship; permanent residence can be lost in the event of a prolonged absence from Poland.</p>", "<p>При основании по браку ведомство проверяет подлинность отношений; разрешение на постоянное проживание (zezwolenie na pobyt stały) можно утратить при длительном отсутствии в Польше.</p>", "<p>При шлюбній підставі відомство перевіряє реальність відносин; дозвіл на постійне проживання (zezwolenie na pobyt stały) можна втратити при тривалій відсутності в Польщі.</p>"),
          },
        ],
        faq: [
          {
            question: loc("Czym różni się pobyt stały od pobytu rezydenta UE?", "What is the difference between permanent residence and EU long-term resident status?", "Чем отличается постоянное проживание от статуса долгосрочного резидента ЕС?", "Чим відрізняється постійне проживання від статусу довгострокового резидента ЄС?"),
            answer: loc("Podstawami prawnymi i mobilnością w UE. Szczegóły na stronie <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">rezydenta długoterminowego UE</a>.", "By the legal bases and EU mobility. Details on the <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">EU long-term resident</a> page.", "Правовыми основаниями и мобильностью в ЕС. Подробности на странице <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">разрешения на проживание долгосрочного резидента ЕС</a>.", "Правовими підставами та мобільністю в ЄС. Деталі на сторінці <a href=\"/uslugi/rezydent-dlugoterminowy-ue\">дозволу на проживання довгострокового резидента ЄС</a>."),
          },
          {
            question: loc("Czy po otrzymaniu zezwolenia mam otwarty dostęp do rynku pracy?", "Do I have unrestricted access to the labor market after receiving the permit?", "Имею ли я свободный доступ к рынку труда после получения разрешения?", "Чи маю я вільний доступ до ринку праці після отримання дозволу?"),
            answer: loc("Tak, decyzja daje swobodny dostęp do rynku pracy.", "Yes, the decision grants unrestricted access to the labor market.", "Да, решение даёт свободный доступ к рынку труда.", "Так, рішення надає вільний доступ до ринку праці."),
          },
          {
            question: loc("Czy po pobycie stałym mogę ubiegać się o obywatelstwo?", "Can I apply for citizenship after obtaining permanent residence?", "Могу ли я подать заявление на гражданство после получения постоянного проживания?", "Чи можу я після отримання постійного проживання подати заяву на громадянство?"),
            answer: loc("Pod pewnymi warunkami tak — jeśli spełnione są przesłanki z ustawy oraz określony upływ czasu.", "Under certain conditions, yes — provided the statutory prerequisites are met and a specified period of time has elapsed.", "При определённых условиях да — если выполнены предпосылки, предусмотренные законом, и истёк определённый срок.", "За певних умов так — якщо виконані передумови, передбачені законом, та минув визначений період часу."),
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
          "Reminder for failure to act and complaint to the court. When the office does not issue a decision on time, you can file a reminder for failure to act (ponaglenie) (Article 37 of KPA) for the voivode's inactivity or excessive delay. If this measure does not resolve the issue, you may consider filing a complaint with the voivodeship administrative court (WSA). Appeal (odwolanie). You have the right to appeal a voivode's decision to the Head of the Office for Foreigners (UdSC) within 14 days of receiving the decision.",
          "Понаглене (ponaglenie) и жалоба в суд. Когда ведомство не выносит решения в срок, можно подать понаглене (ст. 37 KPA) на бездействие или затягивание процедуры воеводой (wojewoda). Если это средство не приносит результата, можно рассмотреть подачу жалобы в воеводский административный суд (WSA). Апелляция (обжалование, odwołanie). Подаётся на решение воеводы Руководителю Управления по делам иностранцев (UdSC) в течение 14 дней с момента вручения решения.",
          "Понаглення (ponaglenie, скарга на бездіяльність) та скарга до суду. Коли відомство не видає рішення вчасно, можна подати понаглення (ст. 37 KPA) на бездіяльність або зволікання воєводи (wojewoda). Якщо цей засіб не дає результату, можна розглянути подання скарги до воєводського адміністративного суду (WSA). Апеляція (оскарження, odwołanie). Подається на рішення воєводи до Керівника Управління у справах іноземців (UdSC) протягом 14 днів від вручення рішення."
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
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>analiza sprawy i przygotowanie dokumentów;</li><li>złożenie ponaglenia lub odwołania;</li><li>reprezentacja przed Szefem UdSC i WSA we współpracy z radcą prawnym;</li><li>po wygranej pilnujemy wykonania decyzji przez wojewodę.</li></ul>", "<ul><li>case analysis and document preparation;</li><li>filing a reminder for failure to act or an appeal;</li><li>representation before the Head of UdSC and WSA in cooperation with a legal counsel;</li><li>after a successful outcome, we ensure the voivode executes the decision.</li></ul>", "<ul><li>анализ дела и подготовка документов;</li><li>подача понаглене (жалобы на бездействие) или апелляции (обжалования);</li><li>представительство перед Руководителем UdSC и WSA в сотрудничестве с юрисконсультом;</li><li>после положительного исхода следим за исполнением решения воеводой (wojewoda).</li></ul>", "<ul><li>аналіз справи та підготовка документів;</li><li>подання понаглення (скарга на бездіяльність) або апеляції (оскарження);</li><li>представництво перед Керівником UdSC та WSA у співпраці з юрисконсультом;</li><li>після позитивного результату стежимо за виконанням рішення воєводою (wojewoda).</li></ul>"),
          },
          {
            heading: loc("Terminy", "Deadlines", "Сроки", "Строки"),
            body: loc("<p>Odwołanie: <strong>14 dni od doręczenia decyzji</strong> (przywrócenie terminu tylko wyjątkowo). Skarga do wojewódzkiego sądu administracyjnego: <strong>30 dni od dnia doręczenia skarżącemu rozstrzygnięcia</strong>.</p>", "<p>Appeal: <strong>14 days from the delivery of the decision</strong> (reinstatement of the deadline only in exceptional cases). Complaint to the voivodeship administrative court (WSA): <strong>30 days from the date of delivery of the ruling to the complainant</strong>.</p>", "<p>Апелляция (обжалование, odwołanie): <strong>14 дней с момента вручения решения</strong> (восстановление срока только в исключительных случаях). Жалоба в воеводский административный суд (WSA): <strong>30 дней со дня вручения заявителю решения</strong>.</p>", "<p>Апеляція (оскарження, odwołanie): <strong>14 днів від вручення рішення</strong> (поновлення строку лише у виняткових випадках). Скарга до воєводського адміністративного суду (WSA): <strong>30 днів від дня вручення скаржнику рішення</strong>.</p>"),
          },
        ],
        faq: [
          {
            question: loc("Czy ponaglenie może być pomocne w procedurze pobytowej?", "Can a reminder for failure to act be helpful in residence proceedings?", "Может ли понаглене (жалоба на бездействие) помочь в процедуре проживания?", "Чи може понаглення (скарга на бездіяльність) бути корисним у процедурі проживання?"),
            answer: loc("Tak — często wymusza podjęcie działań oraz jest wymagane przed złożeniem skargi do sądu.", "Yes — it often forces the office to take action and is required before filing a complaint with the court.", "Да — часто заставляет ведомство предпринять действия и является обязательным условием перед подачей жалобы в суд.", "Так — часто змушує відомство вжити заходів та є необхідною умовою перед подачею скарги до суду."),
          },
          {
            question: loc("Przegapiłem termin 14 dni — czy nie mogę się już odwołać?", "I missed the 14-day deadline — can I no longer appeal?", "Я пропустил 14-дневный срок — могу ли я ещё обжаловать?", "Я пропустив строк 14 днів — чи не можу я вже оскаржити?"),
            answer: loc("Zwykle nie można; wyjątkiem jest spełnienie przesłanek przywrócenia terminu na złożenie odwołania.", "Usually not; the exception is meeting the conditions for reinstatement of the appeal deadline.", "Обычно нет; исключением является выполнение предпосылок для восстановления срока на подачу апелляции (обжалования).", "Зазвичай ні; винятком є виконання передумов для поновлення строку на подання апеляції (оскарження)."),
          },
          {
            question: loc("Czy mogę zostać w Polsce w trakcie procedowania odwołania?", "Can I stay in Poland while the appeal is being processed?", "Могу ли я остаться в Польше во время рассмотрения апелляции?", "Чи можу я залишитися в Польщі під час розгляду апеляції?"),
            answer: loc("Jeśli odwołanie zostało złożone w ustawowym terminie, pobyt w procedurze odwoławczej pozostaje legalny.", "If the appeal was filed within the statutory deadline, your stay during the appeal procedure remains legal.", "Если апелляция (обжалование, odwołanie) была подана в установленный законом срок, пребывание в ходе апелляционной процедуры остаётся легальным.", "Якщо апеляцію (оскарження, odwołanie) було подано у встановлений законом строк, перебування під час процедури оскарження залишається легальним."),
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
          "Foreign-language documents submitted to Polish offices (civil status records, diplomas, criminal record certificates, employment documents) must be translated by a sworn translator (tlumacz przysiely) listed with the Minister of Justice. Ordinary translations are not accepted in residence proceedings.",
          "Иноязычные документы, подаваемые в польские ведомства (акты гражданского состояния, дипломы, справки о несудимости, трудовые документы), должны быть переведены присяжным переводчиком (tłumacz przysięgły), внесённым в реестр Министерства юстиции. Обычный перевод не принимается в процедурах проживания.",
          "Іноземномовні документи, що подаються до польських відомств (акти цивільного стану, дипломи, довідки про несудимість, трудові документи), повинні бути перекладені присяжним перекладачем (tłumacz przysięgły), внесеним до реєстру Міністерства юстиції. Звичайний переклад не приймається у процедурах проживання."
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
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>weryfikacja, które dokumenty w Twojej sprawie faktycznie wymagają tłumaczenia (nie płacisz za zbędne);</li><li>tłumaczenie przysięgłe (najczęstsze języki naszych klientów to ukraiński, rosyjski, angielski i białoruski — obsługujemy również inne).</li></ul>", "<ul><li>verification of which documents in your case actually require translation (you do not pay for unnecessary ones);</li><li>sworn translation (the most common languages of our clients are Ukrainian, Russian, English, and Belarusian — we also handle other languages).</li></ul>", "<ul><li>проверка, какие документы в вашем деле действительно требуют перевода (вы не платите за лишние);</li><li>присяжный перевод (tłumaczenie przysięgłe) (наиболее частые языки наших клиентов — украинский, русский, английский и белорусский — обслуживаем также другие).</li></ul>", "<ul><li>перевірка, які документи у вашій справі дійсно потребують перекладу (ви не платите за зайві);</li><li>присяжний переклад (tłumaczenie przysięgłe) (найпоширеніші мови наших клієнтів — українська, російська, англійська та білоруська — обслуговуємо також інші).</li></ul>"),
          },
          {
            heading: loc("Wycena", "Pricing", "Стоимость", "Вартість"),
            body: loc("<p>Wycena indywidualna — zależy od liczby stron i języka dokumentu.</p>", "<p>Individual pricing — depends on the number of pages and the language of the document.</p>", "<p>Индивидуальная оценка — зависит от количества страниц и языка документа.</p>", "<p>Індивідуальна оцінка — залежить від кількості сторінок та мови документа.</p>"),
          },
        ],
        faq: [
          {
            question: loc("Czy tłumaczenie dokumentu wykonane w Ukrainie będzie uznane?", "Will a document translation made in Ukraine be accepted?", "Будет ли признан перевод документа, выполненный в Украине?", "Чи буде визнано переклад документа, виконаний в Україні?"),
            answer: loc("Nie, urzędy wymagają tłumaczenia wykonanego przez tłumacza przysięgłego w Polsce.", "No, offices require a translation made by a sworn translator in Poland.", "Нет, ведомства требуют перевода, выполненного присяжным переводчиком (tłumacz przysięgły) в Польше.", "Ні, відомства вимагають перекладу, виконаного присяжним перекладачем (tłumacz przysięgły) у Польщі."),
          },
          {
            question: loc("Jak szybko mogę uzyskać tłumaczenie dokumentu?", "How quickly can I get a document translation?", "Как быстро я могу получить перевод документа?", "Як швидко я можу отримати переклад документа?"),
            answer: loc("Zależy od liczby stron dokumentu. Zwykle zajmuje to kilka dni; sprawy bardziej skomplikowane — kilkanaście dni.", "It depends on the number of pages. Usually it takes a few days; more complex cases — up to two weeks.", "Зависит от количества страниц документа. Обычно это занимает несколько дней; более сложные дела — до двух недель.", "Залежить від кількості сторінок документа. Зазвичай це займає кілька днів; більш складні справи — кільканадцять днів."),
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
          "Zezwolenie na prac\u0119 dla cudzoziemca \u2014 wniosek pracodawcy przez praca.gov.pl, op\u0142ata 200/400 z\u0142, obowi\u0105zki po wydaniu. Sprawdzamy, czy zezwolenie jest w og\u00f3le potrzebne.",
          "Work permit for a foreigner \u2014 employer's application via praca.gov.pl, fee 200/400 PLN, post-issuance obligations. We check if a permit is needed at all.",
          "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435 \u043d\u0430 \u0440\u0430\u0431\u043e\u0442\u0443 \u0434\u043b\u044f \u0438\u043d\u043e\u0441\u0442\u0440\u0430\u043d\u0446\u0430 \u2014 \u0437\u0430\u044f\u0432\u043a\u0430 \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044f \u0447\u0435\u0440\u0435\u0437 praca.gov.pl, \u0441\u0431\u043e\u0440 200/400 \u0437\u043b\u043e\u0442\u044b\u0445. \u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c, \u043d\u0443\u0436\u043d\u043e \u043b\u0438 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435.",
          "\u0414\u043e\u0437\u0432\u0456\u043b \u043d\u0430 \u0440\u043e\u0431\u043e\u0442\u0443 \u0434\u043b\u044f \u0456\u043d\u043e\u0437\u0435\u043c\u0446\u044f \u2014 \u0437\u0430\u044f\u0432\u043a\u0430 \u0440\u043e\u0431\u043e\u0442\u043e\u0434\u0430\u0432\u0446\u044f \u0447\u0435\u0440\u0435\u0437 praca.gov.pl, \u0437\u0431\u0456\u0440 200/400 \u0437\u043b\u043e\u0442\u0438\u0445. \u041f\u0435\u0440\u0435\u0432\u0456\u0440\u044f\u0454\u043c\u043e, \u0447\u0438 \u043f\u043e\u0442\u0440\u0456\u0431\u0435\u043d \u0434\u043e\u0437\u0432\u0456\u043b."
        ),
        fullDescription: loc(
          "Zezwolenie na pracę legalizuje samą pracę (nie pobyt) i jest wydawane przez wojewodę na wniosek podmiotu powierzającego wykonywanie pracy. Od 1.06.2025 obowiązuje nowa ustawa o warunkach dopuszczalności powierzania pracy cudzoziemcom. Wnioski składa się wyłącznie elektronicznie przez praca.gov.pl.",
          "A work permit (zezwolenie na prace) legalizes employment only (not residence) and is issued by the voivode upon an application from the entity entrusting the work. Since 1 June 2025, the new Act on the Conditions of Admissibility of Entrusting Work to Foreigners has been in force. Applications are submitted exclusively electronically via praca.gov.pl.",
          "Разрешение на работу (zezwolenie na pracę) легализует саму работу (не проживание) и выдаётся воеводой (wojewoda) по заявлению субъекта, поручающего выполнение работы. С 1.06.2025 действует новый закон об условиях допустимости поручения работы иностранцам. Заявления подаются исключительно электронно через praca.gov.pl.",
          "Дозвіл на роботу (zezwolenie na pracę) легалізує саму роботу (не проживання) і видається воєводою (wojewoda) за заявою суб'єкта, що доручає виконання роботи. З 1.06.2025 діє новий закон про умови допустимості доручення роботи іноземцям. Заяви подаються виключно електронно через praca.gov.pl."
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
            heading: loc("Warunki", "Requirements", "Условия", "Умови"),
            body: loc("<p>Wynagrodzenie nie niższe niż porównywalnych pracowników, wymiar czasu pracy od 1/4 do pełnego etatu; cudzoziemiec musi mieć osobno tytuł pobytowy pozwalający na wykonywanie pracy.</p>", "<p>Salary no lower than that of comparable employees, working hours from 1/4 to full-time; the foreigner must separately hold a residence title that allows them to work.</p>", "<p>Заработная плата не ниже, чем у сопоставимых работников, продолжительность рабочего времени от 1/4 до полной занятости; иностранец должен отдельно иметь вид на жительство, позволяющий выполнять работу.</p>", "<p>Заробітна плата не нижча, ніж у порівнянних працівників, обсяг робочого часу від 1/4 до повної зайнятості; іноземець повинен окремо мати дозвіл на проживання, що дозволяє виконувати роботу.</p>"),
          },
          {
            heading: loc("Co obejmuje usługa GetPermit (dla pracodawcy)", "What the GetPermit service includes (for employers)", "Что включает услуга GetPermit (для работодателя)", "Що включає послуга GetPermit (для роботодавця)"),
            body: loc("<ul><li>weryfikacja, czy zezwolenie w ogóle jest potrzebne (szeroki katalog zwolnień z tego obowiązku — m.in. Karta Polaka, absolwenci polskich uczelni, pobyt stały, rezydent UE);</li><li>przygotowanie i złożenie wniosku na praca.gov.pl;</li><li>korekty braków na wezwanie urzędu;</li><li>pilnowanie obowiązków po wydaniu zezwolenia (obowiązki notyfikacyjne, zgłoszenie kopii umowy przed rozpoczęciem pracy).</li></ul>", "<ul><li>verification of whether a permit is needed at all (a broad catalog of exemptions — including Karta Polaka holders, graduates of Polish universities, permanent residents, EU long-term residents);</li><li>preparation and submission of the application on praca.gov.pl;</li><li>correcting deficiencies at the office's request;</li><li>ensuring compliance with obligations after the permit is issued (notification obligations, submitting a copy of the contract before work begins).</li></ul>", "<ul><li>проверка, нужно ли разрешение на работу (zezwolenie na pracę) вообще (широкий перечень освобождений от этой обязанности — в т. ч. Карта Поляка (Karta Polaka), выпускники польских вузов, постоянное проживание, долгосрочный резидент ЕС);</li><li>подготовка и подача заявления на praca.gov.pl;</li><li>исправление недостатков по требованию ведомства;</li><li>контроль обязанностей после выдачи разрешения (уведомительные обязанности, подача копии договора до начала работы).</li></ul>", "<ul><li>перевірка, чи дозвіл на роботу (zezwolenie na pracę) взагалі потрібен (широкий перелік звільнень від цього обов'язку — зокрема Карта Поляка (Karta Polaka), випускники польських ВНЗ, постійне проживання, довгостроковий резидент ЄС);</li><li>підготовка та подання заяви на praca.gov.pl;</li><li>виправлення недоліків на вимогу відомства;</li><li>контроль обов'язків після видачі дозволу (повідомні обов'язки, подання копії договору до початку роботи).</li></ul>"),
          },
          {
            heading: loc("Terminy i opłaty urzędowe", "Deadlines and official fees", "Сроки и государственные сборы", "Строки та державні збори"),
            body: loc("<p>Opłata skarbowa: 200 zł (praca do 3 miesięcy), <strong>400 zł</strong> (powierzenie pracy powyżej 3 miesięcy).</p>", "<p>Stamp duty: 200 PLN (work up to 3 months), <strong>400 PLN</strong> (entrusting work for more than 3 months).</p>", "<p>Гербовый сбор (opłata skarbowa): 200 злотых (работа до 3 месяцев), <strong>400 злотых</strong> (поручение работы свыше 3 месяцев).</p>", "<p>Гербовий збір (opłata skarbowa): 200 злотих (робота до 3 місяців), <strong>400 злотих</strong> (доручення роботи понад 3 місяці).</p>"),
          },
          {
            heading: loc("Na co uważać", "What to watch out for", "На что обратить внимание", "На що звернути увагу"),
            body: loc("<p>Obowiązki notyfikacyjne podmiotu powierzającego wykonywanie pracy oraz obowiązek zgłoszenia kopii umowy cudzoziemca przynajmniej dzień przed rozpoczęciem pracy.</p>", "<p>Notification obligations of the entity entrusting work and the obligation to submit a copy of the foreigner's contract at least one day before work begins.</p>", "<p>Уведомительные обязанности субъекта, поручающего выполнение работы, а также обязанность подать копию договора иностранца как минимум за день до начала работы.</p>", "<p>Повідомні обов'язки суб'єкта, що доручає виконання роботи, та обов'язок подати копію договору іноземця щонайменше за день до початку роботи.</p>"),
          },
        ],
        faq: [
          {
            question: loc("Czy zezwolenie na pracę legalizuje pobyt?", "Does a work permit legalize residence?", "Легализует ли разрешение на работу (zezwolenie na pracę) проживание?", "Чи легалізує дозвіл на роботу (zezwolenie na pracę) проживання?"),
            answer: loc("Nie, wymagana jest dodatkowo legalizacja pobytu — np. <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">zezwolenie na pobyt czasowy i pracę</a>.", "No, residence legalization is additionally required — e.g., a <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">temporary residence and work permit</a>.", "Нет, дополнительно требуется легализация проживания — например, <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">разрешение на временное проживание и работу (единое разрешение)</a>.", "Ні, додатково необхідна легалізація проживання — наприклад, <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">дозвіл на тимчасове проживання та роботу (єдиний дозвіл)</a>."),
          },
          {
            question: loc("Kto składa wniosek?", "Who submits the application?", "Кто подаёт заявление?", "Хто подає заяву?"),
            answer: loc("Podmiot powierzający wykonywanie pracy.", "The entity entrusting the work.", "Субъект, поручающий выполнение работы (работодатель).", "Суб'єкт, що доручає виконання роботи (роботодавець)."),
          },
          {
            question: loc("Jak długo się czeka?", "How long does it take?", "Сколько ждать?", "Як довго чекати?"),
            answer: loc("Zależy od danego urzędu wojewódzkiego. Zazwyczaj procedura trwa kilka miesięcy. W razie bezczynności pomagamy z <a href=\"/uslugi/ponaglenia-i-odwolania\">ponagleniami</a>.", "It depends on the specific voivodeship office. Usually the procedure takes several months. In the event of inactivity, we help with <a href=\"/uslugi/ponaglenia-i-odwolania\">reminders for failure to act</a>.", "Зависит от конкретного воеводского управления. Обычно процедура длится несколько месяцев. В случае бездействия помогаем с <a href=\"/uslugi/ponaglenia-i-odwolania\">понаглене (жалобами на бездействие)</a>.", "Залежить від конкретного воєводського управління. Зазвичай процедура триває кілька місяців. У разі бездіяльності допомагаємо з <a href=\"/uslugi/ponaglenia-i-odwolania\">понагленнями (скарга на бездіяльність)</a>."),
          },
          {
            question: loc("Czy można zmienić stanowisko pracy na zezwoleniu na pracę?", "Can you change the job position on a work permit?", "Можно ли изменить должность в разрешении на работу?", "Чи можна змінити посаду у дозволі на роботу?"),
            answer: loc("W większości przypadków wymagane jest uzyskanie nowego zezwolenia na pracę — należy konkretnie przeanalizować sytuację.", "In most cases, obtaining a new work permit is required — the specific situation needs to be analyzed.", "В большинстве случаев требуется получение нового разрешения на работу — необходимо детально проанализировать ситуацию.", "У більшості випадків необхідне отримання нового дозволу на роботу — потрібно детально проаналізувати ситуацію."),
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
          "The fastest path to work legalization for citizens of Armenia, Belarus, Moldova, and Ukraine (without temporary protection): the employer submits an application for registration of the employer's declaration on entrusting work (oswiadczenie o powierzeniu pracy) electronically, before work begins, via praca.gov.pl. It applies to non-seasonal work; the declaration is issued for a period of up to 24 months. The start date of work indicated in the application may be a maximum of 6 months from the date of submission.",
          "Самый быстрый путь легализации работы для граждан Армении, Беларуси, Молдовы и Украины (без временной защиты): работодатель подаёт заявление о внесении заявления о поручении работы (oświadczenie o powierzeniu pracy) в реестр электронно, до начала работы, через систему praca.gov.pl. Касается несезонной работы; заявление выдаётся на период до 24 месяцев. Указанная в заявлении дата начала работы — максимально 6 месяцев от даты подачи.",
          "Найшвидший шлях легалізації роботи для громадян Вірменії, Білорусі, Молдови та України (без тимчасового захисту (ochrona czasowa)): роботодавець подає заяву про внесення заяви про доручення роботи (oświadczenie o powierzeniu pracy) до реєстру електронно, до початку роботи, через систему praca.gov.pl. Стосується несезонної роботи; заява видається на період до 24 місяців. Зазначена у заяві дата початку роботи — максимально 6 місяців від дати подання."
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
            heading: loc("Procedura", "Procedure", "Процедура", "Процедура"),
            body: loc("<p>Opłata skarbowa <strong>400 zł</strong>. <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">Oświadczenie</a> składane przez <strong>praca.gov.pl</strong> z wymaganymi załącznikami (w tym wszystkie zapisane strony paszportu cudzoziemca).</p><p>Czas oczekiwania zależy od danego urzędu — wpisanie do ewidencji może zająć tydzień lub kilka tygodni.</p><p>Pracę można rozpocząć <strong>dopiero po wpisie do ewidencji</strong>, na warunkach z oświadczenia.</p><p>Dla cudzoziemca za granicą wpisane oświadczenie to podstawa do ubiegania się o wizę (cel 05a).</p>", "<p>Stamp duty <strong>400 PLN</strong>. The <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">employer's declaration</a> is submitted via <strong>praca.gov.pl</strong> with the required attachments (including all filled-in pages of the foreigner's passport).</p><p>The waiting time depends on the specific office — registration may take a week or several weeks.</p><p>Work may begin <strong>only after registration</strong>, under the conditions specified in the declaration.</p><p>For a foreigner abroad, the registered declaration is the basis for applying for a visa (purpose 05a).</p>", "<p>Гербовый сбор (opłata skarbowa) <strong>400 злотых</strong>. <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">Заявление о поручении работы (oświadczenie)</a> подаётся через <strong>praca.gov.pl</strong> с необходимыми приложениями (включая все заполненные страницы паспорта иностранца).</p><p>Время ожидания зависит от конкретного ведомства — внесение в реестр может занять неделю или несколько недель.</p><p>Работу можно начать <strong>только после внесения в реестр</strong>, на условиях из заявления.</p><p>Для иностранца за рубежом зарегистрированное заявление является основанием для получения визы (цель 05a).</p>", "<p>Гербовий збір (opłata skarbowa) <strong>400 злотих</strong>. <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">Заява про доручення роботи (oświadczenie)</a> подається через <strong>praca.gov.pl</strong> з необхідними додатками (включаючи всі заповнені сторінки паспорта іноземця).</p><p>Час очікування залежить від конкретного відомства — внесення до реєстру може зайняти тиждень або кілька тижнів.</p><p>Роботу можна розпочати <strong>тільки після внесення до реєстру</strong>, на умовах із заяви.</p><p>Для іноземця за кордоном зареєстрована заява є підставою для отримання візи (ціль 05a).</p>"),
          },
          {
            heading: loc("Obowiązki pracodawcy po wpisie", "Employer's obligations after registration", "Обязанности работодателя после регистрации", "Обов'язки роботодавця після реєстрації"),
            body: loc("<ul><li>zgłoszenie <strong>podjęcia</strong> pracy w ciągu 7 dni od rozpoczęcia pracy oraz <strong>niepodjęcia</strong> pracy w ciągu 14 dni od daty rozpoczęcia pracy wskazanej w oświadczeniu;</li><li>zgłoszenie zakończenia pracy cudzoziemca;</li><li>przesłanie kopii umowy zgodnej z oświadczeniem (co najmniej dzień przed rozpoczęciem pracy);</li><li>przekazanie dokumentów cudzoziemcowi.</li></ul><p>Wszystkie zgłoszenia przez praca.gov.pl, pod rygorem grzywny.</p>", "<ul><li>reporting the <strong>commencement</strong> of work within 7 days of the start of work and <strong>non-commencement</strong> of work within 14 days of the start date indicated in the declaration;</li><li>reporting the end of the foreigner's employment;</li><li>submitting a copy of the contract consistent with the declaration (at least one day before work begins);</li><li>providing documents to the foreigner.</li></ul><p>All reports are submitted via praca.gov.pl, under penalty of a fine.</p>", "<ul><li>сообщение о <strong>начале</strong> работы в течение 7 дней с момента начала работы и о <strong>неначале</strong> работы в течение 14 дней с даты начала работы, указанной в заявлении;</li><li>сообщение о завершении работы иностранца;</li><li>направление копии договора, соответствующего заявлению (как минимум за день до начала работы);</li><li>передача документов иностранцу.</li></ul><p>Все уведомления через praca.gov.pl, под угрозой штрафа.</p>", "<ul><li>повідомлення про <strong>початок</strong> роботи протягом 7 днів від початку роботи та про <strong>непочаток</strong> роботи протягом 14 днів від дати початку роботи, зазначеної у заяві;</li><li>повідомлення про завершення роботи іноземця;</li><li>надсилання копії договору, що відповідає заяві (щонайменше за день до початку роботи);</li><li>передача документів іноземцю.</li></ul><p>Усі повідомлення через praca.gov.pl, під загрозою штрафу.</p>"),
          },
          {
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>weryfikacja, czy oświadczenie to właściwy tryb dla danego cudzoziemca (alternatywa: <a href=\"/uslugi/powiadomienia-o-powierzeniu-pracy\">powiadomienie</a> dla obywateli Ukrainy lub <a href=\"/uslugi/zezwolenie-na-prace\">zezwolenie na pracę</a>);</li><li>przygotowanie i złożenie wniosku przez praca.gov.pl.</li></ul>", "<ul><li>verification of whether the declaration is the appropriate procedure for the given foreigner (alternative: <a href=\"/uslugi/powiadomienia-o-powierzeniu-pracy\">notification of entrusting work</a> for Ukrainian citizens or a <a href=\"/uslugi/zezwolenie-na-prace\">work permit</a>);</li><li>preparation and submission of the application via praca.gov.pl.</li></ul>", "<ul><li>проверка, является ли заявление о поручении работы (oświadczenie) надлежащим порядком для данного иностранца (альтернатива: <a href=\"/uslugi/powiadomienia-o-powierzeniu-pracy\">уведомление о поручении работы</a> для граждан Украины или <a href=\"/uslugi/zezwolenie-na-prace\">разрешение на работу</a>);</li><li>подготовка и подача заявления через praca.gov.pl.</li></ul>", "<ul><li>перевірка, чи заява про доручення роботи (oświadczenie) є належним порядком для даного іноземця (альтернатива: <a href=\"/uslugi/powiadomienia-o-powierzeniu-pracy\">повідомлення про доручення роботи</a> для громадян України або <a href=\"/uslugi/zezwolenie-na-prace\">дозвіл на роботу</a>);</li><li>підготовка та подання заяви через praca.gov.pl.</li></ul>"),
          },
        ],
        faq: [
          {
            question: loc("Ile kosztuje wpisanie oświadczenia do ewidencji?", "How much does it cost to register the declaration?", "Сколько стоит внесение заявления о поручении работы (oświadczenie) в реестр?", "Скільки коштує внесення заяви про доручення роботи (oświadczenie) до реєстру?"),
            answer: loc("Opłata skarbowa to 400 zł.", "The stamp duty is 400 PLN.", "Гербовый сбор (opłata skarbowa) составляет 400 злотых.", "Гербовий збір (opłata skarbowa) становить 400 злотих."),
          },
          {
            question: loc("Kiedy pracownik może zacząć pracę?", "When can the employee start working?", "Когда работник может начать работу?", "Коли працівник може розпочати роботу?"),
            answer: loc("Po wpisie oświadczenia do ewidencji.", "After the declaration has been registered.", "После внесения заявления о поручении работы (oświadczenie) в реестр.", "Після внесення заяви про доручення роботи (oświadczenie) до реєстру."),
          },
          {
            question: loc("Czy oświadczenie legalizuje pobyt?", "Does the declaration legalize residence?", "Легализует ли заявление о поручении работы (oświadczenie) проживание?", "Чи легалізує заява про доручення роботи (oświadczenie) проживання?"),
            answer: loc("Nie, wymagana jest dodatkowo legalizacja pobytu w Polsce — np. <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">zezwolenie na pobyt czasowy i pracę</a>.", "No, residence legalization in Poland is additionally required — e.g., a <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">temporary residence and work permit</a>.", "Нет, дополнительно требуется легализация проживания в Польше — например, <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">разрешение на временное проживание и работу (единое разрешение)</a>.", "Ні, додатково необхідна легалізація проживання в Польщі — наприклад, <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">дозвіл на тимчасове проживання та роботу (єдиний дозвіл)</a>."),
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
          "A notification of entrusting work (powiadomienie) is a free-of-charge filing regarding the commencement of work by a Ukrainian citizen or a person holding PESEL UKR status. The foreigner starts work first, and the employer notifies the District Labor Office within 7 days of the start of work via praca.gov.pl. This is the only path to work legalization for persons under temporary protection (UKR status). Ukrainian citizens with a different residence title (visa, residence card, visa-free travel) may use either the notification or the employer's declaration on entrusting work.",
          "Уведомление о поручении работы (powiadomienie) — это бесплатное сообщение о начале работы гражданином Украины или лицом со статусом PESEL UKR. Иностранец сначала приступает к работе, а работодатель в течение 7 дней с начала работы уведомляет районное управление труда через praca.gov.pl. Это единственный путь легализации работы для лиц, находящихся под временной защитой (статус UKR). Граждане Украины с иным видом на жительство (виза, карта побыту, безвизовый режим) могут использовать уведомление или заявление о поручении работы (oświadczenie o powierzeniu pracy).",
          "Повідомлення про доручення роботи (powiadomienie) — це безкоштовне повідомлення щодо початку роботи громадянином України або особою зі статусом PESEL UKR. Іноземець спочатку приступає до роботи, а роботодавець протягом 7 днів від початку роботи повідомляє районне управління праці через praca.gov.pl. Це єдиний шлях легалізації роботи для осіб під тимчасовим захистом (ochrona czasowa, статус UKR). Громадяни України з іншим дозволом на проживання (віза, карта побиту (посвідка на проживання), безвізовий режим) можуть використовувати повідомлення або заяву про доручення роботи (oświadczenie o powierzeniu pracy)."
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
            heading: loc("Warunki ważności", "Validity conditions", "Условия действительности", "Умови дійсності"),
            body: loc("<p>Terminowe powiadomienie z prawidłowymi danymi. Każda zmiana pracodawcy rodzi obowiązek złożenia nowego powiadomienia. W powiadomieniach nie wskazuje się daty zakończenia pracy.</p>", "<p>Timely notification with correct data. Each change of employer creates an obligation to file a new notification. Notifications do not specify an end date for employment.</p>", "<p>Своевременное уведомление (powiadomienie) с правильными данными. Каждая смена работодателя порождает обязанность подачи нового уведомления. В уведомлениях не указывается дата окончания работы.</p>", "<p>Вчасне повідомлення (powiadomienie) з правильними даними. Кожна зміна роботодавця породжує обов'язок подання нового повідомлення. У повідомленнях не зазначається дата закінчення роботи.</p>"),
          },
          {
            heading: loc("Ważne terminy (ochrona czasowa)", "Important deadlines (temporary protection)", "Важные сроки (временная защита)", "Важливі строки (тимчасовий захист)"),
            body: loc("<p>Koniec ochrony czasowej: <strong>4.03.2027</strong> — do tej daty należy złożyć wniosek o <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">pobyt czasowy</a>.</p>", "<p>End of temporary protection: <strong>4 March 2027</strong> — you must submit an application for <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">temporary residence</a> by this date.</p>", "<p>Окончание временной защиты: <strong>4.03.2027</strong> — до этой даты необходимо подать заявление на <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">разрешение на временное проживание</a>.</p>", "<p>Закінчення тимчасового захисту (ochrona czasowa): <strong>4.03.2027</strong> — до цієї дати необхідно подати заяву на <a href=\"/uslugi/zezwolenie-na-pobyt-czasowy-i-prace\">дозвіл на тимчасове проживання</a>.</p>"),
          },
          {
            heading: loc("Co obejmuje usługa GetPermit", "What the GetPermit service includes", "Что включает услуга GetPermit", "Що включає послуга GetPermit"),
            body: loc("<ul><li>ustalenie właściwej ścieżki (status UKR vs inne tytuły pobytowe — alternatywa: <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">oświadczenie o powierzeniu pracy</a>);</li><li>złożenie powiadomienia w terminie;</li><li>strategia na koniec ochrony czasowej oraz wsparcie w składaniu wniosków o pobyt czasowy.</li></ul>", "<ul><li>determining the appropriate path (UKR status vs. other residence titles — alternative: <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">employer's declaration on entrusting work</a>);</li><li>filing the notification on time;</li><li>strategy for the end of temporary protection and support in submitting temporary residence applications.</li></ul>", "<ul><li>определение надлежащего пути (статус PESEL UKR vs другие виды на жительство — альтернатива: <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">заявление о поручении работы (oświadczenie)</a>);</li><li>подача уведомления (powiadomienie) в срок;</li><li>стратегия на окончание временной защиты и поддержка в подаче заявлений на разрешение на временное проживание.</li></ul>", "<ul><li>встановлення належного шляху (статус PESEL UKR vs інші дозволи на проживання — альтернатива: <a href=\"/uslugi/oswiadczenie-o-powierzeniu-pracy\">заява про доручення роботи (oświadczenie)</a>);</li><li>подання повідомлення (powiadomienie) вчасно;</li><li>стратегія на закінчення тимчасового захисту (ochrona czasowa) та підтримка у подачі заяв на дозвіл на тимчасове проживання.</li></ul>"),
          },
        ],
        faq: [
          {
            question: loc("Ile kosztuje złożenie powiadomienia przez pracodawcę?", "How much does it cost for an employer to file a notification?", "Сколько стоит подача уведомления (powiadomienie) работодателем?", "Скільки коштує подання повідомлення (powiadomienie) роботодавцем?"),
            answer: loc("Powiadomienie jest bezpłatne.", "The notification is free of charge.", "Уведомление является бесплатным.", "Повідомлення є безкоштовним."),
          },
          {
            question: loc("Co w przypadku, gdy minie 7 dni na złożenie powiadomienia?", "What if the 7-day deadline for filing the notification passes?", "Что будет, если пройдёт 7 дней на подачу уведомления?", "Що буде, якщо мине 7 днів на подання повідомлення?"),
            answer: loc("Powiadomienie spóźnione nie legalizuje pracy wstecz.", "A late notification does not legalize work retroactively.", "Просроченное уведомление не легализует работу задним числом.", "Запізніле повідомлення не легалізує роботу заднім числом."),
          },
          {
            question: loc("Czy zmiana stanowiska wymaga nowego powiadomienia?", "Does a position change require a new notification?", "Требует ли смена должности нового уведомления?", "Чи потребує зміна посади нового повідомлення?"),
            answer: loc("Zazwyczaj tak, jednak wymagana jest analiza w konkretnej sprawie.", "Usually yes, however an analysis of the specific case is required.", "Обычно да, однако требуется анализ конкретного дела.", "Зазвичай так, проте необхідний аналіз у конкретній справі."),
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
          "Work legalization for a foreigner based on a B2B contract with a business incubator (Fundacja Firma Dla Każdego). The procedure involves concluding a cooperation agreement with the incubator and obtaining a work permit. We help employers and foreigners with coordination with the incubator, documentation preparation, and representation before the authorities.",
          "Легализация работы иностранца на основе договора B2B, заключённого с бизнес-инкубатором (inkubator przedsiębiorczości). Процедура включает заключение договора сотрудничества с инкубатором и получение разрешения на работу (zezwolenie na pracę). Помогаем работодателям и иностранцам в координации с инкубатором, подготовке документации и представительстве перед ведомствами.",
          "Легалізація роботи іноземця на основі договору B2B, укладеного з бізнес-інкубатором (inkubator przedsiębiorczości). Процедура включає укладення договору співпраці з інкубатором та отримання дозволу на роботу (zezwolenie na pracę). Допомагаємо роботодавцям та іноземцям з координацією з інкубатором, підготовкою документації та представництвом перед відомствами."
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
