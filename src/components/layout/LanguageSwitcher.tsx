"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname as useNextPathname } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ChevronDown, Globe } from "lucide-react";

const LOCALE_CONFIG: Record<string, { label: string; flag: string; nativeName: string }> = {
  pl: { label: "PL", flag: "🇵🇱", nativeName: "Polski" },
  en: { label: "EN", flag: "🇬🇧", nativeName: "English" },
  ru: { label: "RU", flag: "🇷🇺", nativeName: "Русский" },
  uk: { label: "UA", flag: "🇺🇦", nativeName: "Українська" },
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const fullPathname = useNextPathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const onChange = (nextLocale: string) => {
    const pathWithoutLocale = fullPathname.replace(/^\/(pl|en|ru|uk)/, "") || "/";
    window.location.href = `/${nextLocale}${pathWithoutLocale}`;
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = LOCALE_CONFIG[locale];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <Globe className="h-3.5 w-3.5 text-primary/50" />
        <span>{current.flag} {current.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-primary/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-primary/10 bg-white py-1 shadow-lg">
          {routing.locales.map((loc) => {
            const cfg = LOCALE_CONFIG[loc];
            return (
              <button
                key={loc}
                onClick={() => { onChange(loc); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors ${
                  loc === locale
                    ? "bg-accent/10 text-accent"
                    : "text-primary/70 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                <span className="text-sm">{cfg.flag}</span>
                <span>{cfg.label}</span>
                <span className="font-normal text-primary/40">{cfg.nativeName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
