"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { loginAction } from "@/lib/auth-actions";
import { AlertCircle } from "lucide-react";

interface Props {
  locale: string;
  next?: string;
  initialError?: string | null;
}

export function LoginForm({ locale, next, initialError }: Props) {
  const t = useTranslations("panel.auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await loginAction({ email, password, locale });
      if (!result.ok) {
        setError(
          result.error === "invalid_credentials"
            ? t("errorInvalidCredentials")
            : t("errorGeneral")
        );
        return;
      }
      router.push(result.redirect ?? next ?? "/panel");
      router.refresh();
    });
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-4 py-3 text-base text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-primary">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className={inputBase}
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-primary">
          {t("passwordLabel")}
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
          className={inputBase}
          disabled={isPending}
        />
      </div>

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
        disabled={isPending || !email || !password}
      >
        {isPending ? t("loggingIn") : t("loginButton")}
      </Button>

      <p className="text-center text-sm text-ink/60">
        <a href={`/panel/reset-haslo?lang=${locale}`} className="font-medium text-accent hover:underline">
          {t("forgotPassword")}
        </a>
      </p>

      <p className="text-center text-sm text-ink/60">
        {t("noAccount")}{" "}
        <a href={`/panel/rejestracja?lang=${locale}`} className="font-medium text-accent hover:underline">
          {t("registerLink")}
        </a>
      </p>
    </form>
  );
}
