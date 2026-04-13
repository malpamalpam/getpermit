"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updatePasswordAction } from "@/lib/auth-actions";
import { AlertCircle, CheckCircle } from "lucide-react";

export function NewPasswordForm() {
  const t = useTranslations("panel.auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("newPasswordMismatch"));
      return;
    }

    startTransition(async () => {
      const result = await updatePasswordAction({ password });
      if (!result.ok) {
        setError(
          result.error === "weak_password"
            ? t("errorWeakPassword")
            : t("errorGeneral")
        );
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/panel");
        router.refresh();
      }, 2000);
    });
  };

  const inputBase =
    "block w-full rounded-md border border-primary/15 bg-white px-4 py-3 text-base text-primary placeholder:text-primary/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle className="h-7 w-7" />
        </div>
        <p className="text-sm text-ink/70">{t("newPasswordSuccess")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-primary">
          {t("newPasswordLabel")}
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
          className={inputBase}
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-primary">
          {t("newPasswordConfirmLabel")}
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        disabled={isPending || !password || !confirmPassword}
      >
        {isPending ? t("newPasswordSaving") : t("newPasswordButton")}
      </Button>
    </form>
  );
}
