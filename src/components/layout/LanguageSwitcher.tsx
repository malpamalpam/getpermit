"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname as useNextPathname } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ChevronDown } from "lucide-react";

const LOCALE_LABELS: Record<string, string> = {
  pl: "PL",
  en: "EN",
  ru: "RU",
  uk: "UA",
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        {LOCALE_LABELS[locale]}
        <ChevronDown className={`h-3.5 w-3.5 text-primary/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[80px] overflow-hidden rounded-lg border border-primary/10 bg-white py-1 shadow-lg">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              onClick={() => { onChange(loc); setOpen(false); }}
              className={`flex w-full items-center px-3 py-1.5 text-xs font-semibold transition-colors ${
                loc === locale
                  ? "bg-accent/10 text-accent"
                  : "text-primary/70 hover:bg-primary/5 hover:text-primary"
              }`}
            >
              {LOCALE_LABELS[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
