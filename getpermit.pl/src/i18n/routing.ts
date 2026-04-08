import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["pl", "en", "ru", "uk"],
  defaultLocale: "pl",
  // PL is the default — served at "/" with no prefix.
  // Other locales use prefixes: /en, /ru, /uk
  localePrefix: "as-needed",
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
      ru: "/kontakt",
      uk: "/kontakt",
    },
    "/blog": {
      pl: "/blog",
      en: "/blog",
      ru: "/blog",
      uk: "/blog",
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
