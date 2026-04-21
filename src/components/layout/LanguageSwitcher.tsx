"use client";

import { useLocale } from "next-intl";
import { usePathname as useNextPathname } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";

const LOCALE_LABELS: Record<string, string> = {
  pl: "PL",
  en: "EN",
  ru: "RU",
  uk: "UA",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const fullPathname = useNextPathname();

  const onChange = (nextLocale: string) => {
    // Remove current locale prefix and add new one
    const pathWithoutLocale = fullPathname.replace(/^\/(pl|en|ru|uk)/, "") || "/";
    window.location.href = `/${nextLocale}${pathWithoutLocale}`;
  };

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-4 w-4 text-primary/60" aria-hidden="true" />
      <div className="flex items-center" role="group" aria-label="Language">
        {routing.locales.map((loc, idx) => (
          <button
            key={loc}
            onClick={() => onChange(loc)}
            aria-current={loc === locale ? "true" : undefined}
            className={`px-2 py-1 text-xs font-semibold transition-colors ${
              loc === locale
                ? "text-primary"
                : "text-primary/50 hover:text-primary"
            } ${idx > 0 ? "border-l border-primary/15" : ""}`}
          >
            {LOCALE_LABELS[loc]}
          </button>
        ))}
      </div>
    </div>
  );
}
