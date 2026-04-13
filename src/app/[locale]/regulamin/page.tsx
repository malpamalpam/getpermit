import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { FileText, List } from "lucide-react";

export const metadata = {
  title: "Regulamin serwisu | getpermit.pl",
  description:
    "Regulamin korzystania z serwisu getpermit.pl — zasady świadczenia usług, formularz kontaktowy, reklamacje, odstąpienie od umowy.",
  robots: { index: true, follow: true },
};

const TOC = [
  { id: "postanowienia-ogolne", title: "§ 1. Postanowienia ogólne" },
  { id: "definicje", title: "§ 2. Definicje" },
  { id: "zakres-uslug", title: "§ 3. Rodzaje i zakres usług" },
  { id: "warunki-korzystania", title: "§ 4. Warunki korzystania z Serwisu" },
  { id: "formularz-kontaktowy", title: "§ 5. Formularz kontaktowy" },
  { id: "odpowiedzialnosc", title: "§ 6. Odpowiedzialność" },
  { id: "wlasnosc-intelektualna", title: "§ 7. Własność intelektualna" },
  { id: "reklamacje", title: "§ 8. Reklamacje" },
  { id: "odstapienie", title: "§ 9. Odstąpienie od umowy" },
  { id: "postanowienia-koncowe", title: "§ 10. Postanowienia końcowe" },
];

export default async function RegulaminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sectionClass = "mb-10 scroll-mt-24";
  const headingClass =
    "mb-4 font-display text-xl font-bold text-primary md:text-2xl";
  const pClass = "mb-3 text-base leading-relaxed text-ink/80";
  const liClass = "ml-6 list-disc py-1 text-base leading-relaxed text-ink/80";

  return (
    <Container className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <FileText className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold text-primary md:text-5xl">
            Regulamin serwisu getpermit.pl
          </h1>
          <p className="mt-3 text-sm text-ink/50">
            Serwis getpermit.pl &nbsp;|&nbsp; Obowiązuje od: 9 kwietnia 2026 r.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
          {/* Content */}
          <div>
            {/* Mobile TOC */}
            <details className="mb-10 rounded-2xl border border-primary/10 bg-surface p-5 lg:hidden">
              <summary className="flex cursor-pointer items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-primary/60">
                <List className="h-4 w-4" aria-hidden="true" />
                Spis treści
              </summary>
              <nav className="mt-4">
                <ol className="space-y-2 text-sm">
                  {TOC.map((item, i) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex gap-2 text-primary/70 hover:text-accent"
                      >
                        <span className="flex-shrink-0 text-accent/60">{i + 1}.</span>
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </details>

            <section id="postanowienia-ogolne" className={sectionClass}>
              <h2 className={headingClass}>§ 1. Postanowienia ogólne</h2>
              <ol className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Niniejszy Regulamin określa zasady korzystania z serwisu
                  internetowego dostępnego pod adresem https://getpermit.pl
                  (dalej: &bdquo;Serwis&rdquo;).
                </li>
                <li className={pClass}>
                  Właścicielem i operatorem Serwisu jest UTM Group Grzegorz
                  Stępień, NIP: 9482342576 (dalej:
                  &bdquo;Usługodawca&rdquo;).
                </li>
                <li className={pClass}>
                  Korzystanie z Serwisu oznacza akceptację niniejszego
                  Regulaminu w całości.
                </li>
                <li className={pClass}>
                  Regulamin jest udostępniany nieodpłatnie za pośrednictwem
                  Serwisu w formie umożliwiającej jego pobranie, utrwalenie
                  i wydrukowanie.
                </li>
              </ol>
            </section>

            <section id="definicje" className={sectionClass}>
              <h2 className={headingClass}>§ 2. Definicje</h2>
              <ol start={5} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  <strong>Serwis</strong> — strona internetowa dostępna pod
                  adresem https://getpermit.pl wraz ze wszystkimi
                  podstronami.
                </li>
                <li className={pClass}>
                  <strong>Użytkownik</strong> — każda osoba fizyczna, osoba
                  prawna lub jednostka organizacyjna nieposiadająca
                  osobowości prawnej, korzystająca z Serwisu.
                </li>
                <li className={pClass}>
                  <strong>Usługodawca</strong> — UTM Group Grzegorz Stępień,
                  NIP: 9482342576.
                </li>
                <li className={pClass}>
                  <strong>Usługi</strong> — usługi świadczone drogą
                  elektroniczną za pośrednictwem Serwisu, w szczególności
                  udostępnianie treści informacyjnych, formularz kontaktowy,
                  możliwość umówienia konsultacji.
                </li>
                <li className={pClass}>
                  <strong>Konsultacja</strong> — bezpłatna lub odpłatna
                  rozmowa z ekspertem Usługodawcy dotycząca legalizacji
                  pobytu lub pracy w Polsce.
                </li>
              </ol>
            </section>

            <section id="zakres-uslug" className={sectionClass}>
              <h2 className={headingClass}>§ 3. Rodzaje i zakres usług</h2>
              <ol start={10} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Za pośrednictwem Serwisu Usługodawca świadczy następujące
                  usługi elektroniczne:
                  <ul className="mt-2 space-y-1">
                    <li className={liClass}>
                      udostępnianie treści informacyjnych dotyczących
                      legalizacji pobytu i pracy cudzoziemców w Polsce
                    </li>
                    <li className={liClass}>
                      formularz kontaktowy umożliwiający przesłanie zapytania
                    </li>
                    <li className={liClass}>
                      możliwość umówienia bezpłatnej konsultacji
                    </li>
                    <li className={liClass}>
                      prezentacja oferty usług Usługodawcy, w tym: pomoc
                      w uzyskaniu kart pobytu (czasowego, stałego),
                      zezwoleń na pracę (typ A, oświadczenia o powierzeniu
                      pracy), EU Blue Card, statusu rezydenta
                      długoterminowego UE, procedur odwoławczych, tłumaczeń
                      przysięgłych
                    </li>
                  </ul>
                </li>
                <li className={pClass}>
                  Usługi świadczone za pośrednictwem Serwisu mają charakter
                  informacyjny i kontaktowy. Szczegółowe warunki świadczenia
                  usług odpłatnych (pomoc w legalizacji pobytu/pracy)
                  regulowane są odrębnymi umowami zawieranymi indywidualnie
                  z Użytkownikiem.
                </li>
              </ol>
            </section>

            <section id="warunki-korzystania" className={sectionClass}>
              <h2 className={headingClass}>
                § 4. Warunki korzystania z Serwisu
              </h2>
              <ol start={12} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Korzystanie z Serwisu jest nieodpłatne i nie wymaga
                  rejestracji.
                </li>
                <li className={pClass}>
                  Do korzystania z Serwisu niezbędne jest posiadanie
                  urządzenia z dostępem do sieci Internet oraz przeglądarki
                  internetowej obsługującej JavaScript i pliki cookies.
                </li>
                <li className={pClass}>
                  Użytkownik zobowiązany jest do korzystania z Serwisu
                  w sposób zgodny z prawem, niniejszym Regulaminem oraz
                  dobrymi obyczajami.
                </li>
                <li className={pClass}>
                  Zakazane jest dostarczanie przez Użytkownika treści
                  o charakterze bezprawnym, w tym treści naruszających prawa
                  osób trzecich.
                </li>
              </ol>
            </section>

            <section id="formularz-kontaktowy" className={sectionClass}>
              <h2 className={headingClass}>§ 5. Formularz kontaktowy</h2>
              <ol start={16} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Serwis umożliwia przesłanie zapytania za pośrednictwem
                  formularza kontaktowego.
                </li>
                <li className={pClass}>
                  W celu przesłania zapytania Użytkownik podaje dane
                  niezbędne do kontaktu, w szczególności: imię, adres
                  e-mail, numer telefonu oraz treść wiadomości.
                </li>
                <li className={pClass}>
                  Przesłanie formularza kontaktowego jest równoznaczne
                  z wyrażeniem zgody na przetwarzanie podanych danych
                  osobowych w celu udzielenia odpowiedzi na zapytanie,
                  zgodnie z Polityką Prywatności.
                </li>
                <li className={pClass}>
                  Usługodawca dokłada starań, aby odpowiedzieć na zapytanie
                  w ciągu 24 godzin w dni robocze.
                </li>
              </ol>
            </section>

            <section id="odpowiedzialnosc" className={sectionClass}>
              <h2 className={headingClass}>§ 6. Odpowiedzialność</h2>
              <ol start={20} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Usługodawca dokłada wszelkich starań, aby informacje
                  zamieszczone w Serwisie były aktualne, rzetelne
                  i kompletne, jednak nie ponosi odpowiedzialności za ich
                  dokładność i kompletność.
                </li>
                <li className={pClass}>
                  Treści zamieszczone w Serwisie mają charakter wyłącznie
                  informacyjny i nie stanowią porady prawnej ani oferty
                  w rozumieniu Kodeksu cywilnego.
                </li>
                <li className={pClass}>
                  Usługodawca nie ponosi odpowiedzialności za przerwy
                  w dostępie do Serwisu spowodowane siłą wyższą, awariami
                  technicznymi lub pracami konserwacyjnymi.
                </li>
                <li className={pClass}>
                  Usługodawca nie ponosi odpowiedzialności za treści
                  zamieszczone na stronach zewnętrznych, do których mogą
                  prowadzić linki umieszczone w Serwisie.
                </li>
              </ol>
            </section>

            <section id="wlasnosc-intelektualna" className={sectionClass}>
              <h2 className={headingClass}>§ 7. Własność intelektualna</h2>
              <ol start={24} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Wszelkie treści zamieszczone w Serwisie, w tym teksty,
                  grafiki, logotypy, zdjęcia, układ strony oraz
                  oprogramowanie, stanowią własność Usługodawcy lub są
                  wykorzystywane na podstawie odpowiednich licencji
                  i podlegają ochronie prawnej.
                </li>
                <li className={pClass}>
                  Kopiowanie, rozpowszechnianie, modyfikowanie lub
                  wykorzystywanie treści Serwisu bez pisemnej zgody
                  Usługodawcy jest zabronione.
                </li>
              </ol>
            </section>

            <section id="reklamacje" className={sectionClass}>
              <h2 className={headingClass}>§ 8. Reklamacje</h2>
              <ol start={26} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Użytkownik ma prawo składać reklamacje dotyczące
                  funkcjonowania Serwisu.
                </li>
                <li className={pClass}>
                  Reklamacje należy kierować na adres e-mail:{" "}
                  <a
                    href="mailto:kontakt@getpermit.pl"
                    className="text-accent hover:underline"
                  >
                    kontakt@getpermit.pl
                  </a>
                  .
                </li>
                <li className={pClass}>
                  Reklamacja powinna zawierać: dane kontaktowe Użytkownika,
                  opis problemu oraz oczekiwany sposób rozwiązania.
                </li>
                <li className={pClass}>
                  Usługodawca rozpatruje reklamację w terminie 14 dni od dnia
                  jej otrzymania i informuje Użytkownika o sposobie jej
                  rozpatrzenia drogą elektroniczną.
                </li>
              </ol>
            </section>

            <section id="odstapienie" className={sectionClass}>
              <h2 className={headingClass}>§ 9. Odstąpienie od umowy</h2>
              <ol start={30} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Użytkownik będący konsumentem ma prawo odstąpić od umowy
                  o świadczenie usług drogą elektroniczną bez podania
                  przyczyny w terminie 14 dni od dnia zawarcia umowy,
                  składając oświadczenie na adres e-mail:{" "}
                  <a
                    href="mailto:kontakt@getpermit.pl"
                    className="text-accent hover:underline"
                  >
                    kontakt@getpermit.pl
                  </a>
                  .
                </li>
                <li className={pClass}>
                  Prawo odstąpienia nie przysługuje, jeżeli Usługodawca
                  wykonał w pełni usługę za wyraźną zgodą Użytkownika, który
                  został poinformowany przed rozpoczęciem świadczenia, że po
                  jego spełnieniu utraci prawo odstąpienia.
                </li>
              </ol>
            </section>

            <section id="postanowienia-koncowe" className={sectionClass}>
              <h2 className={headingClass}>
                § 10. Postanowienia końcowe
              </h2>
              <ol start={32} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Usługodawca zastrzega sobie prawo do zmiany niniejszego
                  Regulaminu. Zmiany wchodzą w życie z dniem ich
                  opublikowania w Serwisie.
                </li>
                <li className={pClass}>
                  W sprawach nieuregulowanych niniejszym Regulaminem
                  zastosowanie mają przepisy prawa polskiego,
                  w szczególności Kodeksu cywilnego, ustawy o świadczeniu
                  usług drogą elektroniczną oraz ustawy o prawach
                  konsumenta.
                </li>
                <li className={pClass}>
                  Wszelkie spory wynikające z korzystania z Serwisu będą
                  rozstrzygane przez sąd właściwy zgodnie z przepisami prawa
                  polskiego.
                </li>
                <li className={pClass}>
                  Regulamin obowiązuje od dnia 9 kwietnia 2026 r.
                </li>
              </ol>
            </section>
          </div>

          {/* Desktop TOC sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-primary/10 bg-surface p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-primary/60">
                <List className="h-4 w-4" aria-hidden="true" />
                Spis treści
              </h3>
              <nav>
                <ol className="space-y-2 text-sm">
                  {TOC.map((item, i) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex gap-2 text-primary/70 hover:text-accent"
                      >
                        <span className="flex-shrink-0 text-accent/60">
                          {i + 1}.
                        </span>
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </Container>
  );
}
