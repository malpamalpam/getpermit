import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Mapy slug-ów ze starego katalogu (3 usługi MDX-owe) na nowe slugi z pełnego
 * katalogu w `src/lib/services.ts`. Stosowane jako 308 redirect we wszystkich
 * lokalach, aby zachować SEO i istniejące linki.
 */
const LEGACY_SERVICE_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "karta-pobytu-czasowego", to: "zezwolenie-na-pobyt-czasowy" },
  { from: "zezwolenie-na-prace", to: "zezwolenia-na-prace" },
  { from: "karta-pobytu-stalego", to: "pobyt-staly" },
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
