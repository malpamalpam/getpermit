"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { siteConfig } from "@/config/site";

// Map next-intl locale → Calendly locale param
// (Calendly supports a fixed set of UI languages — uk maps to en for now,
// because Calendly does not have native Ukrainian UI as of 2026.)
const CALENDLY_LOCALE: Record<string, string> = {
  pl: "pl",
  en: "en",
  ru: "ru",
  uk: "uk", // Calendly fallback handled gracefully
};

export function BookingDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();

  // Lock body scroll while open + ESC to close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Calendly query params:
  // - locale: UI language
  // - hide_landing_page_details, hide_gdpr_banner: cleaner embed
  // - primary_color: matches our accent blue (#2563eb)
  // - text_color: navy
  const url = new URL(siteConfig.calendly.url);
  url.searchParams.set("locale", CALENDLY_LOCALE[locale] ?? "en");
  url.searchParams.set("hide_landing_page_details", "1");
  url.searchParams.set("hide_gdpr_banner", "1");
  url.searchParams.set("primary_color", "2563eb");
  url.searchParams.set("text_color", "0f1b33");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Umów konsultację"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary-900/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative h-[88vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary shadow transition hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>
        <iframe
          src={url.toString()}
          title="Calendly — umów konsultację"
          className="h-full w-full border-0"
          loading="lazy"
        />
      </div>
    </div>
  );
}
