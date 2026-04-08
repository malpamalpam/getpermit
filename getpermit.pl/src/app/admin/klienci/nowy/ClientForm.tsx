"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { createClientAction } from "@/lib/admin-actions";
import { CheckCircle2, AlertCircle, UserPlus } from "lucide-react";

const LOCALES = [
  { value: "pl", label: "Polski" },
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "uk", label: "Українська" },
] as const;

export function ClientForm() {
  const t = useTranslations("admin.clientForm");
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState<"pl" | "en" | "ru" | "uk">("pl");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setErrorMessage(null);
    startTransition(async () => {
      const result = await createClientAction({
        firstName,
        lastName,
        email,
        phone,
        locale,
      });
      if (!result.ok) {
        setStatus("error");
        setErrorMessage(
          result.error === "email_taken" ? t("errorEmailTaken") : t("error")
        );
        return;
      }
      setStatus("success");
      setTimeout(() => router.push("/admin/klienci"), 1000);
    });
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
  const labelBase = "block text-sm font-medium text-primary mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelBase}>
            {t("field.firstName")} *
          </label>
          <input
            id="firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputBase}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelBase}>
            {t("field.lastName")} *
          </label>
          <input
            id="lastName"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputBase}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelBase}>
          {t("field.email")} *
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputBase}
        />
      </div>

      <div>
        <label htmlFor="phone" className={labelBase}>
          {t("field.phone")}
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
        <label htmlFor="locale" className={labelBase}>
          {t("field.locale")}
        </label>
        <select
          id="locale"
          value={locale}
          onChange={(e) =>
            setLocale(e.target.value as "pl" | "en" | "ru" | "uk")
          }
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
          <span>{t("created")}</span>
        </div>
      )}
      {status === "error" && errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button type="submit" variant="accent" size="md" disabled={isPending}>
        <UserPlus className="h-4 w-4" />
        {isPending ? t("creating") : t("createButton")}
      </Button>
    </form>
  );
}
