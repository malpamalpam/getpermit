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
    imageUrl: "/blog/karta-pobytu-czasowego.svg",
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
<li>Ubiegania si\u0119 o numer PESEL</li>
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
<tr><td>Wype\u0142niony wniosek</td><td>Formularz dost\u0119pny w systemie MOS lub w urz\u0119dzie</td></tr>
<tr><td>4 aktualne zdj\u0119cia biometryczne</td><td>35\u00d745 mm, kolorowe, na bia\u0142ym tle</td></tr>
<tr><td>Kserokopia paszportu</td><td>Wszystkie zapisane strony</td></tr>
<tr><td>Potwierdzenie uiszczenia op\u0142aty skarbowej</td><td>340 z\u0142 (lub 440 z\u0142 w przypadku pracy)</td></tr>
<tr><td>Ubezpieczenie zdrowotne</td><td>Na ca\u0142y okres pobytu lub umowa z pracodawc\u0105</td></tr>
<tr><td>Potwierdzenie zamieszkania</td><td>Umowa najmu, meldunek lub o\u015bwiadczenie w\u0142a\u015bciciela</td></tr>
<tr><td>\u0179r\u00f3d\u0142o dochodu</td><td>Umowa o prac\u0119, za\u015bwiadczenie z banku, zeznanie PIT</td></tr>
</tbody>
</table>
<p>Dodatkowe dokumenty dla os\u00f3b pracuj\u0105cych: za\u015bwiadczenie od pracodawcy, informacja starosty (test rynku pracy), za\u0142\u0105cznik nr 1. <a href="/pl/uslugi/zezwolenie-na-pobyt-czasowy">Sprawd\u017a pe\u0142n\u0105 list\u0119 dla Twojego przypadku</a>.</p>`,
      },
      {
        id: "procedura",
        heading: "Procedura uzyskania karty pobytu \u2014 krok po kroku",
        content: `<p>Proces uzyskania karty pobytu czasowego sk\u0142ada si\u0119 z nast\u0119puj\u0105cych etap\u00f3w:</p>
<ol>
<li><strong>Przygotowanie dokument\u00f3w</strong> \u2014 skompletowanie wszystkich wymaganych za\u0142\u0105cznik\u00f3w</li>
<li><strong>Z\u0142o\u017cenie wniosku</strong> \u2014 przez system MOS lub osobi\u015bcie w urz\u0119dzie wojew\u00f3dzkim</li>
<li><strong>Pobranie odcisk\u00f3w palc\u00f3w</strong> \u2014 biometria pobierana w urz\u0119dzie</li>
<li><strong>Otrzymanie stempla w paszporcie</strong> \u2014 potwierdzenie z\u0142o\u017cenia wniosku, legalizuje pobyt na czas post\u0119powania</li>
<li><strong>Oczekiwanie na decyzj\u0119</strong> \u2014 urz\u0105d mo\u017ce wzywa\u0107 do uzupe\u0142nienia dokument\u00f3w</li>
<li><strong>Odbi\u00f3r karty pobytu</strong> \u2014 po pozytywnej decyzji, karta jest produkowana w ci\u0105gu 2\u20134 tygodni</li>
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
        content: `<p>Ustawowy termin rozpatrzenia wniosku to <strong>60 dni</strong> od z\u0142o\u017cenia kompletnej dokumentacji. W praktyce czas oczekiwania zale\u017cy od urz\u0119du wojew\u00f3dzkiego:</p>
<ul>
<li><strong>Mazowiecki UW (Warszawa)</strong> \u2014 4\u20138 miesi\u0119cy</li>
<li><strong>Ma\u0142opolski UW (Krak\u00f3w)</strong> \u2014 3\u20136 miesi\u0119cy</li>
<li><strong>Dolno\u015bl\u0105ski UW (Wroc\u0142aw)</strong> \u2014 3\u20135 miesi\u0119cy</li>
<li><strong>Pomorski UW (Gda\u0144sk)</strong> \u2014 2\u20134 miesi\u0105ce</li>
</ul>
<p>Przekroczenie terminu ustawowego uprawnia do z\u0142o\u017cenia <strong>ponaglenia</strong> do wojewody. W przypadku dalszej bezczynno\u015bci mo\u017cna wnie\u015b\u0107 skarg\u0119 do Wojew\u00f3dzkiego S\u0105du Administracyjnego. <a href="/pl/uslugi/ponaglenia-i-odwolania">Pomagamy w procedurze odwo\u0142awczej</a>.</p>`,
      },
      {
        id: "najczestsze-bledy",
        heading: "Najcz\u0119stsze b\u0142\u0119dy we wnioskach o kart\u0119 pobytu",
        content: `<p>Na podstawie naszego do\u015bwiadczenia z ponad 5000 spraw, najcz\u0119stsze b\u0142\u0119dy to:</p>
<ol>
<li><strong>Z\u0142o\u017cenie wniosku po terminie</strong> \u2014 wniosek musi by\u0107 z\u0142o\u017cony przed wyga\u015bni\u0119ciem wizy lub ruchu bezwizowego</li>
<li><strong>Brak t\u0142umacze\u0144 przysi\u0119g\u0142ych</strong> \u2014 wszystkie dokumenty zagraniczne wymagaj\u0105 t\u0142umaczenia przez t\u0142umacza przysi\u0119g\u0142ego</li>
<li><strong>Niekompletna dokumentacja</strong> \u2014 brak za\u015bwiadcze\u0144 od pracodawcy lub informacji starosty</li>
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
    imageUrl: "/blog/karta-stalego-pobytu.svg",
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
<li>Wype\u0142niony formularz wniosku (2 egzemplarze)</li>
<li>4 zdj\u0119cia biometryczne</li>
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
<p>Czas oczekiwania: od <strong>3 do 12 miesi\u0119cy</strong> w zale\u017cno\u015bci od z\u0142o\u017cono\u015bci sprawy i obci\u0105\u017cenia urz\u0119du. Sprawy z Kart\u0105 Polaka rozpatrywane s\u0105 zwykle szybciej.</p>
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
    imageUrl: "/blog/niebieska-karta-ue.svg",
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
<li><strong>Brak testu rynku pracy</strong> \u2014 nie trzeba uzyskiwa\u0107 informacji starosty</li>
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
<li>Wype\u0142niony formularz wniosku o zezwolenie na pobyt czasowy</li>
<li>4 zdj\u0119cia biometryczne</li>
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
<tr><td>Test rynku pracy</td><td>Nie wymagany</td><td>Wymagany (z wyj\u0105tkami)</td></tr>
<tr><td>Mobilno\u015b\u0107 w UE</td><td>Tak</td><td>Nie</td></tr>
<tr><td>\u0141\u0105czenie rodzin</td><td>Uproszczone</td><td>Standardowe</td></tr>
<tr><td>Op\u0142ata skarbowa</td><td>440 z\u0142</td><td>440 z\u0142</td></tr>
<tr><td>Czas oczekiwania</td><td>1\u20133 miesi\u0105ce</td><td>3\u20136 miesi\u0119cy</td></tr>
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
<p>Zazwyczaj 1\u20133 miesi\u0105ce, co jest szybsze ni\u017c standardowe zezwolenie na pobyt i prac\u0119 (3\u20136 miesi\u0119cy).</p></details>
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
    imageUrl: "/blog/wnioski-mos.svg",
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
    imageUrl: "/blog/ile-kosztuje-karta-pobytu.svg",
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
      { id: "oplaty-skarbowe", heading: "Opłaty skarbowe za kartę pobytu w 2026 roku", content: `<table><thead><tr><th>Rodzaj zezwolenia</th><th>Opłata skarbowa</th></tr></thead><tbody><tr><td>Pobyt czasowy</td><td><strong>340 zł</strong></td></tr><tr><td>Pobyt czasowy i praca (jednolite)</td><td><strong>440 zł</strong></td></tr><tr><td>Niebieska Karta UE</td><td><strong>440 zł</strong></td></tr><tr><td>Pobyt stały</td><td><strong>640 zł</strong></td></tr><tr><td>Rezydent długoterminowy UE</td><td><strong>640 zł</strong></td></tr><tr><td>Przedłużenie wizy</td><td><strong>406 zł</strong></td></tr></tbody></table><p>Opłatę należy uiścić <strong>przed złożeniem wniosku</strong>.</p>` },
      { id: "wydanie-karty", heading: "Opłata za wydanie karty", content: `<p>Po wydaniu pozytywnej decyzji urząd produkuje plastikową kartę. Opłata za wydanie karty wynosi <strong>100 zł</strong> niezależnie od rodzaju zezwolenia. Czas produkcji: <strong>2–4 tygodnie</strong> od daty decyzji.</p>` },
      { id: "tlumaczenia", heading: "Koszty tłumaczeń przysięgłych", content: `<table><thead><tr><th>Dokument</th><th>Przybliżony koszt</th></tr></thead><tbody><tr><td>Paszport</td><td>50–100 zł</td></tr><tr><td>Akt urodzenia</td><td>60–80 zł</td></tr><tr><td>Akt małżeństwa</td><td>60–80 zł</td></tr><tr><td>Dyplom ukończenia studiów</td><td>80–150 zł</td></tr></tbody></table><p>Łączne koszty tłumaczeń w typowej sprawie: <strong>150–400 zł</strong>. <a href="/pl/uslugi/tlumaczenia-przysiegle-dokumentow">Oferujemy konkurencyjne ceny tłumaczeń</a>.</p>` },
      { id: "pomoc-prawna", heading: "Koszt profesjonalnej pomocy prawnej", content: `<ul><li><strong>Wstępna konsultacja</strong> — bezpłatna (w getpermit.pl)</li><li><strong>Przygotowanie wniosku</strong> — od 600 zł</li><li><strong>Kompleksowe prowadzenie sprawy</strong> — od 800 zł</li><li><strong>Pobyt stały / rezydent UE</strong> — od 1 200 zł</li><li><strong>Ponaglenie / odwołanie</strong> — od 500 zł</li></ul><p>Nasz wskaźnik skuteczności wynosi <strong>98%</strong>. <a href="/pl/kontakt">Umów się na bezpłatną wycenę</a>.</p>` },
      { id: "calkowity-koszt", heading: "Całkowity koszt karty pobytu — podsumowanie", content: `<table><thead><tr><th>Składnik</th><th>Pobyt czasowy</th><th>Czas. + praca</th><th>Pobyt stały</th></tr></thead><tbody><tr><td>Opłata skarbowa</td><td>340 zł</td><td>440 zł</td><td>640 zł</td></tr><tr><td>Wydanie karty</td><td>100 zł</td><td>100 zł</td><td>100 zł</td></tr><tr><td>Tłumaczenia</td><td>150–400 zł</td><td>150–400 zł</td><td>200–500 zł</td></tr><tr><td>Pomoc prawna (opcjonalnie)</td><td>od 600 zł</td><td>od 800 zł</td><td>od 1 200 zł</td></tr><tr><td><strong>Razem</strong></td><td><strong>590–1 440 zł</strong></td><td><strong>690–1 740 zł</strong></td><td><strong>940–2 440 zł</strong></td></tr></tbody></table>` },
      { id: "faq-koszty", heading: "FAQ — koszty karty pobytu", content: `<div class="faq-list"><details><summary><strong>Czy opłata skarbowa jest zwracana w razie odmowy?</strong></summary><p>Nie. Opłata skarbowa nie podlega zwrotowi w przypadku decyzji negatywnej. Dlatego warto skorzystać z profesjonalnej pomocy, aby zminimalizować ryzyko odmowy.</p></details><details><summary><strong>Ile kosztuje karta pobytu dla obywatela Ukrainy?</strong></summary><p>Opłaty są takie same dla wszystkich cudzoziemców, niezależnie od obywatelstwa. Ukraińcy objęci ochroną czasową mogą korzystać z uproszczonych procedur, ale opłaty pozostają standardowe.</p></details><details><summary><strong>Czy konsultacja w getpermit.pl jest naprawdę bezpłatna?</strong></summary><p>Tak. Wstępna konsultacja jest całkowicie bezpłatna i niezobowiązująca. Oceniamy Twoją sytuację, proponujemy strategię i podajemy dokładną wycenę.</p></details></div>` },
    ],
  },

];
