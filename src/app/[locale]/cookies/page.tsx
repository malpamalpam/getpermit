import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Cookie, List } from "lucide-react";

export const metadata = {
  title: "Polityka cookies | getpermit.pl",
  description:
    "Polityka cookies serwisu getpermit.pl — rodzaje plików cookies, zarządzanie ustawieniami, podstawa prawna.",
  robots: { index: true, follow: true },
};

const TOC = [
  { id: "czym-sa-cookies", title: "§ 1. Czym są pliki cookies" },
  { id: "rodzaje-cookies", title: "§ 2. Rodzaje plików cookies" },
  { id: "podmioty-trzecie", title: "§ 3. Cookies podmiotów trzecich" },
  { id: "okres-przechowywania", title: "§ 4. Okres przechowywania" },
  { id: "zarzadzanie", title: "§ 5. Zarządzanie plikami cookies" },
  { id: "podstawa-prawna", title: "§ 6. Podstawa prawna" },
];

export default async function CookiesPage({
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
            <Cookie className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold text-primary md:text-5xl">
            Polityka cookies
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

            <section id="czym-sa-cookies" className={sectionClass}>
              <h2 className={headingClass}>§ 1. Czym są pliki cookies</h2>
              <ol className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Pliki cookies (ciasteczka) to niewielkie pliki tekstowe, które są zapisywane na urządzeniu końcowym Użytkownika podczas korzystania z Serwisu.
                </li>
                <li className={pClass}>
                  Pliki cookies służą do zapewnienia prawidłowego funkcjonowania Serwisu, poprawy jakości usług oraz dostosowania treści do preferencji Użytkownika.
                </li>
                <li className={pClass}>
                  Pliki cookies nie zawierają danych osobowych umożliwiających bezpośrednią identyfikację Użytkownika.
                </li>
              </ol>
            </section>

            <section id="rodzaje-cookies" className={sectionClass}>
              <h2 className={headingClass}>§ 2. Rodzaje wykorzystywanych plików cookies</h2>
              <p className={pClass}>W Serwisie wykorzystywane są następujące rodzaje plików cookies:</p>
              <ul className="space-y-1">
                <li className={liClass}>
                  <strong>Cookies niezbędne (techniczne)</strong> — zapewniają prawidłowe działanie Serwisu, umożliwiają nawigację i korzystanie z podstawowych funkcji. Nie wymagają zgody Użytkownika.
                </li>
                <li className={liClass}>
                  <strong>Cookies analityczne/statystyczne</strong> — służą do zbierania anonimowych informacji o sposobie korzystania z Serwisu (np. Google Analytics). Pomagają zrozumieć, które strony są najczęściej odwiedzane.
                </li>
                <li className={liClass}>
                  <strong>Cookies funkcjonalne</strong> — zapamiętują preferencje Użytkownika, takie jak wybór języka (polski, angielski, rosyjski, ukraiński) i ustawienia regionalne.
                </li>
                <li className={liClass}>
                  <strong>Cookies marketingowe</strong> — mogą być wykorzystywane do wyświetlania spersonalizowanych reklam i śledzenia skuteczności kampanii marketingowych (np. Meta Pixel).
                </li>
              </ul>
            </section>

            <section id="podmioty-trzecie" className={sectionClass}>
              <h2 className={headingClass}>§ 3. Cookies podmiotów trzecich</h2>
              <ol start={4} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Serwis może korzystać z plików cookies podmiotów trzecich, w szczególności:
                  <ul className="mt-2 space-y-1">
                    <li className={liClass}><strong>Google Analytics</strong> — analityka ruchu na stronie (dostawca: Google LLC)</li>
                    <li className={liClass}><strong>Google Tag Manager</strong> — zarządzanie tagami i skryptami analitycznymi</li>
                    <li className={liClass}><strong>Meta Pixel (Facebook)</strong> — śledzenie konwersji i remarketing (dostawca: Meta Platforms)</li>
                    <li className={liClass}><strong>Vercel Analytics</strong> — analityka wydajności strony (dostawca: Vercel Inc.)</li>
                  </ul>
                </li>
                <li className={pClass}>
                  Podmioty trzecie mogą przetwarzać dane zgodnie z własnymi politykami prywatności, do których zapoznania się zachęcamy.
                </li>
              </ol>
            </section>

            <section id="okres-przechowywania" className={sectionClass}>
              <h2 className={headingClass}>§ 4. Okres przechowywania plików cookies</h2>
              <ol start={6} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Czas przechowywania plików cookies zależy od ich rodzaju:
                  <ul className="mt-2 space-y-1">
                    <li className={liClass}><strong>Cookies sesyjne</strong> — usuwane automatycznie po zamknięciu przeglądarki.</li>
                    <li className={liClass}><strong>Cookies trwałe</strong> — przechowywane na urządzeniu Użytkownika przez określony czas (od kilku dni do 24 miesięcy) lub do momentu ich ręcznego usunięcia.</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section id="zarzadzanie" className={sectionClass}>
              <h2 className={headingClass}>§ 5. Zarządzanie plikami cookies</h2>
              <ol start={7} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Użytkownik może w każdej chwili zmienić ustawienia dotyczące plików cookies za pomocą banera cookies wyświetlanego w Serwisie.
                </li>
                <li className={pClass}>
                  Użytkownik może również zarządzać plikami cookies na poziomie przeglądarki internetowej. Większość przeglądarek domyślnie akceptuje pliki cookies, jednak ustawienia te można zmienić, w tym zablokować cookies lub usunąć zapisane pliki.
                </li>
                <li className={pClass}>
                  Instrukcje zarządzania plikami cookies w popularnych przeglądarkach:
                  <ul className="mt-2 space-y-1">
                    <li className={liClass}><strong>Google Chrome:</strong> Ustawienia &gt; Prywatność i bezpieczeństwo &gt; Pliki cookie</li>
                    <li className={liClass}><strong>Mozilla Firefox:</strong> Ustawienia &gt; Prywatność i bezpieczeństwo &gt; Ciasteczka i dane stron</li>
                    <li className={liClass}><strong>Safari:</strong> Preferencje &gt; Prywatność &gt; Zarządzaj danymi witryn</li>
                    <li className={liClass}><strong>Microsoft Edge:</strong> Ustawienia &gt; Prywatność, wyszukiwanie i usługi &gt; Pliki cookie</li>
                  </ul>
                </li>
                <li className={pClass}>
                  Ograniczenie stosowania plików cookies może wpłynąć na niektóre funkcjonalności Serwisu.
                </li>
              </ol>
            </section>

            <section id="podstawa-prawna" className={sectionClass}>
              <h2 className={headingClass}>§ 6. Podstawa prawna</h2>
              <ol start={11} className="list-decimal space-y-2 pl-6">
                <li className={pClass}>
                  Pliki cookies niezbędne (techniczne) są stosowane na podstawie art. 173 ust. 3 ustawy Prawo telekomunikacyjne — są konieczne do świadczenia usługi.
                </li>
                <li className={pClass}>
                  Pozostałe pliki cookies są stosowane na podstawie zgody Użytkownika (art. 173 ust. 2 ustawy Prawo telekomunikacyjne w związku z art. 6 ust. 1 lit. a) RODO).
                </li>
                <li className={pClass}>
                  Użytkownik może wycofać zgodę w dowolnym momencie za pośrednictwem banera cookies lub ustawień przeglądarki, co nie wpływa na zgodność z prawem przetwarzania dokonanego przed jej wycofaniem.
                </li>
                <li className={pClass}>
                  Polityka Cookies obowiązuje od dnia 9 kwietnia 2026 r.
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
