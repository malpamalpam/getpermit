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

  return {
    canonical: `${siteConfig.url}/${locale}${getPath(locale)}`,
    languages: {
      ...Object.fromEntries(
        routing.locales.map((l) => [l, `${siteConfig.url}/${l}${getPath(l)}`])
      ),
      "x-default": `${siteConfig.url}/en${getPath("en")}`,
    },
  };
}
