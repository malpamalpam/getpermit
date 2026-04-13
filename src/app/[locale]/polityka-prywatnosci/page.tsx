import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Shield, List } from "lucide-react";

export const metadata = {
  title: "Polityka prywatności | getpermit.pl",
  description:
    "Polityka prywatności serwisu getpermit.pl — informacje o przetwarzaniu danych osobowych, prawa użytkowników, RODO.",
  robots: { index: true, follow: true },
};

const TOC = [
  { id: "administrator", title: "§ 1. Administrator danych osobowych" },
  { id: "zakres-danych", title: "§ 2. Zakres zbieranych danych" },
  { id: "cele-przetwarzania", title: "§ 3. Cele i podstawy prawne przetwarzania" },
  { id: "okres-przechowywania", title: "§ 4. Okres przechowywania danych" },
  { id: "prawa-uzytkownikow", title: "§ 5. Prawa Użytkowników" },
  { id: "odbiorcy-danych", title: "§ 6. Odbiorcy danych" },
  { id: "bezpieczenstwo", title: "§ 7. Bezpieczeństwo danych" },
  { id: "zmiany", title: "§ 8. Zmiany Polityki Prywatności" },
];

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sectionClass = "mb-10 scroll-mt-24";
  const headingClass = "mb-4 font-display text-xl font-bold text-primary md:text-2xl";
  const pClass = "mb-3 text-base leading-relaxed text-ink/80";
  const liClass = "ml-6 list-disc py-1 text-base leading-relaxed text-ink/80";

  return (
    <Container className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Shield className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold text-primary md:text-5xl">
            Polityka prywatności
          </h1>
          <p className="mt-3 text-sm text-ink/50">
            Serwis getpermit.pl &nbsp;|&nbsp; Obowiązuje od: 9 kwietnia 2026 r.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
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
                      <a href={`#${item.id}`} className="flex gap-2 text-primary/70 hover:text-accent">
                        <span className="flex-shrink-0 text-accent/60">{i + 1}.</span>
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </details>

            <section id="administrator" className={sectionClass}>
              <h2 className={headingClass}>§ 1. Administrator danych osobowych</h2>
              <ol className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Administratorem danych osobowych zbieranych za pośrednictwem Serwisu getpermit.pl jest UTM Group Grzegorz Stępień, NIP: 9482342576 (dalej: &bdquo;Administrator&rdquo;).
                </li>
                <li className={pClass}>
                  Kontakt z Administratorem w sprawach dotyczących ochrony danych osobowych jest możliwy pod adresem e-mail: <a href="mailto:kontakt@getpermit.pl" className="text-accent hover:underline">kontakt@getpermit.pl</a>.
                </li>
              </ol>
            </section>

            <section id="zakres-danych" className={sectionClass}>
              <h2 className={headingClass}>§ 2. Zakres zbieranych danych</h2>
              <ol start={3} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Administrator zbiera dane osobowe Użytkowników w następującym zakresie:
                  <ul className="mt-2 space-y-1">
                    <li className={liClass}>imię i nazwisko</li>
                    <li className={liClass}>adres e-mail</li>
                    <li className={liClass}>numer telefonu</li>
                    <li className={liClass}>obywatelstwo i kraj pochodzenia (w kontekście usług legalizacyjnych)</li>
                    <li className={liClass}>treść wiadomości przesłanej za pośrednictwem formularza kontaktowego</li>
                    <li className={liClass}>dane techniczne: adres IP, typ przeglądarki, system operacyjny, czas dostępu</li>
                  </ul>
                </li>
                <li className={pClass}>
                  Podanie danych osobowych jest dobrowolne, lecz niezbędne do skorzystania z niektórych funkcjonalności Serwisu (np. formularz kontaktowy, umówienie konsultacji).
                </li>
              </ol>
            </section>

            <section id="cele-przetwarzania" className={sectionClass}>
              <h2 className={headingClass}>§ 3. Cele i podstawy prawne przetwarzania danych</h2>
              <p className={pClass}>Dane osobowe przetwarzane są w następujących celach i na następujących podstawach prawnych:</p>
              <ul className="space-y-1">
                <li className={liClass}><strong>odpowiedź na zapytanie</strong> przesłane przez formularz kontaktowy — art. 6 ust. 1 lit. b) i f) RODO (podjęcie działań przed zawarciem umowy, prawnie uzasadniony interes Administratora)</li>
                <li className={liClass}><strong>świadczenie usług konsultacyjnych i legalizacyjnych</strong> — art. 6 ust. 1 lit. b) RODO (wykonanie umowy)</li>
                <li className={liClass}><strong>marketing bezpośredni usług własnych</strong> — art. 6 ust. 1 lit. f) RODO (prawnie uzasadniony interes Administratora)</li>
                <li className={liClass}><strong>prowadzenie analityki internetowej</strong> — art. 6 ust. 1 lit. a) RODO (zgoda Użytkownika) lub art. 6 ust. 1 lit. f) RODO</li>
                <li className={liClass}><strong>wypełnienie obowiązków prawnych</strong> ciążących na Administratorze — art. 6 ust. 1 lit. c) RODO</li>
              </ul>
            </section>

            <section id="okres-przechowywania" className={sectionClass}>
              <h2 className={headingClass}>§ 4. Okres przechowywania danych</h2>
              <ol start={5} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Dane osobowe przechowywane są przez okres niezbędny do realizacji celów, dla których zostały zebrane:
                  <ul className="mt-2 space-y-1">
                    <li className={liClass}>dane związane z realizacją umowy — przez czas trwania umowy oraz okres przedawnienia roszczeń (do 6 lat)</li>
                    <li className={liClass}>dane przetwarzane na podstawie zgody — do czasu cofnięcia zgody</li>
                    <li className={liClass}>dane z formularza kontaktowego — przez okres 12 miesięcy od ostatniego kontaktu, chyba że dojdzie do zawarcia umowy</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section id="prawa-uzytkownikow" className={sectionClass}>
              <h2 className={headingClass}>§ 5. Prawa Użytkowników</h2>
              <ol start={6} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Użytkownikowi przysługują następujące prawa:
                  <ul className="mt-2 space-y-1">
                    <li className={liClass}>prawo dostępu do swoich danych osobowych (art. 15 RODO)</li>
                    <li className={liClass}>prawo do sprostowania danych (art. 16 RODO)</li>
                    <li className={liClass}>prawo do usunięcia danych — &bdquo;prawo do bycia zapomnianym&rdquo; (art. 17 RODO)</li>
                    <li className={liClass}>prawo do ograniczenia przetwarzania (art. 18 RODO)</li>
                    <li className={liClass}>prawo do przenoszenia danych (art. 20 RODO)</li>
                    <li className={liClass}>prawo do wniesienia sprzeciwu wobec przetwarzania (art. 21 RODO)</li>
                    <li className={liClass}>prawo do cofnięcia zgody w dowolnym momencie (art. 7 ust. 3 RODO)</li>
                  </ul>
                </li>
                <li className={pClass}>
                  W celu realizacji powyższych praw należy skontaktować się z Administratorem pod adresem: <a href="mailto:kontakt@getpermit.pl" className="text-accent hover:underline">kontakt@getpermit.pl</a>.
                </li>
                <li className={pClass}>
                  Użytkownik ma prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa), jeżeli uzna, że przetwarzanie jego danych narusza przepisy RODO.
                </li>
              </ol>
            </section>

            <section id="odbiorcy-danych" className={sectionClass}>
              <h2 className={headingClass}>§ 6. Odbiorcy danych</h2>
              <ol start={9} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Dane osobowe mogą być przekazywane następującym kategoriom odbiorców:
                  <ul className="mt-2 space-y-1">
                    <li className={liClass}>dostawcy usług hostingowych i IT</li>
                    <li className={liClass}>dostawcy narzędzi analitycznych (np. Google Analytics)</li>
                    <li className={liClass}>dostawcy usług e-mail i komunikacyjnych</li>
                    <li className={liClass}>podmioty uprawnione na podstawie przepisów prawa</li>
                  </ul>
                </li>
                <li className={pClass}>
                  Administrator nie przekazuje danych osobowych do państw trzecich spoza Europejskiego Obszaru Gospodarczego, chyba że jest to niezbędne i odbywa się na podstawie odpowiednich zabezpieczeń (np. standardowe klauzule umowne).
                </li>
              </ol>
            </section>

            <section id="bezpieczenstwo" className={sectionClass}>
              <h2 className={headingClass}>§ 7. Bezpieczeństwo danych</h2>
              <ol start={11} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Administrator stosuje odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych przed nieuprawnionym dostępem, utratą, zniszczeniem lub modyfikacją.
                </li>
                <li className={pClass}>
                  Serwis korzysta z protokołu SSL/TLS zapewniającego szyfrowanie transmisji danych.
                </li>
              </ol>
            </section>

            <section id="zmiany" className={sectionClass}>
              <h2 className={headingClass}>§ 8. Zmiany Polityki Prywatności</h2>
              <ol start={13} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Administrator zastrzega sobie prawo do zmiany niniejszej Polityki Prywatności. Aktualny tekst Polityki jest zawsze dostępny w Serwisie.
                </li>
                <li className={pClass}>
                  Polityka Prywatności obowiązuje od dnia 9 kwietnia 2026 r.
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
                      <a href={`#${item.id}`} className="flex gap-2 text-primary/70 hover:text-accent">
                        <span className="flex-shrink-0 text-accent/60">{i + 1}.</span>
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
