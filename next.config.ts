import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Mapy slug-ów ze starego katalogu (3 usługi MDX-owe) na nowe slugi z pełnego
 * katalogu w `src/lib/services.ts`. Stosowane jako 308 redirect we wszystkich
 * lokalach, aby zachować SEO i istniejące linki.
 */
/**
 * Redirecty ze starych slugów PL na nowe + z polskich slugów w EN/RU/UK na zlokalizowane.
 * Format: { from: stary slug, to: nowy slug } — stosowane jako 301 redirect.
 */
const LEGACY_SERVICE_REDIRECTS: Array<{ from: string; to: string }> = [
  // Stare → nowe slugi PL
  { from: "zezwolenia-na-prace", to: "zezwolenie-na-prace" },
  { from: "oswiadczenia-o-powierzeniu-pracy", to: "oswiadczenie-o-powierzeniu-pracy" },
  { from: "zezwolenie-na-pobyt-czasowy", to: "karta-pobytu-czasowego" },
  { from: "pobyt-staly", to: "karta-stalego-pobytu" },
  { from: "tlumaczenia-przysiegle-dokumentow", to: "tlumaczenia-przysiegle" },
  { from: "karta-pobytu-stalego", to: "karta-stalego-pobytu" },
  { from: "legalizacja-fdk", to: "legalizacja-b2b-inkubator" },
  { from: "legalizacja-pracy-fdk", to: "legalizacja-b2b-inkubator" },
  // Konsolidacja B2B inkubator — kanoniczny to krótszy slug
  { from: "legalizacja-pracy-b2b-inkubator", to: "legalizacja-b2b-inkubator" },
];

const LOCALES = ["pl", "en", "ru", "uk"] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const afterFiles = [];

    // ==================== Etap 1: PL bez prefiksu (beforeFiles) ====================
    // beforeFiles rewrites uruchamiają się PRZED filesystem lookup i middleware,
    // więc /uslugi → /pl/uslugi zadziała nawet z localePrefix: "always".
    const beforeFiles = [
      // Root → polska strona główna (bez zmiany URL w przeglądarce)
      { source: "/", destination: "/pl" },
      { source: "/uslugi", destination: "/pl/uslugi" },
      { source: "/uslugi/:path*", destination: "/pl/uslugi/:path*" },
      { source: "/blog", destination: "/pl/blog" },
      { source: "/blog/:path*", destination: "/pl/blog/:path*" },
      { source: "/o-nas", destination: "/pl/o-nas" },
      { source: "/kontakt", destination: "/pl/kontakt" },
      { source: "/polityka-prywatnosci", destination: "/pl/polityka-prywatnosci" },
      { source: "/regulamin", destination: "/pl/regulamin" },
      { source: "/cookies", destination: "/pl/cookies" },
    ];

    // EN: zlokalizowane ścieżki → fizyczne foldery
    afterFiles.push({ source: "/en/services", destination: "/en/uslugi" });
    afterFiles.push({ source: "/en/services/for-employers", destination: "/en/uslugi/dla-pracodawcow" });
    afterFiles.push({ source: "/en/services/:slug", destination: "/en/uslugi/:slug" });

    // Dla pracodawców — zlokalizowane slugi dla dedykowanej podstrony
    afterFiles.push({ source: "/ru/uslugi/dlya-rabotodatelej", destination: "/ru/uslugi/dla-pracodawcow" });
    afterFiles.push({ source: "/uk/poslugy/dlya-robotodavciv", destination: "/uk/uslugi/dla-pracodawcow" });
    afterFiles.push({ source: "/en/about", destination: "/en/o-nas" });
    afterFiles.push({ source: "/en/contact", destination: "/en/kontakt" });
    afterFiles.push({ source: "/en/privacy-policy", destination: "/en/polityka-prywatnosci" });
    afterFiles.push({ source: "/en/terms", destination: "/en/regulamin" });

    // RU: zlokalizowane ścieżki
    afterFiles.push({ source: "/ru/kontakty", destination: "/ru/kontakt" });
    afterFiles.push({ source: "/ru/politika-konfidentsialnosti", destination: "/ru/polityka-prywatnosci" });
    afterFiles.push({ source: "/ru/pravila", destination: "/ru/regulamin" });

    // UK: zlokalizowane ścieżki
    afterFiles.push({ source: "/uk/poslugy", destination: "/uk/uslugi" });
    afterFiles.push({ source: "/uk/poslugy/:slug", destination: "/uk/uslugi/:slug" });
    afterFiles.push({ source: "/uk/pro-nas", destination: "/uk/o-nas" });
    afterFiles.push({ source: "/uk/kontakty", destination: "/uk/kontakt" });
    afterFiles.push({ source: "/uk/polityka-konfidentsijnosti", destination: "/uk/polityka-prywatnosci" });
    afterFiles.push({ source: "/uk/pravyla", destination: "/uk/regulamin" });

    return { beforeFiles, afterFiles };
  },
  async redirects() {
    const redirects: Array<{
      source: string;
      destination: string;
      permanent: boolean;
    }> = [];

    for (const { from, to } of LEGACY_SERVICE_REDIRECTS) {
      // PL: bez prefiksu → canonical bez /pl (jeden skok)
      redirects.push({
        source: `/uslugi/${from}`,
        destination: `/uslugi/${to}`,
        permanent: true,
      });
      // /pl/uslugi/old → /uslugi/new (jeden skok, nie przez /pl/uslugi/new)
      redirects.push({
        source: `/pl/uslugi/${from}`,
        destination: `/uslugi/${to}`,
        permanent: true,
      });
      // EN/RU/UK: zachowaj prefix
      for (const locale of LOCALES) {
        if (locale === "pl") continue;
        redirects.push({
          source: `/${locale}/uslugi/${from}`,
          destination: `/${locale}/uslugi/${to}`,
          permanent: true,
        });
      }
    }

    // Kanoniczne polskie URL-e BEZ /pl — redirect /pl/* → /*
    // (beforeFiles rewrite obsługuje kierunek odwrotny: / → /pl wewnętrznie)
    redirects.push({ source: "/pl", destination: "/", permanent: true });
    redirects.push({ source: "/pl/uslugi", destination: "/uslugi", permanent: true });
    redirects.push({ source: "/pl/uslugi/:path*", destination: "/uslugi/:path*", permanent: true });
    redirects.push({ source: "/pl/blog", destination: "/blog", permanent: true });
    redirects.push({ source: "/pl/blog/:path*", destination: "/blog/:path*", permanent: true });
    redirects.push({ source: "/pl/o-nas", destination: "/o-nas", permanent: true });
    redirects.push({ source: "/pl/kontakt", destination: "/kontakt", permanent: true });
    redirects.push({ source: "/pl/polityka-prywatnosci", destination: "/polityka-prywatnosci", permanent: true });
    redirects.push({ source: "/pl/regulamin", destination: "/regulamin", permanent: true });
    redirects.push({ source: "/pl/cookies", destination: "/cookies", permanent: true });

    // EN: redirect polskich slugów usług na angielskie
    const enServiceRedirects: Array<{ from: string; to: string }> = [
      { from: "zezwolenie-na-prace", to: "work-permit" },
      { from: "oswiadczenie-o-powierzeniu-pracy", to: "employer-declaration" },
      { from: "karta-pobytu-czasowego", to: "temporary-residence-permit" },
      { from: "zezwolenie-na-pobyt-czasowy-i-prace", to: "residence-and-work-permit" },
      { from: "wymiana-karty-pobytu", to: "residence-card-replacement" },
      { from: "rezydent-dlugoterminowy-ue", to: "eu-long-term-resident" },
      { from: "karta-stalego-pobytu", to: "permanent-residence-permit" },
      { from: "ponaglenia-i-odwolania", to: "appeals-and-complaints" },
      { from: "tlumaczenia-przysiegle", to: "sworn-translations" },
      // + stare slugi PL
      { from: "zezwolenia-na-prace", to: "work-permit" },
      { from: "zezwolenie-na-pobyt-czasowy", to: "temporary-residence-permit" },
      { from: "pobyt-staly", to: "permanent-residence-permit" },
      { from: "tlumaczenia-przysiegle-dokumentow", to: "sworn-translations" },
      { from: "oswiadczenia-o-powierzeniu-pracy", to: "employer-declaration" },
    ];
    for (const { from, to } of enServiceRedirects) {
      redirects.push({
        source: `/en/uslugi/${from}`,
        destination: `/en/services/${to}`,
        permanent: true,
      });
      redirects.push({
        source: `/en/services/${from}`,
        destination: `/en/services/${to}`,
        permanent: true,
      });
    }
    // RU: redirect polskich slugów usług na rosyjskie
    const ruServiceRedirects: Array<{ from: string; to: string }> = [
      { from: "zezwolenie-na-prace", to: "razreshenie-na-rabotu" },
      { from: "oswiadczenie-o-powierzeniu-pracy", to: "zayavlenie-o-poruchenii-raboty" },
      { from: "karta-pobytu-czasowego", to: "vremennyj-vid-na-zhitelstvo" },
      { from: "zezwolenie-na-pobyt-czasowy-i-prace", to: "razreshenie-na-prozhivanie-i-rabotu" },
      { from: "eu-blue-card", to: "golubaya-karta-es" },
      { from: "wymiana-karty-pobytu", to: "zamena-karty-pobytu" },
      { from: "rezydent-dlugoterminowy-ue", to: "dolgosrochnyj-rezident-es" },
      { from: "karta-stalego-pobytu", to: "postoyannyj-vid-na-zhitelstvo" },
      { from: "ponaglenia-i-odwolania", to: "zhaloby-i-apellyatsii" },
      { from: "tlumaczenia-przysiegle", to: "prisyazhnye-perevody" },
      { from: "powiadomienia-o-powierzeniu-pracy", to: "uvedomleniya-o-poruchenii-raboty" },
      { from: "legalizacja-b2b-inkubator", to: "legalizaciya-b2b-inkubator" },
      { from: "dla-pracodawcow", to: "dlya-rabotodatelej" },
    ];
    for (const { from, to } of ruServiceRedirects) {
      if (from === to) continue;
      redirects.push({
        source: `/ru/uslugi/${from}`,
        destination: `/ru/uslugi/${to}`,
        permanent: true,
      });
    }

    // UK: redirect polskich slugów usług na ukraińskie
    const ukServiceRedirects: Array<{ from: string; to: string }> = [
      { from: "zezwolenie-na-prace", to: "dozvil-na-robotu" },
      { from: "oswiadczenie-o-powierzeniu-pracy", to: "oswiadchennia-pro-doruchennia-roboty" },
      { from: "karta-pobytu-czasowego", to: "karta-tymchasovogo-pobutu" },
      { from: "zezwolenie-na-pobyt-czasowy-i-prace", to: "dozvil-na-prozyvannia-ta-robotu" },
      { from: "eu-blue-card", to: "blakytna-karta-es" },
      { from: "wymiana-karty-pobytu", to: "zamina-karty-pobutu" },
      { from: "rezydent-dlugoterminowy-ue", to: "dovgostrokovyj-rezydent-es" },
      { from: "karta-stalego-pobytu", to: "karta-postijnogo-pobutu" },
      { from: "ponaglenia-i-odwolania", to: "skargy-ta-apeliatsii" },
      { from: "tlumaczenia-przysiegle", to: "prysyazhni-pereklady" },
      { from: "powiadomienia-o-powierzeniu-pracy", to: "povdomlennya-pro-doruchennya-roboty" },
      { from: "legalizacja-b2b-inkubator", to: "legalizaciya-b2b-inkubator" },
      { from: "dla-pracodawcow", to: "dlya-robotodavciv" },
    ];
    for (const { from, to } of ukServiceRedirects) {
      if (from === to) continue;
      redirects.push({
        source: `/uk/uslugi/${from}`,
        destination: `/uk/uslugi/${to}`,
        permanent: true,
      });
    }

    // Pkt 7: Polish page slugs under EN/RU/UK → redirect to localized slugs
    // EN
    redirects.push({ source: "/en/kontakt", destination: "/en/contact", permanent: true });
    redirects.push({ source: "/en/o-nas", destination: "/en/about", permanent: true });
    redirects.push({ source: "/en/polityka-prywatnosci", destination: "/en/privacy-policy", permanent: true });
    redirects.push({ source: "/en/regulamin", destination: "/en/terms", permanent: true });
    // RU
    redirects.push({ source: "/ru/kontakt", destination: "/ru/kontakty", permanent: true });
    // UK
    redirects.push({ source: "/uk/kontakt", destination: "/uk/kontakty", permanent: true });

    return redirects;
  },
};

export default withNextIntl(nextConfig);
