"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { registerAction } from "@/lib/auth-actions";
import { AlertCircle } from "lucide-react";

interface Props {
  locale: string;
}

export function RegisterForm({ locale }: Props) {
  const t = useTranslations("panel.auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError(t("errorConsent"));
      return;
    }
    if (!terms) {
      setError(t("errorTerms"));
      return;
    }
    if (password.length < 8) {
      setError(t("errorWeakPassword"));
      return;
    }

    startTransition(async () => {
      const result = await registerAction({
        email,
        password,
        firstName,
        lastName,
        phone,
        consent,
        terms,
        locale,
      });
      if (!result.ok) {
        const errorMap: Record<string, string> = {
          email_taken: t("errorEmailTaken"),
          weak_password: t("errorWeakPassword"),
          validation: t("errorGeneral"),
          general: t("errorGeneral"),
        };
        setError(errorMap[result.error] ?? t("errorGeneral"));
        return;
      }
      const params = new URLSearchParams({ email });
      router.push(`/panel/verify?${params.toString()}`);
    });
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-4 py-3 text-base text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
  const labelBase = "mb-1.5 block text-sm font-medium text-primary";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelBase}>
            {t("firstNameLabel")} *
          </label>
          <input
            id="firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputBase}
            disabled={isPending}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelBase}>
            {t("lastNameLabel")} *
          </label>
          <input
            id="lastName"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputBase}
            disabled={isPending}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelBase}>
          {t("emailLabel")} *
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className={inputBase}
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="password" className={labelBase}>
          {t("passwordLabel")} *
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
          className={inputBase}
          disabled={isPending}
        />
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
          disabled={isPending}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-primary/30 text-accent focus:ring-accent"
          disabled={isPending}
        />
        <span>
          {t("consentLabel")} *{" "}
          <a href={`/${locale}/polityka-prywatnosci`} className="text-accent hover:underline" target="_blank">
            ↗
          </a>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-primary/30 text-accent focus:ring-accent"
          disabled={isPending}
        />
        <span>
          {t("termsLabel")} *{" "}
          <a href={`/${locale}/regulamin`} className="text-accent hover:underline" target="_blank">
            ↗
          </a>
        </span>
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        disabled={isPending || !email || !password || !firstName || !lastName}
      >
        {isPending ? t("registering") : t("registerButton")}
      </Button>

      <p className="text-center text-sm text-ink/60">
        {t("hasAccount")}{" "}
        <a href="/panel/login" className="font-medium text-accent hover:underline">
          {t("loginLink")}
        </a>
      </p>
    </form>
  );
}
