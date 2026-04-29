"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/lib/auth-actions";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { User } from "@prisma/client";

const LOCALES: Array<{ value: string; label: string }> = [
  { value: "pl", label: "Polski" },
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "uk", label: "Українська" },
];

export function SettingsForm({ user }: { user: User }) {
  const t = useTranslations("panel.settings");
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [locale, setLocale] = useState(user.locale);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await updateProfile({ firstName, lastName, phone, locale });
      if (result.ok && locale !== user.locale) {
        // Pełny reload strony, aby layout załadował nowe tłumaczenia
        window.location.reload();
        return;
      }
      setStatus(result.ok ? "success" : "error");
    });
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface disabled:text-ink/40";
  const labelBase = "block text-sm font-medium text-primary mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelBase}>
            {t("firstNameLabel")}
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputBase}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelBase}>
            {t("lastNameLabel")}
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputBase}
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className={labelBase}>
          {t("phoneLabel")}
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputBase}
        />
      </div>

      <div>
        <label htmlFor="email" className={labelBase}>
          {t("emailLabel")}
        </label>
        <input
          id="email"
          type="email"
          value={user.email}
          disabled
          className={inputBase}
        />
      </div>

      <div>
        <label htmlFor="locale" className={labelBase}>
          {t("localeLabel")}
        </label>
        <select
          id="locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className={inputBase}
        >
          {LOCALES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {status === "success" && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{t("saved")}</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{t("error")}</span>
        </div>
      )}

      <Button type="submit" variant="accent" size="md" disabled={isPending}>
        {isPending ? t("saving") : t("saveButton")}
      </Button>
    </form>
  );
}
