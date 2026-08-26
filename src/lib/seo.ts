import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

type PathnameKey = keyof typeof routing.pathnames;

/**
 * Generates `alternates` object for Next.js Metadata API.
 * Sets canonical to the current locale's URL and hreflang for all locales.
 */
export function getAlternates(pathnameKey: PathnameKey, locale: string) {
  const pathnames = routing.pathnames[pathnameKey];

  const getPath = (l: string) => {
    if (typeof pathnames === "string") return pathnames;
    return (pathnames as Record<string, string>)[l] ?? pathnames.pl;
  };

  // PL: kanoniczne URL-e bez prefiksu /pl
  const localeUrl = (l: string) =>
    l === "pl" ? `${siteConfig.url}${getPath(l)}` : `${siteConfig.url}/${l}${getPath(l)}`;

  return {
    canonical: localeUrl(locale),
    languages: {
      ...Object.fromEntries(
        routing.locales.map((l) => [l, localeUrl(l)])
      ),
      "x-default": localeUrl("pl"),
    },
  };
}
