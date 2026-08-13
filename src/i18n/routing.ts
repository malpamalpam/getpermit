import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["pl", "en", "ru", "uk"],
  defaultLocale: "pl",
  // Każdy locale ma prefix w URL (/pl, /en, /ru, /uk).
  // Root "/" robi redirect na /pl. Wymagane dla kompatybilności z Vercel Edge.
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/uslugi": {
      pl: "/uslugi",
      en: "/services",
      ru: "/uslugi",
      uk: "/poslugy",
    },
    "/uslugi/[slug]": {
      pl: "/uslugi/[slug]",
      en: "/services/[slug]",
      ru: "/uslugi/[slug]",
      uk: "/poslugy/[slug]",
    },
    "/o-nas": {
      pl: "/o-nas",
      en: "/about",
      ru: "/o-nas",
      uk: "/pro-nas",
    },
    "/kontakt": {
      pl: "/kontakt",
      en: "/contact",
      ru: "/kontakty",
      uk: "/kontakty",
    },
    "/blog": {
      pl: "/blog",
      en: "/blog",
      ru: "/blog",
      uk: "/blog",
    },
    "/blog/[slug]": {
      pl: "/blog/[slug]",
      en: "/blog/[slug]",
      ru: "/blog/[slug]",
      uk: "/blog/[slug]",
    },
    "/polityka-prywatnosci": {
      pl: "/polityka-prywatnosci",
      en: "/privacy-policy",
      ru: "/politika-konfidentsialnosti",
      uk: "/polityka-konfidentsijnosti",
    },
    "/regulamin": {
      pl: "/regulamin",
      en: "/terms",
      ru: "/pravila",
      uk: "/pravyla",
    },
    "/cookies": {
      pl: "/cookies",
      en: "/cookies",
      ru: "/cookies",
      uk: "/cookies",
    },
    // UWAGA: ścieżki /panel/* i /admin/* CELOWO nie są tutaj rejestrowane —
    // panel klienta i admina obsługujemy standardowym routingiem Next.js
    // (App Router) bez tłumaczenia URL-i. next-intl traktuje je jako passthrough.
    // Wewnątrz panelu używamy `next/link` i `next/navigation` zamiast wrapperów
    // z `@/i18n/routing`.
  },
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
