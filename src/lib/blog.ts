export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  imageAlt: string;
  author: string;
  toc: Array<{ id: string; title: string }>;
  sections: Array<{
    id: string;
    heading: string;
    content: string;
  }>;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "ochrona-czasowa-ukraincow-po-4-marca-2026",
    title: "Ochrona czasowa Ukraińców po 4 marca 2026 — co się zmienia?",
    description:
      "Ochrona czasowa obywateli Ukrainy przedłużona do marca 2027. Nowe zasady pobytu, pracy, opieki zdrowotnej i działalności gospodarczej po wygaszeniu specustawy.",
    date: "2026-04-09",
    imageUrl: "/blog-ochrona-czasowa.jpg",
    imageAlt:
      "Flagi Ukrainy i Polski — ochrona czasowa obywateli Ukrainy w Polsce, karta pobytu",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "dlaczego-ochrona", title: "Dlaczego ochrona czasowa nadal obowiązuje" },
      { id: "wygaszenie-specustawy", title: "Wygaszenie specustawy i nowy system" },
      { id: "status-ukr", title: "Status UKR i numer PESEL UKR" },
      { id: "diia-mobywatel", title: "Karta DIIA i aplikacja mObywatel" },
      { id: "zatrudnienie", title: "Zatrudnienie po zmianach w 2026" },
      { id: "pomoc-socjalna", title: "Pomoc socjalna i opieka zdrowotna" },
      { id: "dzialalnosc", title: "Działalność gospodarcza" },
      { id: "po-2027", title: "Co dalej po 2027 roku" },
      { id: "faq", title: "Najczęściej zadawane pytania" },
    ],
    sections: [
      {
        id: "dlaczego-ochrona",
        heading: "Dlaczego ochrona czasowa dla obywateli Ukrainy nadal obowiązuje po 4 marca 2026 r.",
        content: `<p>Ochrona czasowa pozostaje aktywna dzięki decyzji Rady Unii Europejskiej przedłużającej ją do <strong>4 marca 2027 roku</strong>. Podstawą jest decyzja wykonawcza 2024/1836 z czerwca 2024 r., która przedłuża mechanizm ochronny wynikający z dyrektywy 2001/55/WE dotyczącej tymczasowej ochrony w razie masowego napływu wysiedleńców.</p>
<p>Konflikt zbrojny na Ukrainie pozostaje głównym uzasadnieniem utrzymania systemu. Instytucje UE wskazują, że skala zagrożenia uniemożliwia bezpieczny powrót wielu osób do kraju pochodzenia.</p>`,
      },
      {
        id: "wygaszenie-specustawy",
        heading: "Wygaszenie specustawy i nowy system ochrony cudzoziemców w Polsce",
        content: `<p>Od <strong>5 marca 2026 r.</strong> obowiązuje nowa ustawa wygaszająca dotychczasową specustawę ukraińską z marca 2022 r. Zmiana ta przenosi mechanizmy ochrony czasowej do ogólnego systemu prawa migracyjnego Polski.</p>
<ul>
<li>Nowe przepisy nie likwidują ochrony czasowej</li>
<li>Zmieniają strukturę jej funkcjonowania</li>
<li>Mechanizmy przeniesiono do ustawy o udzielaniu cudzoziemcom ochrony z 2003 r.</li>
<li>Obywatele Ukrainy funkcjonują w jednym systemie razem z innymi chronionymi cudzoziemcami</li>
</ul>
<p>Prezydent Karol Nawrocki podpisał ustawę 19 lutego 2026 r., która kończy etap nadzwyczajnej pomocy.</p>`,
      },
      {
        id: "status-ukr",
        heading: "Status UKR i numer PESEL UKR pozostają podstawą legalnego pobytu",
        content: `<p>Status UKR wciąż stanowi główne potwierdzenie korzystania z ochrony czasowej. Numer PESEL UKR pełni rolę identyfikatora administracyjnego potwierdzającego legalność pobytu.</p>
<p><strong>Kluczowy obowiązek:</strong> wniosek o nadanie numeru PESEL UKR musi zostać złożony w ciągu 30 dni od wjazdu do Polski. Brak rejestracji w terminie powoduje wygaśnięcie ochrony czasowej.</p>
<p>Status można stracić w sytuacjach takich jak:</p>
<ul>
<li>Wyjazd z Polski na okres dłuższy niż 30 dni</li>
<li>Niespełnienie obowiązków rejestracyjnych</li>
</ul>
<p>Osoby już przebywające w Polsce mogą zachować legalność pobytu aż do 4 marca 2027 r.</p>`,
      },
      {
        id: "diia-mobywatel",
        heading: "Elektroniczna karta DIIA i aplikacja mObywatel jako nowe dokumenty pobytowe",
        content: `<p>System cyfryzacji potwierdzania legalności pobytu zastępuje papierowe zaświadczenia. Główne narzędzia to:</p>
<ul>
<li><strong>Elektroniczna karta DIIA</strong> — cyfrowe potwierdzenie ochrony czasowej</li>
<li><strong>Aplikacja mObywatel</strong> — dokument mobilny zawierający dane z rejestru PESEL</li>
</ul>
<p>Cel cyfryzacji to przyspieszenie obsługi administracyjnej oraz ułatwienie weryfikacji statusu przez pracodawców i urzędy.</p>`,
      },
      {
        id: "zatrudnienie",
        heading: "Zatrudnienie obywateli Ukrainy po zmianach w 2026 roku",
        content: `<p>Obywatele Ukrainy mogą nadal pracować w Polsce <strong>bez zezwolenia na pracę</strong>. Procedura wymaga:</p>
<ul>
<li>Powiadomienia pracodawcy składanego w ciągu 7 dni od rozpoczęcia pracy</li>
<li>Rejestracji w urzędzie pracy</li>
<li>Utrzymania uproszczonej procedury w ogólnym systemie zatrudniania cudzoziemców</li>
</ul>
<p>Okres przejściowy pozwala pracodawcom na stosowanie mechanizmu powiadomienia wobec obywateli Ukrainy przebywających legalnie, ale poza ochroną czasową.</p>
<p>Dane GUS wskazują, że ponad milion cudzoziemców pracuje w Polsce, znaczną część stanowiąc obywatele ukraińscy.</p>`,
      },
      {
        id: "pomoc-socjalna",
        heading: "Ograniczenia pomocy socjalnej i zmiany w dostępie do opieki zdrowotnej",
        content: `<p>Nowy system rezygnuje z powszechnej pomocy finansowanej z budżetu państwa, skupiając się na wsparciu osób w szczególnie trudnej sytuacji.</p>
<p>Świadczenia będą przyznawane głównie w formie:</p>
<ul>
<li>Schronienia</li>
<li>Posiłków</li>
<li>Niezbędnego ubrania</li>
<li>Zasiłków celowych</li>
</ul>
<h3>Opieka zdrowotna</h3>
<p>Bezpłatna opieka medyczna finansowana przez państwo przysługuje przede wszystkim:</p>
<ul>
<li>Dzieciom</li>
<li>Kobietom w ciąży</li>
<li>Osobom z poważnymi obrażeniami wojennymi</li>
<li>Ofiarom przemocy</li>
</ul>
<p>Pozostali obywatele Ukrainy korzystają z publicznej opieki na zasadach jak inni cudzoziemcy — poprzez ubezpieczenie wynikające z zatrudnienia lub prowadzenia działalności.</p>`,
      },
      {
        id: "dzialalnosc",
        heading: "Działalność gospodarcza obywateli Ukrainy po zmianach",
        content: `<p>Osoby posiadające status UKR mogą prowadzić działalność gospodarczą na zasadach zbliżonych do obywateli polskich.</p>
<p>Istotne rozróżnienie:</p>
<ul>
<li>Osoby, które rozpoczęły działalność <strong>przed 5 marca 2026 r.</strong>, mogą ją kontynuować na dotychczasowych zasadach</li>
<li>Nowi przedsiębiorcy spoza ochrony czasowej muszą spełniać ogólne warunki dla cudzoziemców</li>
<li>Rozwiązanie ma charakter przejściowy zapewniający stabilność gospodarczą</li>
</ul>`,
      },
      {
        id: "po-2027",
        heading: "Co dalej z ochroną czasową po 2027 roku",
        content: `<p>Obecna ochrona czasowa obowiązuje do <strong>4 marca 2027 r.</strong>, wynika to z dyrektywy 2001/55/WE, która przewiduje maksymalnie trzyletnią tymczasową ochronę.</p>
<p>Po tym terminie ochrona powinna zostać zastąpiona standardowymi formami legalnego pobytu:</p>
<ul>
<li>Zezwoleniami na pobyt czasowy (karta pobytu czasowego)</li>
<li>Statusem rezydenta długoterminowego (karta stałego pobytu)</li>
<li>Zezwoleniami związanymi z pracą, edukacją lub prowadzeniem działalności</li>
</ul>
<p>Instytucje UE wskazują, że państwa członkowskie powinny przygotować mechanizmy umożliwiające przejście z ochrony czasowej do standardowych form pobytu. Nasz zespół pomoże Ci w przejściu na odpowiedni tytuł pobytowy — <a href="/pl/uslugi">sprawdź nasze usługi</a>.</p>`,
      },
      {
        id: "faq",
        heading: "Najczęściej zadawane pytania",
        content: `<div class="faq-list">
<details>
<summary><strong>Co się stanie, jeśli nie złożę wniosku o PESEL UKR w ciągu 30 dni?</strong></summary>
<p>Niezłożenie wniosku może skutkować wygaśnięciem ochrony czasowej, co będzie traktowane jako rezygnacja z tego statusu. Rejestracji należy dokonać możliwie szybko po wjeździe do Polski.</p>
</details>
<details>
<summary><strong>Czy papierowe zaświadczenie o ochronie czasowej nadal obowiązuje?</strong></summary>
<p>Papierowe zaświadczenia będą stopniowo zastępowane elektroniczną kartą DIIA. Nowe rozwiązanie umożliwi cyfrowe potwierdzanie statusu oraz tożsamości, a w przyszłości także poprzez aplikację mObywatel.</p>
</details>
<details>
<summary><strong>Czy mogę ubiegać się o kartę pobytu będąc objętym ochroną czasową?</strong></summary>
<p>Tak, przedłużenie legalności pobytu daje czas na złożenie wniosku o kartę pobytu czasowego lub inne tytuły pobytowe do 4 marca 2027 r., co umożliwi przejście do standardowych procedur migracyjnych.</p>
</details>
<details>
<summary><strong>Czy wszyscy uchodźcy mogą korzystać z zakwaterowania zbiorowego?</strong></summary>
<p>Planowane zmiany ograniczają tę możliwość głównie do osób z grup szczególnie wrażliwych — osoby starsze, z niepełnosprawnościami czy rodziny w trudnej sytuacji życiowej.</p>
</details>
<details>
<summary><strong>Czy po zmianach nadal przysługują świadczenia socjalne i opieka zdrowotna?</strong></summary>
<p>Osoby objęte ochroną czasową zachowują dostęp do podstawowych świadczeń, w tym opieki zdrowotnej i świadczeń rodzinnych. Część programów pomocowych może zostać ograniczona lub zmodyfikowana.</p>
</details>
</div>`,
      },
    ],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | null {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

export function getAllBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
