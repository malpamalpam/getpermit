"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="font-display text-2xl font-bold text-primary">
        Wystąpił błąd
      </h2>
      <p className="text-sm text-ink/60">
        Coś poszło nie tak przy ładowaniu strony.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
