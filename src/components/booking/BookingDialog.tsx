"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
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

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Umów konsultację"
      style={{ position: "fixed", inset: 0, zIndex: 99999 }}
      className="flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-6xl rounded-2xl bg-white shadow-2xl" style={{ height: "95vh", maxHeight: "900px" }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-lg transition hover:bg-gray-100"
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

  return createPortal(dialog, document.body);
}
