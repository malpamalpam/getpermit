"use client";

import { useEffect, useRef, useCallback } from "react";
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lock body scroll + Escape key
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

  // Listen for Cal.com dimension changes via postMessage
  const handleMessage = useCallback((e: MessageEvent) => {
    if (!containerRef.current) return;
    try {
      const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      if (data?.type === "__dimensionChanged" || data?.action === "__dimensionChanged") {
        const height = data.data?.height ?? data.height;
        if (height && typeof height === "number" && height > 400) {
          containerRef.current.style.height = `${Math.min(height + 80, window.innerHeight * 0.95)}px`;
        }
      }
    } catch {
      // ignore non-JSON messages
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, handleMessage]);

  if (!open) return null;

  const calLocale = CALCOM_LOCALE[locale] ?? "en";
  const embedUrl = `${siteConfig.calcom.url}?layout=month_view&theme=light&locale=${calLocale}`;

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Umów konsultację"
      style={{ position: "fixed", inset: 0, zIndex: 99999 }}
      className="flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl"
        style={{
          height: "min(90vh, 780px)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-lg transition hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="Cal.com — umów konsultację"
          className="h-full w-full rounded-2xl border-0"
          loading="lazy"
          allow="payment"
          scrolling="no"
        />
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
