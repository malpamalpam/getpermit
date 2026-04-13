"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "getpermit-cookie-consent";

export function CookieConsent() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const accepted = window.localStorage.getItem(STORAGE_KEY);
    if (!accepted) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => {
    window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-primary/10 bg-white p-5 shadow-2xl md:p-6">
      <div className="flex items-start gap-4">
        <div className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent md:flex">
          <Cookie className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-primary">
            {t("title")}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink/70">
            {t("message")}{" "}
            <Link
              href="/polityka-prywatnosci"
              className="font-medium text-accent hover:underline"
            >
              {t("privacyLink")}
            </Link>
          </p>
        </div>
        <div className="flex flex-shrink-0 items-start gap-2">
          <button
            type="button"
            onClick={accept}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
          >
            {t("accept")}
          </button>
          <button
            type="button"
            onClick={accept}
            aria-label="Close"
            className="hidden h-9 w-9 items-center justify-center rounded-md text-primary/40 hover:bg-primary/5 hover:text-primary md:flex"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
