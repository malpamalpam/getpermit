import type { BlogPost } from "./blog";

/**
 * Nowe artykuły blogowe — Sprint 1 (5 artykułów).
 * Przepisane pod frazy kluczowe getpermit.pl, ≥70% unikalności vs źródło.
 */
export const NEW_BLOG_POSTS: BlogPost[] = [
  // =========================================================================
  // ARTYKUŁ 1: Karta pobytu czasowego
  // Primary keyword: karta pobytu czasowego
  // =========================================================================
  {
    slug: "karta-pobytu-czasowego-poradnik-2026",
    title: "Karta pobytu czasowego w 2026 roku \u2014 kompletny poradnik krok po kroku",
    description:
      "Jak uzyska\u0107 kart\u0119 pobytu czasowego w Polsce w 2026? Wymagane dokumenty, koszty, czas oczekiwania i najcz\u0119stsze b\u0142\u0119dy. Praktyczny przewodnik od ekspert\u00f3w getpermit.pl.",
    date: "2026-04-15",
    imageUrl: "https://images.unsplash.com/photo-1473163928189-364b2c4e1135?w=1600&q=80",
    imageAlt: "Karta pobytu czasowego w Polsce \u2014 dokumenty i procedura legalizacji pobytu",
    author: "Grzegorz St\u0119pie\u0144, UTM Group",
    toc: [
      { id: "czym-jest", title: "Czym jest karta pobytu czasowego" },
      { id: "kto-moze", title: "Kto mo\u017ce z\u0142o\u017cy\u0107 wniosek" },
      { id: "dokumenty", title: "Wymagane dokumenty" },
      { id: "procedura", title: "Procedura krok po kroku" },
      { id: "koszty", title: "Koszty i op\u0142aty w 2026" },
      { id: "czas-oczekiwania", title: "Ile trwa rozpatrzenie wniosku" },
      { id: "najczestsze-bledy", title: "Najcz\u0119stsze b\u0142\u0119dy we wnioskach" },
      { id: "faq", title: "Najcz\u0119\u015bciej zadawane pytania" },
    ],
    sections: [
      {
        id: "czym-jest",
        heading: "Czym jest karta pobytu czasowego i do czego uprawnia",
        content: `<p>Karta pobytu czasowego to dokument wydawany cudzoziemcom, kt\u00f3rzy zamierzaj\u0105 przebywa\u0107 w Polsce d\u0142u\u017cej ni\u017c 3 miesi\u0105ce. Stanowi potwierdzenie legalnego pobytu i pozwala na swobodne przekraczanie granic strefy Schengen bez dodatkowej wizy.</p>
<p>Zezwolenie na pobyt czasowy mo\u017ce by\u0107 udzielone na okres od 3 miesi\u0119cy do <strong>3 lat</strong>. Dokument uprawnia do:</p>
<ul>
<li>Legalnego zamieszkiwania na terytorium Polski</li>
<li>Podejmowania pracy (je\u015bli zezwolenie obejmuje prac\u0119)</li>
<li>Podr\u00f3\u017cowania po strefie Schengen do 90 dni w ci\u0105gu 180 dni</li>
<li>Korzystania z publicznej opieki zdrowotnej (przy op\u0142aconym ubezpieczeniu)</li>
<li>Zameldowania si\u0119 na pobyt czasowy</li>
</ul>
<p>Podstaw\u0119 prawn\u0105 stanowi <strong>ustawa o cudzoziemcach z 12 grudnia 2013 r.</strong> (Dz.U. 2024 poz. 769 z p\u00f3\u017an. zm.).</p>`,
      },
      {
        id: "kto-moze",
        heading: "Kto mo\u017ce ubiega\u0107 si\u0119 o kart\u0119 pobytu czasowego w Polsce",
        content: `<p>Wniosek o udzielenie zezwolenia na pobyt czasowy mo\u017ce z\u0142o\u017cy\u0107 ka\u017cdy cudzoziemiec przebywaj\u0105cy legalnie na terytorium Polski, kt\u00f3ry zamierza przebywa\u0107 tu d\u0142u\u017cej ni\u017c 3 miesi\u0105ce. Najcz\u0119stsze cele pobytu to:</p>
<ul>
<li><strong>Praca</strong> \u2014 zar\u00f3wno na umow\u0119 o prac\u0119, jak i w ramach jednolitego zezwolenia na pobyt i prac\u0119</li>
<li><strong>Prowadzenie dzia\u0142alno\u015bci gospodarczej</strong> \u2014 sp\u00f3\u0142ka z o.o., JDG lub oddzia\u0142 firmy zagranicznej</li>
<li><strong>Studia</strong> \u2014 studia stacjonarne na polskiej uczelni wy\u017cszej</li>
<li><strong>\u0141\u0105czenie z rodzin\u0105</strong> \u2014 do\u0142\u0105czenie do ma\u0142\u017conka lub rodzica posiadaj\u0105cego zezwolenie na pobyt</li>
<li><strong>Ofiary handlu lud\u017ami</strong> oraz <strong>okoliczno\u015bci wymagaj\u0105ce kr\u00f3tkotrwa\u0142ego pobytu</strong></li>
</ul>
<p>Wniosek nale\u017cy z\u0142o\u017cy\u0107 <strong>najp\u00f3\u017aniej w ostatnim dniu legalnego pobytu</strong>. Od 2026 roku sk\u0142adanie wniosk\u00f3w odbywa si\u0119 wy\u0142\u0105cznie przez <a href="/pl/blog/wnioski-pobytowe-mos-2026">system MOS (Modu\u0142 Obs\u0142ugi Spraw)</a>.</p>`,
      },
      {
        id: "dokumenty",
        heading: "Wymagane dokumenty do wniosku o kart\u0119 pobytu czasowego",
        content: `<p>Lista dokument\u00f3w zale\u017cy od celu pobytu. Poni\u017cej przedstawiamy dokumenty wsp\u00f3lne dla wi\u0119kszo\u015bci przypadk\u00f3w:</p>
<table>
<thead><tr><th>Dokument</th><th>Uwagi</th></tr></thead>
<tbody>
<tr><td>Wype\u0142niony wniosek</td><td>Sk\u0142adany wy\u0142\u0105cznie przez system MOS</td></tr>
<tr><td>Fotografia cyfrowa</td><td>Za\u0142\u0105czana do wniosku w systemie MOS</td></tr>
<tr><td>Kserokopia paszportu</td><td>Wszystkie zapisane strony</td></tr>
<tr><td>Potwierdzenie uiszczenia op\u0142aty skarbowej</td><td>340 z\u0142 (lub 440 z\u0142 w przypadku pracy)</td></tr>
<tr><td>Ubezpieczenie zdrowotne</td><td>Na ca\u0142y okres pobytu lub umowa z pracodawc\u0105</td></tr>
<tr><td>Potwierdzenie zamieszkania</td><td>Umowa najmu, meldunek lub o\u015bwiadczenie w\u0142a\u015bciciela</td></tr>
<tr><td>\u0179r\u00f3d\u0142o dochodu</td><td>Umowa o prac\u0119, za\u015bwiadczenie z banku, zeznanie PIT</td></tr>
</tbody>
</table>
<p>Dodatkowe dokumenty dla os\u00f3b pracuj\u0105cych: za\u015bwiadczenie od pracodawcy, za\u0142\u0105cznik nr 1. <a href="/pl/uslugi/zezwolenie-na-pobyt-czasowy">Sprawd\u017a pe\u0142n\u0105 list\u0119 dla Twojego przypadku</a>.</p>`,
      },
      {
        id: "procedura",
        heading: "Procedura uzyskania karty pobytu \u2014 krok po kroku",
        content: `<p>Proces uzyskania karty pobytu czasowego sk\u0142ada si\u0119 z nast\u0119puj\u0105cych etap\u00f3w:</p>
<ol>
<li><strong>Przygotowanie dokument\u00f3w</strong> \u2014 skompletowanie wszystkich wymaganych za\u0142\u0105cznik\u00f3w</li>
<li><strong>Z\u0142o\u017cenie wniosku</strong> \u2014 wy\u0142\u0105cznie przez system MOS (od 27 kwietnia 2025 r.)</li>
<li><strong>Pobranie odcisk\u00f3w palc\u00f3w</strong> \u2014 biometria pobierana w urz\u0119dzie</li>
<li><strong>Otrzymanie stempla w paszporcie</strong> \u2014 potwierdzenie z\u0142o\u017cenia wniosku, legalizuje pobyt na czas post\u0119powania</li>
<li><strong>Oczekiwanie na decyzj\u0119</strong> \u2014 urz\u0105d mo\u017ce wzywa\u0107 do uzupe\u0142nienia dokument\u00f3w</li>
<li><strong>Odbi\u00f3r karty pobytu</strong> \u2014 po pozytywnej decyzji, karta jest produkowana przez urz\u0105d (czas zale\u017cy od obci\u0105\u017cenia)</li>
</ol>
<p>Wa\u017cne: stempel w paszporcie pozwala na legalne przebywanie i prac\u0119 w Polsce przez ca\u0142y czas trwania post\u0119powania. Jest to kluczowa informacja dla pracodawc\u00f3w.</p>`,
      },
      {
        id: "koszty",
        heading: "Koszty uzyskania karty pobytu czasowego w 2026 roku",
        content: `<p>Op\u0142aty zwi\u0105zane z kart\u0105 pobytu czasowego w 2026 roku:</p>
<table>
<thead><tr><th>Op\u0142ata</th><th>Kwota</th></tr></thead>
<tbody>
<tr><td>Op\u0142ata skarbowa \u2014 pobyt czasowy</td><td><strong>340 z\u0142</strong></td></tr>
<tr><td>Op\u0142ata skarbowa \u2014 pobyt i praca (jednolite zezwolenie)</td><td><strong>440 z\u0142</strong></td></tr>
<tr><td>Wydanie karty pobytu (plastikowy dokument)</td><td><strong>100 z\u0142</strong></td></tr>
<tr><td>T\u0142umaczenia przysi\u0119g\u0142e dokument\u00f3w (orientacyjnie)</td><td>50\u2013150 z\u0142 za stron\u0119</td></tr>
</tbody>
</table>
<p>\u0141\u0105czny koszt procesu, w\u0142\u0105cznie z t\u0142umaczeniami i pomoc\u0105 prawn\u0105, wynosi zwykle <strong>od 800 do 2500 z\u0142</strong> w zale\u017cno\u015bci od z\u0142o\u017cono\u015bci sprawy. <a href="/pl/kontakt">Skontaktuj si\u0119 z nami po bezp\u0142atn\u0105 wycen\u0119</a>.</p>`,
      },
      {
        id: "czas-oczekiwania",
        heading: "Ile trwa rozpatrzenie wniosku o kart\u0119 pobytu czasowego",
        content: `<p>Czas oczekiwania na decyzj\u0119 w sprawie karty pobytu czasowego <strong>zale\u017cy od indywidualnej sprawy i obci\u0105\u017cenia urz\u0119du wojew\u00f3dzkiego</strong>. Ka\u017cdy urz\u0105d rozpatruje wnioski w r\u00f3\u017cnym tempie, a na czas oczekiwania wp\u0142ywa m.in. kompletno\u015b\u0107 dokumentacji i z\u0142o\u017cono\u015b\u0107 sprawy.</p>
<p>W przypadku przekroczenia ustawowego terminu rozpatrzenia wniosku przys\u0142uguje prawo do z\u0142o\u017cenia <strong>ponaglenia</strong> do wojewody. W przypadku dalszej bezczynno\u015bci mo\u017cna wnie\u015b\u0107 skarg\u0119 do Wojew\u00f3dzkiego S\u0105du Administracyjnego. <a href="/pl/uslugi/ponaglenia-i-odwolania">Pomagamy w procedurze odwo\u0142awczej</a>.</p>`,
      },
      {
        id: "najczestsze-bledy",
        heading: "Najcz\u0119stsze b\u0142\u0119dy we wnioskach o kart\u0119 pobytu",
        content: `<p>Na podstawie naszego do\u015bwiadczenia z ponad 5000 spraw, najcz\u0119stsze b\u0142\u0119dy to:</p>
<ol>
<li><strong>Z\u0142o\u017cenie wniosku po terminie</strong> \u2014 wniosek musi by\u0107 z\u0142o\u017cony przed wyga\u015bni\u0119ciem wizy lub ruchu bezwizowego</li>
<li><strong>Brak t\u0142umacze\u0144 przysi\u0119g\u0142ych</strong> \u2014 wszystkie dokumenty zagraniczne wymagaj\u0105 t\u0142umaczenia przez t\u0142umacza przysi\u0119g\u0142ego</li>
<li><strong>Niekompletna dokumentacja</strong> \u2014 brak za\u015bwiadcze\u0144 od pracodawcy lub wymaganych za\u0142\u0105cznik\u00f3w</li>
<li><strong>B\u0142\u0119dy w formularzu</strong> \u2014 literowe b\u0142\u0119dy w danych osobowych powoduj\u0105 wezwania do uzupe\u0142nienia</li>
<li><strong>Brak ubezpieczenia zdrowotnego</strong> \u2014 cz\u0119sto pomijane w przypadku zleceniobiorc\u00f3w</li>
</ol>
<p>Ka\u017cdy z tych b\u0142\u0119d\u00f3w wyd\u0142u\u017ca post\u0119powanie o tygodnie lub miesi\u0105ce. <a href="/pl/uslugi/zezwolenie-na-pobyt-czasowy">Profesjonalna pomoc eliminuje ryzyko odmowy</a>.</p>`,
      },
      {
        id: "faq",
        heading: "Najcz\u0119\u015bciej zadawane pytania o kart\u0119 pobytu czasowego",
        content: `<div class="faq-list">
<details><summary><strong>Ile kosztuje karta pobytu czasowego w 2026 roku?</strong></summary>
<p>Op\u0142ata skarbowa wynosi 340 z\u0142 (lub 440 z\u0142 przy jednolitym zezwoleniu na pobyt i prac\u0119). Dodatkowo 100 z\u0142 za wydanie karty. \u0141\u0105cznie z t\u0142umaczeniami i obs\u0142ug\u0105 prawn\u0105 koszt wynosi od 800 do 2500 z\u0142.</p></details>
<details><summary><strong>Czy mog\u0119 pracowa\u0107 czekaj\u0105c na kart\u0119 pobytu?</strong></summary>
<p>Tak. Stempel w paszporcie potwierdzaj\u0105cy z\u0142o\u017cenie wniosku uprawnia do legalnej pracy na warunkach okre\u015blonych we wniosku.</p></details>
<details><summary><strong>Co je\u015bli wniosek zostanie odrzucony?</strong></summary>
<p>Od decyzji odmownej przys\u0142uguje odwo\u0142anie do Szefa Urz\u0119du do Spraw Cudzoziemc\u00f3w w terminie 14 dni. Pomagamy w procedurze odwo\u0142awczej z 98% skuteczno\u015bci\u0105.</p></details>
<details><summary><strong>Jak d\u0142ugo wa\u017cna jest karta pobytu czasowego?</strong></summary>
<p>Karta pobytu czasowego jest wydawana na okres od 3 miesi\u0119cy do 3 lat, zgodnie z celem pobytu okre\u015blonym we wniosku.</p></details>
<details><summary><strong>Czy musz\u0119 mie\u0107 zameldowanie?</strong></summary>
<p>Nie jest wymagane zameldowanie, ale nale\u017cy wykaza\u0107 miejsce zamieszkania \u2014 np. umow\u0105 najmu lub o\u015bwiadczeniem w\u0142a\u015bciciela lokalu.</p></details>
</div>`,
      },
    ],
  },

  // =========================================================================
  // ARTYKUŁ 2: Karta stałego pobytu
  // Primary keyword: karta stałego pobytu
  // =========================================================================
  {
    slug: "karta-stalego-pobytu-jak-uzyskac",
    title: "Karta sta\u0142ego pobytu w Polsce \u2014 kto mo\u017ce j\u0105 uzyska\u0107 i jak z\u0142o\u017cy\u0107 wniosek",
    description:
      "Karta sta\u0142ego pobytu daje prawo do bezterminowego zamieszkania w Polsce. Sprawd\u017a warunki, dokumenty i koszty. Poradnik od ekspert\u00f3w getpermit.pl.",
    date: "2026-04-14",
    imageUrl: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=1600&q=80",
    imageAlt: "Karta sta\u0142ego pobytu w Polsce \u2014 procedura uzyskania dokumentu pobytowego",
    author: "Grzegorz St\u0119pie\u0144, UTM Group",
    toc: [
      { id: "czym-jest-staly", title: "Czym jest karta sta\u0142ego pobytu" },
      { id: "warunki", title: "Warunki uzyskania" },
      { id: "dokumenty-staly", title: "Wymagane dokumenty" },
      { id: "koszty-staly", title: "Koszty i terminy" },
      { id: "roznice", title: "R\u00f3\u017cnice: pobyt sta\u0142y vs rezydent UE" },
      { id: "faq-staly", title: "FAQ" },
    ],
    sections: [
      {
        id: "czym-jest-staly",
        heading: "Czym jest karta sta\u0142ego pobytu i jakie daje prawa",
        content: `<p>Karta sta\u0142ego pobytu (zezwolenie na pobyt sta\u0142y) to dokument potwierdzaj\u0105cy prawo cudzoziemca do <strong>bezterminowego zamieszkiwania w Polsce</strong>. W odr\u00f3\u017cnieniu od karty pobytu czasowego, pobyt sta\u0142y nie wymaga odnawiania co kilka lat.</p>
<p>Posiadacz karty sta\u0142ego pobytu ma prawo do:</p>
<ul>
<li>Bezterminowego pobytu w Polsce</li>
<li>Podejmowania pracy bez zezwolenia na prac\u0119</li>
<li>Prowadzenia dzia\u0142alno\u015bci gospodarczej na r\u00f3wnych zasadach z obywatelami RP</li>
<li>Korzystania z publicznej opieki zdrowotnej i edukacji</li>
<li>Ubiegania si\u0119 o obywatelstwo polskie po spe\u0142nieniu warunk\u00f3w</li>
</ul>`,
      },
      {
        id: "warunki",
        heading: "Warunki uzyskania zezwolenia na pobyt sta\u0142y",
        content: `<p>O pobyt sta\u0142y mo\u017ce ubiega\u0107 si\u0119 cudzoziemiec, kt\u00f3ry spe\u0142nia <strong>jeden z poni\u017cszych warunk\u00f3w</strong>:</p>
<ul>
<li><strong>Polskie pochodzenie</strong> \u2014 potwierdzenie korzeni polskich (np. rodzice lub dziadkowie byli obywatelami polskimi)</li>
<li><strong>Karta Polaka</strong> \u2014 posiadacz Karty Polaka zamierzaj\u0105cy osiedli\u0107 si\u0119 w Polsce na sta\u0142e</li>
<li><strong>Ma\u0142\u017ce\u0144stwo z obywatelem RP</strong> \u2014 minimum 3 lata ma\u0142\u017ce\u0144stwa + 2 lata pobytu w Polsce na karcie czasowej</li>
<li><strong>Ofiara handlu lud\u017ami</strong> \u2014 w ramach ochrony prawnej</li>
<li><strong>Dziecko cudzoziemca</strong> z pobytem sta\u0142ym, urodzone w Polsce</li>
<li><strong>Pobyt na podstawie azylu</strong></li>
</ul>
<p>Wa\u017cne: pobyt sta\u0142y <strong>nie wymaga</strong> wcze\u015bniejszego 5-letniego pobytu w Polsce (to warunek dla rezydenta d\u0142ugoterminowego UE, nie dla pobytu sta\u0142ego).</p>
<p><a href="/pl/uslugi/pobyt-staly">Sprawd\u017a, czy kwalifikujesz si\u0119 \u2014 bezp\u0142atna konsultacja</a>.</p>`,
      },
      {
        id: "dokumenty-staly",
        heading: "Dokumenty wymagane do wniosku o pobyt sta\u0142y",
        content: `<p>Podstawowy zestaw dokument\u00f3w obejmuje:</p>
<ul>
<li>Wniosek z\u0142o\u017cony przez system MOS (Modu\u0142 Obs\u0142ugi Spraw)</li>
<li>Fotografia cyfrowa (do wniosku przez system MOS)</li>
<li>Kserokopia paszportu (wszystkie strony)</li>
<li>Potwierdzenie uiszczenia op\u0142aty skarbowej (640 z\u0142)</li>
<li>Dokumenty potwierdzaj\u0105ce podstaw\u0119 ubiegania si\u0119 o pobyt sta\u0142y:</li>
</ul>
<table>
<thead><tr><th>Podstawa</th><th>Dodatkowe dokumenty</th></tr></thead>
<tbody>
<tr><td>Polskie pochodzenie</td><td>Akty urodzenia rodzic\u00f3w/dziadk\u00f3w, dokumenty potwierdzaj\u0105ce polsko\u015b\u0107</td></tr>
<tr><td>Karta Polaka</td><td>Kopia Karty Polaka, dokumenty potwierdzaj\u0105ce zamiar osiedlenia</td></tr>
<tr><td>Ma\u0142\u017ce\u0144stwo</td><td>Akt ma\u0142\u017ce\u0144stwa, kopia karty czasowej, dokumenty ma\u0142\u017conka</td></tr>
</tbody>
</table>
<p>Wszystkie dokumenty zagraniczne wymagaj\u0105 <a href="/pl/uslugi/tlumaczenia-przysiegle-dokumentow">t\u0142umaczenia przysi\u0119g\u0142ego</a> na j\u0119zyk polski.</p>`,
      },
      {
        id: "koszty-staly",
        heading: "Koszty i czas oczekiwania na kart\u0119 sta\u0142ego pobytu",
        content: `<p>Op\u0142aty w 2026 roku:</p>
<ul>
<li>Op\u0142ata skarbowa: <strong>640 z\u0142</strong></li>
<li>Wydanie karty: <strong>100 z\u0142</strong></li>
<li>T\u0142umaczenia przysi\u0119g\u0142e: od 50 z\u0142 za stron\u0119</li>
</ul>
<p>Czas oczekiwania <strong>zale\u017cy od indywidualnej sprawy i obci\u0105\u017cenia urz\u0119du</strong>. Sprawy z Kart\u0105 Polaka rozpatrywane s\u0105 zwykle szybciej.</p>
<p><a href="/pl/kontakt">Um\u00f3w bezp\u0142atn\u0105 konsultacj\u0119 \u2014 przygotujemy Tw\u00f3j wniosek profesjonalnie</a>.</p>`,
      },
      {
        id: "roznice",
        heading: "Pobyt sta\u0142y a rezydent d\u0142ugoterminowy UE \u2014 r\u00f3\u017cnice",
        content: `<p>To dwa r\u00f3\u017cne statusy prawne, cz\u0119sto mylone:</p>
<table>
<thead><tr><th>Cecha</th><th>Pobyt sta\u0142y</th><th>Rezydent d\u0142ugoterminowy UE</th></tr></thead>
<tbody>
<tr><td>Wymagany pobyt w PL</td><td>Nie zawsze (zale\u017cy od podstawy)</td><td>Min. 5 lat nieprzerwanego pobytu</td></tr>
<tr><td>Dost\u0119p do rynku pracy UE</td><td>Tylko Polska</td><td>Prawo do pracy w innych krajach UE</td></tr>
<tr><td>Op\u0142ata skarbowa</td><td>640 z\u0142</td><td>640 z\u0142</td></tr>
<tr><td>Podstawa prawna</td><td>Art. 195 ustawy o cudzoziemcach</td><td>Art. 211 ustawy o cudzoziemcach</td></tr>
</tbody>
</table>
<p><a href="/pl/uslugi/rezydent-dlugoterminowy-ue">Dowiedz si\u0119 wi\u0119cej o statusie rezydenta UE</a>.</p>`,
      },
      {
        id: "faq-staly",
        heading: "Najcz\u0119\u015bciej zadawane pytania o kart\u0119 sta\u0142ego pobytu",
        content: `<div class="faq-list">
<details><summary><strong>Czy karta sta\u0142ego pobytu daje prawo do polskiego obywatelstwa?</strong></summary>
<p>Sama karta nie daje automatycznie obywatelstwa, ale po uzyskaniu pobytu sta\u0142ego mo\u017cna ubiega\u0107 si\u0119 o obywatelstwo po spe\u0142nieniu dodatkowych warunk\u00f3w (np. egzamin z j\u0119zyka polskiego na poziomie B1).</p></details>
<details><summary><strong>Ile kosztuje karta sta\u0142ego pobytu?</strong></summary>
<p>Op\u0142ata skarbowa: 640 z\u0142 + 100 z\u0142 za wydanie karty. Z us\u0142ug\u0105 prawn\u0105 i t\u0142umaczeniami \u0142\u0105czny koszt to zwykle 1200\u20133000 z\u0142.</p></details>
<details><summary><strong>Czy musz\u0119 zna\u0107 j\u0119zyk polski?</strong></summary>
<p>Znajomo\u015b\u0107 j\u0119zyka polskiego nie jest wymagana do uzyskania pobytu sta\u0142ego (w odr\u00f3\u017cnieniu od obywatelstwa, gdzie wymagany jest certyfikat B1).</p></details>
<details><summary><strong>Czy mog\u0119 straci\u0107 pobyt sta\u0142y?</strong></summary>
<p>Tak, je\u015bli opuscisz Polsk\u0119 na okres d\u0142u\u017cszy ni\u017c 6 lat lub stanowisz zagro\u017cenie dla bezpiecze\u0144stwa pa\u0144stwa.</p></details>
</div>`,
      },
    ],
  },

  // =========================================================================
  // ARTYKUŁ 3: Niebieska Karta UE (EU Blue Card) 2026
  // Primary keyword: niebieska karta UE
  // =========================================================================
  {
    slug: "niebieska-karta-ue-blue-card-2026",
    title: "Niebieska Karta UE (EU Blue Card) w Polsce 2026 \u2014 nowe zasady i wymagania",
    description:
      "EU Blue Card po zmianach od 2025. Kto mo\u017ce uzyska\u0107 Niebiesk\u0105 Kart\u0119 UE w Polsce? Wymagania, dokumenty, koszty i korzy\u015bci mobilno\u015bci w UE. Poradnik getpermit.pl.",
    date: "2026-04-13",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80",
    imageAlt: "EU Blue Card \u2014 Niebieska Karta UE dla specjalist\u00f3w w Polsce",
    author: "Grzegorz St\u0119pie\u0144, UTM Group",
    toc: [
      { id: "czym-jest-blue", title: "Czym jest Niebieska Karta UE" },
      { id: "nowe-zasady", title: "Zmiany od 2025 roku" },
      { id: "wymagania-blue", title: "Wymagania dla kandydat\u00f3w" },
      { id: "dokumenty-blue", title: "Wymagane dokumenty" },
      { id: "mobilnosc", title: "Mobilno\u015b\u0107 w UE" },
      { id: "blue-vs-czasowy", title: "Blue Card vs zezwolenie na pobyt i prac\u0119" },
      { id: "faq-blue", title: "FAQ" },
    ],
    sections: [
      {
        id: "czym-jest-blue",
        heading: "Czym jest Niebieska Karta UE i dlaczego warto j\u0105 mie\u0107",
        content: `<p>Niebieska Karta UE (EU Blue Card) to zezwolenie na pobyt i prac\u0119 przeznaczone dla <strong>wysoko wykwalifikowanych pracownik\u00f3w spoza Unii Europejskiej</strong>. To unijny odpowiednik ameryka\u0144skiej Green Card, zaprojektowany aby przyci\u0105gn\u0105\u0107 specjalist\u00f3w do Europy.</p>
<p>G\u0142\u00f3wne zalety EU Blue Card:</p>
<ul>
<li><strong>Mobilno\u015b\u0107 w UE</strong> \u2014 po 12 miesi\u0105cach mo\u017cliwo\u015b\u0107 przeniesienia si\u0119 do innego pa\u0144stwa cz\u0142onkowskiego</li>
<li><strong>\u0141atwiejsze \u0142\u0105czenie rodzin</strong> \u2014 uproszczona procedura sprowadzenia ma\u0142\u017conka i dzieci</li>
<li><strong>Szybsza \u015bcie\u017cka do rezydenta UE</strong> \u2014 mo\u017cliwo\u015b\u0107 sumowania okres\u00f3w pobytu w r\u00f3\u017cnych krajach UE</li>
<li><strong>Uproszczona procedura</strong> \u2014 mniej wymog\u00f3w formalnych ni\u017c przy standardowym zezwoleniu na prac\u0119</li>
</ul>`,
      },
      {
        id: "nowe-zasady",
        heading: "Nowe zasady EU Blue Card od 2025 roku \u2014 co si\u0119 zmieni\u0142o",
        content: `<p>Od <strong>1 czerwca 2025 roku</strong> obowi\u0105zuj\u0105 zmienione przepisy wynikaj\u0105ce z implementacji dyrektywy 2021/1883. Kluczowe zmiany:</p>
<ul>
<li><strong>Obni\u017cony pr\u00f3g wynagrodzenia</strong> \u2014 zamiast 1,5-krotno\u015bci \u015bredniego wynagrodzenia, wymagane jest 1,0-krotno\u015b\u0107 (w sektorach deficytowych nawet 0,8)</li>
<li><strong>Rozszerzony katalog kwalifikacji</strong> \u2014 opr\u00f3cz dyplomu wy\u017cszej uczelni, akceptowane jest minimum 3 lata do\u015bwiadczenia zawodowego w bran\u017cy IT</li>
<li><strong>Kontrakty kr\u00f3tkoterminowe</strong> \u2014 umowa na minimum 6 miesi\u0119cy (wcze\u015bniej 12)</li>
<li><strong>Mobilno\u015b\u0107 kr\u00f3tkoterminowa</strong> \u2014 do 90 dni pracy w innym pa\u0144stwie UE bez dodatkowych formalno\u015bci</li>
<li><strong>Samozatrudnienie</strong> \u2014 ograniczona mo\u017cliwo\u015b\u0107 r\u00f3wnoleg\u0142ego prowadzenia dzia\u0142alno\u015bci</li>
</ul>
<p>Te zmiany czyni\u0105 Blue Card bardziej dost\u0119pn\u0105, szczeg\u00f3lnie dla specjalist\u00f3w IT i in\u017cynier\u00f3w.</p>`,
      },
      {
        id: "wymagania-blue",
        heading: "Wymagania do uzyskania Niebieskiej Karty UE w Polsce",
        content: `<p>Aby uzyska\u0107 EU Blue Card, musisz spe\u0142nia\u0107 \u0142\u0105cznie nast\u0119puj\u0105ce warunki:</p>
<ol>
<li><strong>Wy\u017csze wykszta\u0142cenie</strong> (dyplom uko\u0144czenia studi\u00f3w wy\u017cszych, min. 3-letni cykl) <strong>lub min. 3 lata do\u015bwiadczenia</strong> w zawodach IT (po zmianach 2025)</li>
<li><strong>Umowa o prac\u0119</strong> na co najmniej 6 miesi\u0119cy z polskim pracodawc\u0105</li>
<li><strong>Wynagrodzenie</strong> r\u00f3wne lub wy\u017csze ni\u017c <strong>1,0-krotno\u015b\u0107</strong> przeci\u0119tnego rocznego wynagrodzenia (ok. 7500 z\u0142 brutto/miesi\u0105c w 2026)</li>
<li><strong>Ubezpieczenie zdrowotne</strong></li>
<li><strong>Miejsce zamieszkania</strong> w Polsce</li>
</ol>
<p>Specjali\u015bci IT z 3-letnim do\u015bwiadczeniem (programi\u015bci, DevOps, Data Science, cybersecurity) mog\u0105 ubiega\u0107 si\u0119 o Blue Card <strong>bez dyplomu uczelni wy\u017cszej</strong>. <a href="/pl/uslugi/eu-blue-card">Sprawd\u017a szczeg\u00f3\u0142y</a>.</p>`,
      },
      {
        id: "dokumenty-blue",
        heading: "Dokumenty wymagane do wniosku o EU Blue Card",
        content: `<p>Do wniosku nale\u017cy do\u0142\u0105czy\u0107:</p>
<ul>
<li>Wniosek z\u0142o\u017cony przez system MOS (Modu\u0142 Obs\u0142ugi Spraw)</li>
<li>Fotografia cyfrowa (do wniosku przez system MOS)</li>
<li>Kserokopia paszportu</li>
<li>Umowa o prac\u0119 lub promesa zatrudnienia</li>
<li>Dyplom uczelni wy\u017cszej (z nostryfikacj\u0105 je\u015bli wymagana) <strong>lub</strong> potwierdzenie 3-letniego do\u015bwiadczenia w IT</li>
<li>Za\u015bwiadczenie o wynagrodzeniu spe\u0142niaj\u0105cym pr\u00f3g</li>
<li>Potwierdzenie ubezpieczenia zdrowotnego</li>
<li>Potwierdzenie zamieszkania</li>
<li>Op\u0142ata skarbowa: <strong>440 z\u0142</strong> + 100 z\u0142 za wydanie karty</li>
</ul>`,
      },
      {
        id: "mobilnosc",
        heading: "Mobilno\u015b\u0107 w Unii Europejskiej z Blue Card",
        content: `<p>Jedn\u0105 z najwi\u0119kszych zalet Niebieskiej Karty UE jest <strong>mobilno\u015b\u0107 mi\u0119dzy krajami UE</strong>:</p>
<ul>
<li><strong>Kr\u00f3tkoterminowa</strong> (do 90 dni) \u2014 podr\u00f3\u017ce s\u0142u\u017cbowe bez dodatkowych formalno\u015bci</li>
<li><strong>D\u0142ugoterminowa</strong> \u2014 po 12 miesi\u0105cach pobytu z Blue Card w Polsce mo\u017cesz ubiega\u0107 si\u0119 o Blue Card w innym pa\u0144stwie UE na uproszczonych zasadach</li>
<li><strong>Sumowanie okres\u00f3w</strong> \u2014 czas pobytu z Blue Card w r\u00f3\u017cnych krajach UE sumuje si\u0119 do wymaganych 5 lat pobytu przy ubieganiu si\u0119 o status rezydenta d\u0142ugoterminowego</li>
</ul>
<p>To istotna przewaga nad zwyk\u0142ym zezwoleniem na pobyt i prac\u0119, kt\u00f3re nie daje mobilno\u015bci w UE.</p>`,
      },
      {
        id: "blue-vs-czasowy",
        heading: "EU Blue Card vs zezwolenie na pobyt i prac\u0119 \u2014 por\u00f3wnanie",
        content: `<table>
<thead><tr><th>Cecha</th><th>Blue Card</th><th>Pobyt i praca</th></tr></thead>
<tbody>
<tr><td>Pr\u00f3g wynagrodzenia</td><td>~7500 z\u0142 brutto/mc</td><td>Brak progu</td></tr>
<tr><td>Wykszta\u0142cenie</td><td>Wy\u017csze lub 3 lata do\u015bwiadczenia IT</td><td>Dowolne</td></tr>
<tr><td>Test rynku pracy</td><td>Zniesiony</td><td>Zniesiony</td></tr>
<tr><td>Mobilno\u015b\u0107 w UE</td><td>Tak</td><td>Nie</td></tr>
<tr><td>\u0141\u0105czenie rodzin</td><td>Uproszczone</td><td>Standardowe</td></tr>
<tr><td>Op\u0142ata skarbowa</td><td>440 z\u0142</td><td>440 z\u0142</td></tr>
<tr><td>Czas oczekiwania</td><td>Zwykle kr\u00f3cej</td><td>Zale\u017cy od urz\u0119du</td></tr>
</tbody>
</table>
<p><a href="/pl/kontakt">Nie wiesz, kt\u00f3re zezwolenie jest dla Ciebie? Um\u00f3w bezp\u0142atn\u0105 konsultacj\u0119</a>.</p>`,
      },
      {
        id: "faq-blue",
        heading: "FAQ \u2014 Niebieska Karta UE w Polsce",
        content: `<div class="faq-list">
<details><summary><strong>Jakie wynagrodzenie jest wymagane do Blue Card w 2026?</strong></summary>
<p>Pr\u00f3g wynosi 1,0-krotno\u015b\u0107 przeci\u0119tnego rocznego wynagrodzenia, co w 2026 odpowiada ok. 7500 z\u0142 brutto miesi\u0119cznie. W zawodach deficytowych (IT, in\u017cynieria) pr\u00f3g jest ni\u017cszy \u2014 0,8-krotno\u015b\u0107.</p></details>
<details><summary><strong>Czy programista bez dyplomu mo\u017ce dosta\u0107 Blue Card?</strong></summary>
<p>Tak, od 2025 roku specjali\u015bci IT z minimum 3-letnim do\u015bwiadczeniem zawodowym mog\u0105 ubiega\u0107 si\u0119 o Blue Card bez dyplomu uczelni wy\u017cszej.</p></details>
<details><summary><strong>Czy mog\u0119 zmieni\u0107 pracodawc\u0119 maj\u0105c Blue Card?</strong></summary>
<p>Przez pierwsze 12 miesi\u0119cy zmiana pracodawcy wymaga nowego zezwolenia. Po roku mo\u017cesz zmieni\u0107 prac\u0119 powiadamiaj\u0105c urz\u0105d, pod warunkiem spe\u0142nienia progu wynagrodzenia.</p></details>
<details><summary><strong>Ile trwa procedura uzyskania Blue Card?</strong></summary>
<p>Czas oczekiwania zale\u017cy od indywidualnej sprawy i obci\u0105\u017cenia urz\u0119du, ale Blue Card jest zazwyczaj rozpatrywana szybciej ni\u017c standardowe zezwolenie na pobyt i prac\u0119.</p></details>
</div>`,
      },
    ],
  },

  // =========================================================================
  // ARTYKUŁ 4: Wnioski MOS 2026
  // Primary keyword: wniosek o kartę pobytu online MOS
  // =========================================================================
  {
    slug: "wnioski-pobytowe-mos-2026",
    title: "Wnioski pobytowe online przez MOS w 2026 \u2014 jak dzia\u0142a nowy system",
    description:
      "Od 2026 wnioski o kart\u0119 pobytu sk\u0142adasz przez MOS (Modu\u0142 Obs\u0142ugi Spraw). Jak za\u0142o\u017cy\u0107 konto, wype\u0142ni\u0107 e-wniosek i unikn\u0105\u0107 b\u0142\u0119d\u00f3w. Poradnik getpermit.pl.",
    date: "2026-04-12",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&q=80",
    imageAlt: "System MOS \u2014 sk\u0142adanie wniosk\u00f3w pobytowych online w Polsce 2026",
    author: "Grzegorz St\u0119pie\u0144, UTM Group",
    toc: [
      { id: "czym-jest-mos", title: "Czym jest MOS" },
      { id: "jak-zalozyc", title: "Jak za\u0142o\u017cy\u0107 konto w MOS" },
      { id: "jak-wypelnic", title: "Jak wype\u0142ni\u0107 e-wniosek" },
      { id: "zalaczniki", title: "Dodawanie za\u0142\u0105cznik\u00f3w" },
      { id: "po-zlozeniu", title: "Co po z\u0142o\u017ceniu wniosku" },
      { id: "problemy-mos", title: "Cz\u0119ste problemy z MOS" },
      { id: "faq-mos", title: "FAQ" },
    ],
    sections: [
      {
        id: "czym-jest-mos",
        heading: "Czym jest MOS \u2014 Modu\u0142 Obs\u0142ugi Spraw",
        content: `<p><strong>MOS (Modu\u0142 Obs\u0142ugi Spraw)</strong> to elektroniczny system uruchomiony w 2025 roku, kt\u00f3ry od 2026 roku sta\u0142 si\u0119 <strong>obowi\u0105zkowym kana\u0142em sk\u0142adania wniosk\u00f3w pobytowych</strong> dla cudzoziemc\u00f3w w Polsce. System zast\u0105pi\u0142 papierowe formularze i osobiste wizyty w urz\u0119dach wojew\u00f3dzkich na etapie sk\u0142adania wniosku.</p>
<p>Przez MOS mo\u017cna z\u0142o\u017cy\u0107 wniosek o:</p>
<ul>
<li>Zezwolenie na pobyt czasowy (karta pobytu czasowego)</li>
<li>Zezwolenie na pobyt sta\u0142y</li>
<li>Zezwolenie na pobyt rezydenta d\u0142ugoterminowego UE</li>
<li>Przed\u0142u\u017cenie wizy</li>
</ul>
<p>System dost\u0119pny jest pod adresem <strong>mos.cudzoziemcy.gov.pl</strong> i dzia\u0142a w j\u0119zykach: polskim, angielskim, rosyjskim i ukrai\u0144skim.</p>`,
      },
      {
        id: "jak-zalozyc",
        heading: "Jak za\u0142o\u017cy\u0107 konto w systemie MOS",
        content: `<p>Rejestracja w MOS wymaga:</p>
<ol>
<li>Wej\u015bcia na stron\u0119 <strong>mos.cudzoziemcy.gov.pl</strong></li>
<li>Klikni\u0119cia \u201eZa\u0142\u00f3\u017c konto\u201d</li>
<li>Podania adresu e-mail i utworzenia has\u0142a</li>
<li>Potwierdzenia adresu e-mail przez link aktywacyjny</li>
<li>Uzupe\u0142nienia danych osobowych (imi\u0119, nazwisko, numer paszportu)</li>
</ol>
<p>Po rejestracji mo\u017cna rozpocz\u0105\u0107 wype\u0142nianie wniosku. System pozwala na <strong>zapisywanie roboczej wersji</strong> i powracanie do niej w dowolnym momencie.</p>
<p>Wa\u017cne: jedna osoba = jedno konto. Nie tworz wielu kont \u2014 system przypisuje numery spraw do konta.</p>`,
      },
      {
        id: "jak-wypelnic",
        heading: "Jak wype\u0142ni\u0107 elektroniczny wniosek o kart\u0119 pobytu",
        content: `<p>Formularz w MOS jest podzielony na sekcje odpowiadaj\u0105ce tradycyjnemu formularzowi papierowemu:</p>
<ol>
<li><strong>Dane osobowe</strong> \u2014 imi\u0119, nazwisko (jak w paszporcie), data urodzenia, obywatelstwo</li>
<li><strong>Dane paszportowe</strong> \u2014 numer, data wa\u017cno\u015bci, organ wydaj\u0105cy</li>
<li><strong>Adres zamieszkania w Polsce</strong> \u2014 aktualny adres i ewentualne zameldowanie</li>
<li><strong>Cel pobytu</strong> \u2014 wyb\u00f3r rodzaju zezwolenia i podstawy prawnej</li>
<li><strong>Dane pracodawcy</strong> \u2014 je\u015bli wniosek dotyczy pracy</li>
<li><strong>Informacje dodatkowe</strong> \u2014 karalnosc, wcze\u015bniejsze pobyty, cz\u0142onkowie rodziny</li>
</ol>
<p>System <strong>waliduje dane w czasie rzeczywistym</strong> i podpowiada b\u0142\u0119dy przed wys\u0142aniem. Jednak nie zwalnia to z obowi\u0105zku do\u0142\u0105czenia prawid\u0142owych za\u0142\u0105cznik\u00f3w.</p>
<p><a href="/pl/kontakt">Potrzebujesz pomocy z wype\u0142nieniem wniosku? Skontaktuj si\u0119 z nami</a>.</p>`,
      },
      {
        id: "zalaczniki",
        heading: "Za\u0142\u0105czniki do e-wniosku \u2014 co i jak doda\u0107",
        content: `<p>MOS akceptuje pliki w formatach PDF, JPG i PNG. Ka\u017cdy za\u0142\u0105cznik nie mo\u017ce przekracza\u0107 <strong>10 MB</strong>. Wymagane dokumenty:</p>
<ul>
<li>Skan paszportu (wszystkie strony z danymi)</li>
<li>Zdj\u0119cie biometryczne (35\u00d745 mm, format cyfrowy)</li>
<li>Potwierdzenie op\u0142aty skarbowej</li>
<li>Dokumenty potwierdzaj\u0105ce cel pobytu (umowa o prac\u0119, za\u015bwiadczenie z uczelni itp.)</li>
<li>T\u0142umaczenia przysi\u0119g\u0142e dokument\u00f3w zagranicznych</li>
</ul>
<p>Dokumenty oryginalne (paszport, t\u0142umaczenia) nale\u017cy okaza\u0107 osobi\u015bcie podczas <strong>wizyty w urz\u0119dzie na pobranie odcisk\u00f3w palc\u00f3w</strong>, kt\u00f3ra jest nadal obowi\u0105zkowa.</p>`,
      },
      {
        id: "po-zlozeniu",
        heading: "Co dzieje si\u0119 po z\u0142o\u017ceniu wniosku przez MOS",
        content: `<p>Po wys\u0142aniu wniosku system:</p>
<ol>
<li>Nadaje <strong>numer sprawy</strong> \u2014 u\u017cywaj go we wszystkich kontaktach z urz\u0119dem</li>
<li>Generuje <strong>elektroniczne potwierdzenie z\u0142o\u017cenia</strong> \u2014 odpowiednik stempla w paszporcie</li>
<li>Wysy\u0142a <strong>wezwanie na wizyt\u0119</strong> \u2014 w celu pobrania biometrii (odciski palc\u00f3w)</li>
<li>Powiadamia o <strong>wezwaniach do uzupe\u0142nienia</strong> \u2014 przez MOS i e-mail</li>
<li>Informuje o <strong>decyzji</strong> \u2014 pozytywnej lub odmownej</li>
</ol>
<p>Ca\u0142a korespondencja urz\u0119dowa odbywa si\u0119 przez system MOS. Warto regularnie sprawdza\u0107 powiadomienia.</p>`,
      },
      {
        id: "problemy-mos",
        heading: "Cz\u0119ste problemy z systemem MOS i jak je rozwi\u0105za\u0107",
        content: `<p>Na podstawie do\u015bwiadcze\u0144 naszych klient\u00f3w, najcz\u0119stsze problemy to:</p>
<ul>
<li><strong>Przeci\u0105\u017cenie systemu</strong> \u2014 pr\u00f3buj sk\u0142ada\u0107 wniosek w godzinach wieczornych lub w weekendy</li>
<li><strong>Problemy z za\u0142\u0105cznikami</strong> \u2014 upewnij si\u0119, \u017ce pliki nie przekraczaj\u0105 10 MB i s\u0105 w formacie PDF/JPG</li>
<li><strong>B\u0142\u0119dy walidacji</strong> \u2014 sprawd\u017a formatowanie dat (DD-MM-RRRR) i numer\u00f3w</li>
<li><strong>Brak potwierdzenia e-mail</strong> \u2014 sprawd\u017a folder spam</li>
<li><strong>Sesja wygas\u0142a</strong> \u2014 system wylogowuje po 30 minutach nieaktywno\u015bci; zapisuj robocze wersje cz\u0119sto</li>
</ul>
<p>Je\u015bli masz problemy techniczne z MOS, <a href="/pl/kontakt">nasz zesp\u00f3\u0142 pomo\u017ce Ci z\u0142o\u017cy\u0107 wniosek prawid\u0142owo</a>.</p>`,
      },
      {
        id: "faq-mos",
        heading: "FAQ \u2014 wnioski pobytowe przez MOS",
        content: `<div class="faq-list">
<details><summary><strong>Czy nadal mog\u0119 z\u0142o\u017cy\u0107 wniosek papierowy?</strong></summary>
<p>Od 2026 roku wnioski papierowe s\u0105 akceptowane tylko w wyj\u0105tkowych przypadkach (np. problemy techniczne systemu potwierdzone przez urz\u0105d). Standardowo wniosek sk\u0142adany jest wy\u0142\u0105cznie przez MOS.</p></details>
<details><summary><strong>Czy musz\u0119 osobi\u015bcie i\u015b\u0107 do urz\u0119du?</strong></summary>
<p>Tak \u2014 wizyta osobista jest wymagana do pobrania odcisk\u00f3w palc\u00f3w (biometria). Sam wniosek sk\u0142adasz online.</p></details>
<details><summary><strong>Co je\u015bli MOS nie dzia\u0142a w ostatnim dniu mojego legalnego pobytu?</strong></summary>
<p>W takiej sytuacji nale\u017cy niezw\u0142ocznie skontaktowa\u0107 si\u0119 z urz\u0119dem wojew\u00f3dzkim i udokumentowa\u0107 pr\u00f3b\u0119 z\u0142o\u017cenia wniosku (np. screenshoty b\u0142\u0119d\u00f3w). Mo\u017cliwe jest z\u0142o\u017cenie wniosku papierowego w trybie awaryjnym.</p></details>
<details><summary><strong>W jakim j\u0119zyku jest MOS?</strong></summary>
<p>System dost\u0119pny jest w j\u0119zyku polskim, angielskim, rosyjskim i ukrai\u0144skim. Formularz wniosku nale\u017cy wype\u0142ni\u0107 po polsku.</p></details>
</div>`,
      },
    ],
  },

  // =========================================================================
  // ARTYKUŁ: Ile kosztuje karta pobytu 2026
  // Primary keyword: ile kosztuje karta pobytu
  // =========================================================================
  {
    slug: "ile-kosztuje-karta-pobytu-2026",
    title: "Ile kosztuje karta pobytu w 2026? Pełny cennik opłat",
    description:
      "Aktualne koszty karty pobytu w 2026 roku: opłaty skarbowe, wydanie karty, tłumaczenia przysięgłe i pomoc prawna. Cennik i kalkulator kosztów od getpermit.pl.",
    date: "2026-04-11",
    imageUrl: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1600&q=80",
    imageAlt: "Koszty karty pobytu w Polsce 2026 — cennik opłat urzędowych",
    author: "Grzegorz Stępień, UTM Group",
    toc: [
      { id: "oplaty-skarbowe", title: "Opłaty skarbowe" },
      { id: "wydanie-karty", title: "Koszt wydania karty" },
      { id: "tlumaczenia", title: "Tłumaczenia przysięgłe" },
      { id: "pomoc-prawna", title: "Pomoc prawna" },
      { id: "calkowity-koszt", title: "Całkowity koszt" },
      { id: "faq-koszty", title: "FAQ" },
    ],
    sections: [
      { id: "oplaty-skarbowe", heading: "Opłaty skarbowe za kartę pobytu w 2026 roku", content: `<table><thead><tr><th>Rodzaj zezwolenia</th><th>Opłata skarbowa</th></tr></thead><tbody><tr><td>Pobyt czasowy</td><td><strong>340 zł</strong></td></tr><tr><td>Pobyt czasowy i praca (jednolite)</td><td><strong>440 zł</strong></td></tr><tr><td>Niebieska Karta UE</td><td><strong>440 zł</strong></td></tr><tr><td>Pobyt stały</td><td><strong>640 zł</strong></td></tr><tr><td>Rezydent długoterminowy UE</td><td><strong>640 zł</strong></td></tr></tbody></table><p>Opłatę należy uiścić <strong>przed złożeniem wniosku</strong>.</p>` },
      { id: "wydanie-karty", heading: "Opłata za wydanie karty", content: `<p>Po wydaniu pozytywnej decyzji urząd produkuje plastikową kartę. Opłata za wydanie karty wynosi <strong>100 zł</strong> niezależnie od rodzaju zezwolenia. Czas produkcji karty zależy od urzędu.</p>` },
      { id: "tlumaczenia", heading: "Koszty tłumaczeń przysięgłych", content: `<table><thead><tr><th>Dokument</th><th>Przybliżony koszt</th></tr></thead><tbody><tr><td>Paszport</td><td>50–100 zł</td></tr><tr><td>Akt urodzenia</td><td>60–80 zł</td></tr><tr><td>Akt małżeństwa</td><td>60–80 zł</td></tr><tr><td>Dyplom ukończenia studiów</td><td>80–150 zł</td></tr></tbody></table><p>Łączne koszty tłumaczeń w typowej sprawie: <strong>150–400 zł</strong>. <a href="/pl/uslugi/tlumaczenia-przysiegle-dokumentow">Oferujemy konkurencyjne ceny tłumaczeń</a>.</p>` },
      { id: "pomoc-prawna", heading: "Koszt profesjonalnej pomocy prawnej", content: `<ul><li><strong>Wstępna konsultacja</strong> — 250 zł (ok. 15 min, w getpermit.pl)</li><li><strong>Przygotowanie wniosku</strong> — od 600 zł</li><li><strong>Kompleksowe prowadzenie sprawy</strong> — od 800 zł</li><li><strong>Pobyt stały / rezydent UE</strong> — od 1 200 zł</li><li><strong>Ponaglenie / odwołanie</strong> — od 500 zł</li></ul><p>Nasz wskaźnik skuteczności wynosi <strong>98%</strong>. <a href="/pl/kontakt">Umów się na konsultację</a>.</p>` },
      { id: "calkowity-koszt", heading: "Całkowity koszt karty pobytu — podsumowanie", content: `<table><thead><tr><th>Składnik</th><th>Pobyt czasowy</th><th>Czas. + praca</th><th>Pobyt stały</th></tr></thead><tbody><tr><td>Opłata skarbowa</td><td>340 zł</td><td>440 zł</td><td>640 zł</td></tr><tr><td>Wydanie karty</td><td>100 zł</td><td>100 zł</td><td>100 zł</td></tr><tr><td>Tłumaczenia</td><td>150–400 zł</td><td>150–400 zł</td><td>200–500 zł</td></tr><tr><td>Pomoc prawna (opcjonalnie)</td><td>od 600 zł</td><td>od 800 zł</td><td>od 1 200 zł</td></tr><tr><td><strong>Razem</strong></td><td><strong>590–1 440 zł</strong></td><td><strong>690–1 740 zł</strong></td><td><strong>940–2 440 zł</strong></td></tr></tbody></table>` },
      { id: "faq-koszty", heading: "FAQ — koszty karty pobytu", content: `<div class="faq-list"><details><summary><strong>Czy opłata skarbowa jest zwracana w razie odmowy?</strong></summary><p>Nie. Opłata skarbowa nie podlega zwrotowi w przypadku decyzji negatywnej. Dlatego warto skorzystać z profesjonalnej pomocy, aby zminimalizować ryzyko odmowy.</p></details><details><summary><strong>Ile kosztuje karta pobytu dla obywatela Ukrainy?</strong></summary><p>Opłaty są takie same dla wszystkich cudzoziemców, niezależnie od obywatelstwa. Ukraińcy objęci ochroną czasową mogą korzystać z uproszczonych procedur, ale opłaty pozostają standardowe.</p></details><details><summary><strong>Ile kosztuje konsultacja w getpermit.pl?</strong></summary><p>Konsultacja wstępna kosztuje 250 zł (ok. 15 min). Oceniamy Twoją sytuację, proponujemy strategię i podajemy dokładną wycenę dalszej obsługi.</p></details></div>` },
    ],
  },

  // =========================================================================
  // POST 01: Wnioski pobytowe tylko przez MOS od 27.04.2026
  // =========================================================================
  {
    slug: "wnioski-pobytowe-tylko-przez-mos-od-27-kwietnia-2026",
    title: "Od 27 kwietnia 2026 wnioski pobytowe wyłącznie online przez MOS — papierowe nie będą rozpatrywane",
    description: "Od 27.04.2026 wnioski o pobyt czasowy, stały i rezydenta UE składa się tylko elektronicznie przez system MOS. Sprawdź, co z wnioskami papierowymi.",
    date: "2026-06-01",
    imageUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1600&q=80",
    imageAlt: "Laptop z otwartym formularzem online — elektroniczne wnioski pobytowe MOS",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "nowa-procedura", title: "Rewolucja w legalizacji pobytu" },
      { id: "wnioski-papierowe", title: "Co z wnioskami papierowymi" },
      { id: "jak-dziala", title: "Jak działa nowa procedura" },
      { id: "praktyka", title: "Co to oznacza w praktyce" },
    ],
    sections: [
      {
        id: "nowa-procedura",
        heading: "Od 27 kwietnia 2026 wnioski pobytowe wyłącznie online przez MOS",
        content: `<p>Rewolucja w legalizacji pobytu stała się faktem. Od 27 kwietnia 2026 r. wnioski o zezwolenie na pobyt czasowy, pobyt stały oraz pobyt rezydenta długoterminowego UE można składać <strong>wyłącznie elektronicznie</strong> — przez system MOS (Moduł Obsługi Spraw).</p>`,
      },
      {
        id: "wnioski-papierowe",
        heading: "Co z wnioskami papierowymi?",
        content: `<p>Wnioski papierowe, które nie wpłynęły do urzędów wojewódzkich przed 27 kwietnia 2026 r., <strong>nie są rozpatrywane</strong> — niezależnie od daty nadania na poczcie. Jeśli wysłałeś wniosek papierowy w ostatnich dniach kwietnia, koniecznie zweryfikuj jego status.</p>`,
      },
      {
        id: "jak-dziala",
        heading: "Jak działa nowa procedura?",
        content: `<p>Cudzoziemiec zakłada bezpłatne konto w MOS, wypełnia e-wniosek, dołącza skany dokumentów i fotografię cyfrową. Jedyne koszty to opłata skarbowa (zależna od typu zezwolenia) oraz 100 zł za wydanie karty pobytu. W procedurach związanych z pracą system angażuje także pracodawcę — na jego adres e-mail trafia indywidualny link do elektronicznego podpisania dokumentów.</p><p>Więcej o systemie: <a href="/pl/blog/wnioski-pobytowe-mos-2026">Wnioski pobytowe online przez MOS w 2026</a>.</p>`,
      },
      {
        id: "praktyka",
        heading: "Co to oznacza w praktyce?",
        content: `<p>Koniec kolejek przed urzędami i wniosków wysyłanych „na ostatnią chwilę" listem poleconym. Ale też nowe ryzyka: błędy w e-wniosku, problemy z podpisem elektronicznym pracodawcy czy brakujące załączniki mogą opóźnić wszczęcie postępowania.</p><p><strong>Potrzebujesz pomocy ze złożeniem wniosku w MOS? Umów konsultację z getpermit.pl — przeprowadzimy Cię przez całą procedurę.</strong></p>`,
      },
    ],
  },

  // =========================================================================
  // POST 02: Rok nowej ustawy o zatrudnianiu cudzoziemców
  // =========================================================================
  {
    slug: "rok-nowej-ustawy-o-zatrudnianiu-cudzoziemcow",
    title: "Rok nowej ustawy o zatrudnianiu cudzoziemców — co się realnie zmieniło?",
    description: "1 czerwca 2025 weszła w życie ustawa o warunkach dopuszczalności powierzania pracy cudzoziemcom. Podsumowujemy 12 miesięcy: elektronizacja, koniec testu rynku pracy, nowe obowiązki.",
    date: "2026-06-02",
    imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1600&q=80",
    imageAlt: "Uścisk dłoni pracodawcy i pracownika — zatrudnianie cudzoziemców po nowej ustawie",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "elektronizacja", title: "Pełna elektronizacja przez praca.gov.pl" },
      { id: "koniec-testu", title: "Koniec testu rynku pracy" },
      { id: "obowiazki", title: "Nowe obowiązki informacyjne" },
      { id: "bilans", title: "Bilans dla pracodawców i cudzoziemców" },
    ],
    sections: [
      {
        id: "elektronizacja",
        heading: "Pełna elektronizacja przez praca.gov.pl",
        content: `<p>1 czerwca 2025 r. weszła w życie ustawa z 20 marca 2025 r. o warunkach dopuszczalności powierzania pracy cudzoziemcom na terytorium RP. Po dwunastu miesiącach widać, jak głęboko zmieniła rynek legalizacji pracy.</p><p>Oświadczenia o powierzeniu pracy, wnioski o zezwolenia na pracę (w tym sezonowe) i wszystkie dokumenty składa się wyłącznie elektronicznie przez portal praca.gov.pl. Dokumenty złożone w innej formie są odrzucane.</p>`,
      },
      {
        id: "koniec-testu",
        heading: "Koniec testu rynku pracy",
        content: `<p>Zniesiono informację starosty — pracodawca nie musi już udowadniać, że nie znalazł pracownika lokalnie. To skróciło procedury o tygodnie, choć urzędy zyskały nowe narzędzia weryfikacji fikcyjnego zatrudnienia.</p>`,
      },
      {
        id: "obowiazki",
        heading: "Nowe obowiązki informacyjne",
        content: `<p>Pracodawca musi w określonych terminach informować urząd o rozpoczęciu i zakończeniu pracy cudzoziemca. Zgłoszenie wcześniejszego zakończenia pracy unieważnia oświadczenie. Za uchybienia grożą realne kary.</p>`,
      },
      {
        id: "bilans",
        heading: "Bilans dla pracodawców i cudzoziemców",
        content: `<p>Procedury są szybsze i tańsze logistycznie, ale wymagają dyscypliny cyfrowej: profil na praca.gov.pl, podpis elektroniczny i pilnowanie terminów to dziś podstawa legalnego zatrudnienia.</p><p><strong>Zatrudniasz cudzoziemców? getpermit.pl poprowadzi cały proces — od oświadczenia po kartę pobytu pracownika.</strong></p>`,
      },
    ],
  },

  // =========================================================================
  // POST 03: Opłata 400 zł za oświadczenia i zezwolenia
  // =========================================================================
  {
    slug: "oplata-400-zl-oswiadczenia-zezwolenia-na-prace",
    title: "400 zł zamiast 100 zł — opłaty za legalizację pracy cudzoziemców po podwyżce",
    description: "Od 1 grudnia 2025 opłata za oświadczenie o powierzeniu pracy i wnioski o zezwolenie na pracę wzrosła ze 100 do 400 zł. Sprawdź aktualny cennik.",
    date: "2026-06-03",
    imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80",
    imageAlt: "Kalkulator i dokumenty — wyższe opłaty za legalizację pracy cudzoziemców",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "co-podrozalo", title: "Co podrożało" },
      { id: "kto-ponosi", title: "Kto ponosi koszt" },
      { id: "jak-ograniczyc", title: "Jak ograniczyć wydatki" },
    ],
    sections: [
      {
        id: "co-podrozalo",
        heading: "Co podrożało od 1 grudnia 2025?",
        content: `<p>Od 1 grudnia 2025 r. obowiązują rozporządzenia podnoszące opłaty za dokumenty legalizujące pracę cudzoziemców. Opłata za złożenie oświadczenia o powierzeniu wykonywania pracy cudzoziemcowi oraz za wnioski o wydanie zezwolenia na pracę wzrosła <strong>ze 100 zł do 400 zł</strong>. Opłatę wnosi się na konto właściwego powiatowego urzędu pracy.</p>`,
      },
      {
        id: "kto-ponosi",
        heading: "Kto ponosi koszt?",
        content: `<p>Opłaty obciążają pracodawcę — przepisy zabraniają przenoszenia kosztów legalizacji pracy na cudzoziemca. Próby potrącania tych kwot z wynagrodzenia pracownika to naruszenie przepisów i ryzyko kar.</p>`,
      },
      {
        id: "jak-ograniczyc",
        heading: "Jak ograniczyć wydatki?",
        content: `<p>Czterokrotnie wyższa stawka oznacza, że błędy formalne kosztują realne pieniądze. Odrzucone oświadczenie z powodu braków to konieczność ponownej opłaty. Warto: weryfikować dane przed wysyłką w praca.gov.pl, wybierać właściwy typ dokumentu (oświadczenie vs zezwolenie) i planować zatrudnienie z wyprzedzeniem.</p><p><strong>Nie chcesz płacić podwójnie za błędy we wnioskach? Zespół getpermit.pl przygotuje dokumenty poprawnie za pierwszym razem.</strong></p>`,
      },
    ],
  },

  // =========================================================================
  // POST 04: Gruzja poza procedurą oświadczeniową
  // =========================================================================
  {
    slug: "gruzja-poza-procedura-oswiadczeniowa",
    title: "Obywatele Gruzji bez oświadczeń — jak legalnie zatrudnić Gruzina w 2026 roku?",
    description: "Od 1 grudnia 2025 Gruzja została wykreślona z procedury oświadczeniowej. Obywatele Gruzji potrzebują zezwolenia na pracę. Sprawdź przepisy przejściowe.",
    date: "2026-06-04",
    imageUrl: "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1600&q=80",
    imageAlt: "Tbilisi, Gruzja — zmiana zasad zatrudniania obywateli Gruzji w Polsce",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "co-sie-zmienilo", title: "Co się zmieniło" },
      { id: "przepisy-przejsciowe", title: "Przepisy przejściowe" },
      { id: "co-powinien-pracodawca", title: "Co powinien zrobić pracodawca" },
    ],
    sections: [
      {
        id: "co-sie-zmienilo",
        heading: "Co się zmieniło od 1 grudnia 2025?",
        content: `<p>Od 1 grudnia 2025 r. Gruzja nie figuruje już na liście państw objętych uproszczoną procedurą oświadczeniową. Dotychczas obywatele Gruzji — obok obywateli Ukrainy, Białorusi, Mołdawii i Armenii — mogli pracować na podstawie oświadczenia o powierzeniu pracy rejestrowanego w kilka dni. Po zmianie rozporządzeń z listopada 2025 r. ich zatrudnienie wymaga <strong>zezwolenia na pracę</strong> lub zezwolenia na pobyt i pracę.</p>`,
      },
      {
        id: "przepisy-przejsciowe",
        heading: "Przepisy przejściowe",
        content: `<p>Oświadczenia uzyskane dla obywateli Gruzji przed 1 grudnia 2025 r. zachowują ważność — praca na ich podstawie jest legalna do końca okresu wskazanego w dokumencie. Po jego upływie konieczne jest już zezwolenie.</p>`,
      },
      {
        id: "co-powinien-pracodawca",
        heading: "Co powinien zrobić pracodawca?",
        content: `<p>Zaplanować procedurę z wyprzedzeniem: postępowanie o zezwolenie na pracę trwa dłużej niż rejestracja oświadczenia, a wniosek składa się elektronicznie przez praca.gov.pl (opłata 400 zł). Pracownikom z kończącymi się oświadczeniami warto od razu wszcząć procedurę pobytowo-pracowniczą przez <a href="/pl/blog/wnioski-pobytowe-mos-2026">MOS</a>.</p><p><strong>Zatrudniasz obywateli Gruzji? Sprawdzimy ich sytuację i poprowadzimy właściwą procedurę — umów konsultację z getpermit.pl.</strong></p>`,
      },
    ],
  },

  // =========================================================================
  // POST 05: EES w pełni działa od 10.04.2026
  // =========================================================================
  {
    slug: "ees-system-wjazdu-wyjazdu-w-pelni-dziala",
    title: "EES działa w pełni — koniec stempli w paszportach. Co musi wiedzieć cudzoziemiec w Polsce?",
    description: "Od 10 kwietnia 2026 system EES działa na wszystkich granicach zewnętrznych Schengen. Biometria zamiast stempli i automatyczne liczenie 90/180 dni.",
    date: "2026-06-05",
    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80",
    imageAlt: "Kontrola graniczna na lotnisku — system EES rejestruje wjazdy i wyjazdy ze strefy Schengen",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "jak-dziala-ees", title: "Jak działa EES" },
      { id: "liczenie-90-180", title: "Automatyczne liczenie 90/180" },
      { id: "posiadacze-kart", title: "Co z posiadaczami kart pobytu" },
    ],
    sections: [
      {
        id: "jak-dziala-ees",
        heading: "Jak działa EES?",
        content: `<p>Unijny system wjazdu/wyjazdu (EES), uruchamiany etapami od 12 października 2025 r., od 10 kwietnia 2026 r. działa w pełnym zakresie na granicach zewnętrznych strefy Schengen — także na polskich przejściach granicznych i lotniskach.</p><p>System elektronicznie rejestruje każde przekroczenie granicy zewnętrznej przez obywatela państwa trzeciego podróżującego na pobyt krótkoterminowy: dane paszportowe, odciski palców i wizerunek twarzy. Tradycyjne stemple w paszportach odeszły do historii.</p>`,
      },
      {
        id: "liczenie-90-180",
        heading: "Automatyczne liczenie 90/180",
        content: `<p>EES sam wylicza wykorzystanie limitu 90 dni pobytu w okresie 180 dni. Przekroczenia, które wcześniej bywały niezauważone, system wychwytuje automatycznie — a wpis o overstay widzą służby graniczne wszystkich państw członkowskich.</p>`,
      },
      {
        id: "posiadacze-kart",
        heading: "Co z posiadaczami kart pobytu?",
        content: `<p>Cudzoziemcy posiadający polską kartę pobytu lub wizę długoterminową <strong>nie podlegają rejestracji w EES</strong> — system dotyczy pobytów krótkoterminowych. To kolejny argument, by uporządkować swój status pobytowy zamiast funkcjonować na ruchu bezwizowym.</p><p><strong>Kończy Ci się limit 90/180? Pomożemy zalegalizować pobyt długoterminowo — umów konsultację z getpermit.pl.</strong></p>`,
      },
    ],
  },

  // =========================================================================
  // POST 06: ETIAS od końca 2026
  // =========================================================================
  {
    slug: "etias-od-konca-2026-co-musisz-wiedziec",
    title: "ETIAS od końca 2026 — autoryzacja podróży za 20 euro. Kogo dotyczy?",
    description: "W IV kwartale 2026 rusza ETIAS — elektroniczna autoryzacja podróży dla obywateli 59 państw bezwizowych. Opłata 20 euro, ważność 3 lata, okres przejściowy.",
    date: "2026-06-06",
    imageUrl: "https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=1600&q=80",
    imageAlt: "Paszport i dokumenty podróżne — autoryzacja ETIAS dla podróżnych bezwizowych do UE",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "kogo-obejmie", title: "Kogo obejmie ETIAS" },
      { id: "koszt-waznosc", title: "Koszt i ważność" },
      { id: "wylaczenia", title: "Wyłączenia i okres przejściowy" },
    ],
    sections: [
      {
        id: "kogo-obejmie",
        heading: "Kogo obejmie ETIAS?",
        content: `<p>W czwartym kwartale 2026 r. ma ruszyć ETIAS — europejski system informacji o podróży i zezwoleń na podróż. Obejmie obywateli 59 państw i terytoriów zwolnionych z obowiązku wizowego — w tym Ukrainy, Gruzji czy Wielkiej Brytanii — podróżujących do 30 państw europejskich na pobyty do 90 dni w okresie 180 dni.</p>`,
      },
      {
        id: "koszt-waznosc",
        heading: "Ile kosztuje i jak długo jest ważna?",
        content: `<p>Opłata wynosi <strong>20 euro</strong> (Komisja Europejska podniosła ją w lipcu 2025 r. z planowanych 7 euro). Autoryzacja będzie ważna 3 lata lub do końca ważności paszportu. Zwolnione z opłaty są osoby poniżej 18. i powyżej 70. roku życia.</p>`,
      },
      {
        id: "wylaczenia",
        heading: "Okres przejściowy i wyłączenia",
        content: `<p>Po starcie przewidziano co najmniej 6-miesięczny okres przejściowy, w którym autoryzacja będzie fakultatywna. ETIAS <strong>nie dotyczy</strong> posiadaczy kart pobytu i wiz długoterminowych — osoby z uregulowanym statusem w Polsce podróżują bez autoryzacji.</p><p><strong>Masz wątpliwości, czy ETIAS obejmie Ciebie lub Twoich pracowników? Zapytaj ekspertów getpermit.pl.</strong></p>`,
      },
    ],
  },

  // =========================================================================
  // POST 07: Niebieska Karta UE — nowy próg wynagrodzenia
  // =========================================================================
  {
    slug: "niebieska-karta-ue-nowy-prog-wynagrodzenia-2026",
    title: "Niebieska Karta UE w 2026 — nowy próg wynagrodzenia 13 355,34 zł brutto",
    description: "Od 2026 próg wynagrodzenia dla Blue Card w Polsce wynosi 13 355,34 zł brutto. Sprawdź nowe wymagania: umowa od 6 miesięcy i uznanie doświadczenia zawodowego.",
    date: "2026-06-08",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80",
    imageAlt: "Nowoczesny biurowiec — Niebieska Karta UE dla wysoko wykwalifikowanych specjalistów",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "nowy-prog", title: "Nowy próg 13 355,34 zł brutto" },
      { id: "lagodniejsze-warunki", title: "Łagodniejsze pozostałe warunki" },
      { id: "dlaczego-warto", title: "Dlaczego warto ubiegać się o Blue Card" },
    ],
    sections: [
      {
        id: "nowy-prog",
        heading: "Nowy próg: 13 355,34 zł brutto",
        content: `<p>Specjaliści ubiegający się o Niebieską Kartę UE w Polsce muszą w 2026 r. wykazać wyższe wynagrodzenie. Zgodnie z komunikatem GUS z 9 lutego 2026 r. przeciętne wynagrodzenie w gospodarce narodowej w 2025 r. wyniosło 8 903,56 zł brutto. Próg dla Blue Card to 150% tej kwoty — w postępowaniach wszczętych w 2026 r. wynagrodzenie musi wynosić co najmniej <strong>13 355,34 zł brutto miesięcznie</strong>.</p>`,
      },
      {
        id: "lagodniejsze-warunki",
        heading: "Łagodniejsze pozostałe warunki",
        content: `<p>Po wdrożeniu nowej dyrektywy Blue Card procedura została częściowo ujednolicona w całej UE: wystarczy umowa zawarta na <strong>co najmniej 6 miesięcy</strong> (wcześniej 12), a w niektórych zawodach — zwłaszcza IT — wyższe kwalifikacje można wykazać <strong>doświadczeniem zawodowym</strong> zamiast dyplomem uczelni. Więcej o Blue Card: <a href="/pl/blog/niebieska-karta-ue-blue-card-2026">Niebieska Karta UE w Polsce 2026</a>.</p>`,
      },
      {
        id: "dlaczego-warto",
        heading: "Dlaczego warto ubiegać się o Blue Card?",
        content: `<p>Blue Card daje szybszą ścieżkę do statusu rezydenta długoterminowego UE, ułatwioną mobilność do innych państw członkowskich i korzystniejsze zasady łączenia rodzin. Kartę wydaje się maksymalnie na 3 lata z możliwością przedłużenia.</p><p><strong>Spełniasz warunki Blue Card? Sprawdzimy Twoją sytuację i poprowadzimy wniosek w MOS — umów konsultację z getpermit.pl.</strong></p>`,
      },
    ],
  },

  // =========================================================================
  // POST 08: Jednolite zezwolenie — dyrektywa single permit 2024/1233
  // =========================================================================
  {
    slug: "jednolite-zezwolenie-dyrektywa-single-permit-2026",
    title: "Jednolite zezwolenie na pobyt i pracę po dyrektywie single permit — co zmienia się od 22 maja 2026?",
    description: "Od 22.05.2026 Polska stosuje nową dyrektywę single permit 2024/1233. Jednolite zezwolenie na pobyt i pracę — krótsze terminy, rozszerzone prawa pracownicze i nowe obowiązki.",
    date: "2026-06-09",
    imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80",
    imageAlt: "Podpisywanie umowy — jednolite zezwolenie na pobyt i pracę, dyrektywa single permit 2024/1233",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "czym-jest-single", title: "Czym jest single permit" },
      { id: "co-zmienia-dyrektywa", title: "Co zmienia dyrektywa 2024/1233" },
      { id: "terminy", title: "Krótsze terminy rozpatrywania" },
      { id: "prawa-pracownika", title: "Prawa pracownika" },
      { id: "praktyczne-skutki", title: "Praktyczne skutki dla pracodawców" },
    ],
    sections: [
      {
        id: "czym-jest-single",
        heading: "Czym jest jednolite zezwolenie na pobyt i pracę (single permit)?",
        content: `<p>Jednolite zezwolenie (single permit) to jeden dokument — karta pobytu — łączący prawo do zamieszkania i pracy w Polsce. Zastępuje osobne procedury: zezwolenie na pobyt i oddzielne zezwolenie na pracę. Od 22 maja 2026 r. Polska stosuje znowelizowaną dyrektywę 2024/1233, aktualizującą wcześniejszą dyrektywę 2011/98/UE.</p>`,
      },
      {
        id: "co-zmienia-dyrektywa",
        heading: "Co zmienia dyrektywa 2024/1233?",
        content: `<ul><li><strong>Ujednolicone okienko</strong> — jeden organ prowadzi całą procedurę pobytowo-pracowniczą</li><li><strong>Uproszczony dostęp do informacji</strong> — cudzoziemiec musi otrzymać pisemne wyjaśnienie o przysługujących mu prawach</li><li><strong>Równe traktowanie</strong> — pracownicy z single permit mają takie same prawa do szkoleń, urlopów i świadczeń jak obywatele UE</li><li><strong>Ochrona przed nadużyciami</strong> — pracodawca nie może uzależniać kontynuacji pracy od nieudzielenia informacji o warunkach zatrudnienia</li></ul>`,
      },
      {
        id: "terminy",
        heading: "Krótsze terminy rozpatrywania",
        content: `<p>Dyrektywa 2024/1233 zobowiązuje państwa członkowskie do rozpatrzenia wniosków o single permit w ciągu <strong>90 dni</strong> od dnia złożenia kompletnej dokumentacji. W Polsce termin ustawowy wynosił dotychczas 1 miesiąc (z możliwością przedłużenia do 2), ale w praktyce urzędy często go przekraczały. Nowe przepisy wzmacniają uprawnienia do składania ponagleń.</p>`,
      },
      {
        id: "prawa-pracownika",
        heading: "Prawa pracownika z single permit",
        content: `<p>Posiadacze jednolitego zezwolenia mają prawo do:</p><ul><li>Takiego samego wynagrodzenia jak pracownicy krajowi na tym samym stanowisku</li><li>Swobody zrzeszania się w związkach zawodowych</li><li>Urlopu wypoczynkowego i zwolnień lekarskich na takich samych zasadach</li><li>Przeniesienia do innego pracodawcy po spełnieniu warunków zezwolenia</li></ul>`,
      },
      {
        id: "praktyczne-skutki",
        heading: "Praktyczne skutki dla pracodawców",
        content: `<p>Pracodawca musi zadbać o to, by cudzoziemiec z single permit nie był dyskryminowany w zakresie wynagrodzenia i warunków pracy. Obowiązuje też zakaz pobierania od pracownika opłat za koszty rekrutacji i legalizacji. Naruszenie tych zasad może skutkować karami finansowymi i utratą możliwości zatrudniania cudzoziemców.</p><p><strong>Masz pytania dotyczące jednolitego zezwolenia po zmianach? Skontaktuj się z getpermit.pl — doradzimy pracodawcom i pracownikom.</strong></p>`,
      },
    ],
  },

  // =========================================================================
  // POST 09: Płaca minimalna 2026 a legalizacja pracy cudzoziemców
  // =========================================================================
  {
    slug: "placa-minimalna-2026-a-legalizacja-pracy-cudzoziemcow",
    title: "Płaca minimalna 4806 zł w 2026 — jak zmiana wpływa na legalizację pracy cudzoziemców",
    description: "Od 1 stycznia 2026 minimalne wynagrodzenie wynosi 4806 zł brutto (31,40 zł/h). Sprawdź, jak zmiana płacy minimalnej wpływa na oświadczenia i zezwolenia na pracę.",
    date: "2026-06-10",
    imageUrl: "https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=1600&q=80",
    imageAlt: "Banknoty i dokumenty — płaca minimalna 4806 zł a legalizacja pracy cudzoziemców w 2026",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "aktualne-stawki", title: "Aktualne stawki od 1 stycznia 2026" },
      { id: "wplyw-na-oswiadczenia", title: "Wpływ na oświadczenia o powierzeniu pracy" },
      { id: "wplyw-na-zezwolenia", title: "Wpływ na zezwolenia na pracę" },
      { id: "obowiazki-pracodawcy", title: "Obowiązki pracodawcy" },
    ],
    sections: [
      {
        id: "aktualne-stawki",
        heading: "Aktualne stawki od 1 stycznia 2026",
        content: `<p>Od 1 stycznia 2026 r. obowiązuje minimalne wynagrodzenie za pracę w wysokości <strong>4806 zł brutto</strong> miesięcznie oraz minimalna stawka godzinowa <strong>31,40 zł brutto</strong>. Wzrost o ponad 5% w stosunku do 2025 r. przekłada się bezpośrednio na warunki legalizacji pracy cudzoziemców.</p>`,
      },
      {
        id: "wplyw-na-oswiadczenia",
        heading: "Wpływ na oświadczenia o powierzeniu pracy",
        content: `<p>Oświadczenie o powierzeniu pracy musi wskazywać wynagrodzenie co najmniej równe minimalnemu. Jeśli wcześniej złożone oświadczenie wskazuje wynagrodzenie niższe niż 4806 zł brutto, może to prowadzić do problemów podczas kontroli PIP. Pracodawcy powinni aktualizować warunki zatrudnienia aneksem lub nowym oświadczeniem.</p>`,
      },
      {
        id: "wplyw-na-zezwolenia",
        heading: "Wpływ na zezwolenia na pracę",
        content: `<p>Zezwolenie na pracę wydawane jest na konkretne stanowisko i wynagrodzenie. Jeśli wynagrodzenie wskazane w zezwoleniu jest niższe od obowiązującego minimum, pracodawca zobowiązany jest do wypłacania pracownikowi co najmniej minimalnej stawki. Przy składaniu nowych wniosków należy od razu wskazywać wynagrodzenie ≥ 4806 zł brutto.</p>`,
      },
      {
        id: "obowiazki-pracodawcy",
        heading: "Obowiązki pracodawcy",
        content: `<p>Pracodawca zatrudniający cudzoziemca nie może wypłacać wynagrodzenia niższego od ustawowego minimum, niezależnie od tego, co wskazuje oświadczenie lub zezwolenie. Niedostosowanie warunków grozi:</p><ul><li>Karą grzywny za naruszenie przepisów o minimalnym wynagrodzeniu</li><li>Cofnięciem zezwolenia na pracę</li><li>Wpisem na listę podmiotów z ograniczeniami w zatrudnianiu cudzoziemców</li></ul><p><strong>Chcesz upewnić się, że Twoje dokumenty pracownicze są zgodne z aktualnymi przepisami? Skonsultuj się z getpermit.pl.</strong></p>`,
      },
    ],
  },

  // =========================================================================
  // POST 10: Pracodawca w systemie MOS — podpis elektroniczny
  // =========================================================================
  {
    slug: "pracodawca-w-systemie-mos-podpis-elektroniczny",
    title: "Pracodawca w systemie MOS — jak podpisać wniosek elektronicznie i co to jest link pracowniczy",
    description: "Od 27.04.2026 pracodawca uczestniczy w procedurze MOS przez e-mail i podpis elektroniczny. Jak działa system, co podpisuje pracodawca i jakie grożą kary za odmowę.",
    date: "2026-06-11",
    imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1600&q=80",
    imageAlt: "Laptop i podpis elektroniczny — pracodawca w systemie MOS przy legalizacji pracy cudzoziemca",
    author: "Zespół getpermit.pl",
    toc: [
      { id: "jak-dziala-link", title: "Jak działa link pracodawcy w MOS" },
      { id: "co-podpisuje", title: "Co podpisuje pracodawca" },
      { id: "podpis-elektroniczny", title: "Wymagany podpis elektroniczny" },
      { id: "co-jesli-odmowa", title: "Co jeśli pracodawca odmówi" },
    ],
    sections: [
      {
        id: "jak-dziala-link",
        heading: "Jak działa link pracodawcy w systemie MOS?",
        content: `<p>W procedurach związanych z legalizacją pracy przez system MOS pracodawca jest aktywnym uczestnikiem — nie tylko wystawia dokumenty, ale musi potwierdzić swój udział elektronicznie. Gdy cudzoziemiec złoży wniosek w MOS, system automatycznie generuje <strong>indywidualny link</strong> i wysyła go na adres e-mail pracodawcy wskazany we wniosku. Pod tym linkiem pracodawca loguje się na swoje konto i podpisuje wymagane dokumenty.</p>`,
      },
      {
        id: "co-podpisuje",
        heading: "Co podpisuje pracodawca?",
        content: `<p>W zależności od rodzaju procedury pracodawca potwierdza elektronicznie:</p><ul><li>Treść oświadczenia o powierzeniu pracy — zgodność danych z umową i rzeczywistymi warunkami zatrudnienia</li><li>Załącznik nr 1 do wniosku o zezwolenie na pobyt i pracę — dane pracodawcy i warunki zatrudnienia</li><li>Zobowiązanie do zatrudnienia cudzoziemca na warunkach wskazanych we wniosku</li></ul>`,
      },
      {
        id: "podpis-elektroniczny",
        heading: "Wymagany podpis elektroniczny",
        content: `<p>System MOS akceptuje następujące formy podpisu pracodawcy:</p><ul><li><strong>Profil Zaufany</strong> — bezpłatny podpis elektroniczny potwierdzony przez ePUAP, dostępny przez e-banking lub dowód osobisty z chipem</li><li><strong>Kwalifikowany podpis elektroniczny</strong> — płatna usługa certyfikowanych dostawców (np. Certum, Autenti), równoważna podpisowi własnoręcznemu</li></ul><p>Pracodawca musi posiadać konto w MOS lub zarejestrować się przed podpisaniem. Czas na podpisanie dokumentów jest ograniczony — zwykle 7-14 dni od wysłania linku.</p>`,
      },
      {
        id: "co-jesli-odmowa",
        heading: "Co jeśli pracodawca odmówi podpisania lub nie zareaguje?",
        content: `<p>Brak podpisu pracodawcy w wyznaczonym terminie powoduje <strong>zawieszenie lub umorzenie postępowania</strong>. Oznacza to, że wniosek cudzoziemca nie będzie rozpatrywany do czasu uzupełnienia brakującego elementu. Pracodawca, który systematycznie odmawia udziału w procedurach MOS, może zostać wpisany na listę podmiotów z ograniczeniami w zatrudnianiu cudzoziemców.</p><p><strong>Potrzebujesz pomocy z rejestracją pracodawcy w MOS lub podpisem elektronicznym? Nasz zespół przeprowadzi Cię przez cały proces — skontaktuj się z getpermit.pl.</strong></p>`,
      },
    ],
  },

];
