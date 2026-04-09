"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { siteConfig } from "@/config/site";

const CALCOM_LOCALE: Record<string, string> = {
  pl: "pl",
  en: "en",
  ru: "ru",
  uk: "uk",
};

export function BookingDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();

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

  const calLocale = CALCOM_LOCALE[locale] ?? "en";
  const embedUrl = `${siteConfig.calcom.url}?layout=month_view&theme=light&locale=${calLocale}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Umów konsultację"
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-primary-900/70 p-2 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-2 min-h-[700px] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-4" style={{ height: "calc(100vh - 2rem)" }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary shadow transition hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>
        <iframe
          src={embedUrl}
          title="Cal.com — umów konsultację"
          className="h-full w-full border-0"
          loading="lazy"
          allow="payment"
        />
      </div>
    </div>
  );
}
