"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { sendMagicLink } from "@/lib/auth-actions";
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
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await sendMagicLink(email, locale, next);
      if (!result.ok) {
        setError(
          result.error === "invalid_email"
            ? t("errorInvalidEmail")
            : t("errorSendFailed")
        );
        return;
      }
      const params = new URLSearchParams({ email });
      if (next) params.set("next", next);
      router.push(`/panel/verify?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-primary"
        >
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
          className="block w-full rounded-md border border-primary/15 bg-white px-4 py-3 text-base text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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
        {isPending ? t("submitting") : t("submitButton")}
      </Button>
    </form>
  );
}
