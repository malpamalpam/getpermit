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
];

const LOCALES = ["pl", "en", "ru", "uk"] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
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
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const rewrites = [];

    // EN: zlokalizowane ścieżki → fizyczne foldery
    rewrites.push({ source: "/en/services", destination: "/en/uslugi" });
    rewrites.push({ source: "/en/services/:slug", destination: "/en/uslugi/:slug" });
    rewrites.push({ source: "/en/about", destination: "/en/o-nas" });
    rewrites.push({ source: "/en/contact", destination: "/en/kontakt" });
    rewrites.push({ source: "/en/privacy-policy", destination: "/en/polityka-prywatnosci" });
    rewrites.push({ source: "/en/terms", destination: "/en/regulamin" });

    // RU: zlokalizowane ścieżki
    rewrites.push({ source: "/ru/kontakty", destination: "/ru/kontakt" });
    rewrites.push({ source: "/ru/politika-konfidentsialnosti", destination: "/ru/polityka-prywatnosci" });
    rewrites.push({ source: "/ru/pravila", destination: "/ru/regulamin" });

    // UK: zlokalizowane ścieżki
    rewrites.push({ source: "/uk/poslugy", destination: "/uk/uslugi" });
    rewrites.push({ source: "/uk/poslugy/:slug", destination: "/uk/uslugi/:slug" });
    rewrites.push({ source: "/uk/pro-nas", destination: "/uk/o-nas" });
    rewrites.push({ source: "/uk/kontakty", destination: "/uk/kontakt" });
    rewrites.push({ source: "/uk/polityka-konfidentsijnosti", destination: "/uk/polityka-prywatnosci" });
    rewrites.push({ source: "/uk/pravyla", destination: "/uk/regulamin" });

    return rewrites;
  },
  async redirects() {
    const redirects: Array<{
      source: string;
      destination: string;
      permanent: boolean;
    }> = [];

    for (const { from, to } of LEGACY_SERVICE_REDIRECTS) {
      // Default locale (pl) — bez prefiksu
      redirects.push({
        source: `/uslugi/${from}`,
        destination: `/uslugi/${to}`,
        permanent: true,
      });
      // Pozostałe lokale z prefiksem
      for (const locale of LOCALES) {
        if (locale === "pl") continue;
        redirects.push({
          source: `/${locale}/uslugi/${from}`,
          destination: `/${locale}/uslugi/${to}`,
          permanent: true,
        });
      }
    }

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
    // UWAGA: redirecty EN/RU/UK ścieżek bazowych (uslugi→services, o-nas→about itd.)
    // są obsługiwane automatycznie przez next-intl middleware (pathnames config w routing.ts).
    // NIE dodawaj ich tutaj — kolidują z middleware rewrite.

    // localePrefix: "always" — ścieżki bez /pl muszą redirectować
    const noLocalePaths = [
      "/",
      "/regulamin",
      "/polityka-prywatnosci",
      "/cookies",
      "/uslugi",
      "/o-nas",
      "/kontakt",
      "/blog",
      "/blog/:slug*",
    ];
    for (const path of noLocalePaths) {
      redirects.push({
        source: path,
        destination: `/pl${path === "/" ? "" : path}`,
        permanent: false,
      });
    }

    return redirects;
  },
};

export default withNextIntl(nextConfig);
