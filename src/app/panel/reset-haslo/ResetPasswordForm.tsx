"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { resetPasswordAction } from "@/lib/auth-actions";
import { AlertCircle, CheckCircle } from "lucide-react";

interface Props {
  locale: string;
}

export function ResetPasswordForm({ locale }: Props) {
  const t = useTranslations("panel.auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await resetPasswordAction({ email, locale });
      if (!result.ok) {
        setError(t("errorGeneral"));
        return;
      }
      setSent(true);
    });
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-4 py-3 text-base text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle className="h-7 w-7" />
        </div>
        <p className="text-sm text-ink/70">
          {t("resetSent")}
        </p>
        <a
          href="/panel/login"
          className="inline-block text-sm font-medium text-accent hover:underline"
        >
          {t("resetBackToLogin")}
        </a>
      </div>
    );
  }

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
        disabled={isPending || !email}
      >
        {isPending ? t("resetSending") : t("resetButton")}
      </Button>

      <p className="text-center text-sm text-ink/60">
        <a href="/panel/login" className="font-medium text-accent hover:underline">
          {t("resetBackToLogin")}
        </a>
      </p>
    </form>
  );
}
