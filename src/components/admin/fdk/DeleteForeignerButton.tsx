"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, X, AlertTriangle } from "lucide-react";
import { deleteForeignerAction } from "@/lib/fdk-actions";

export function DeleteForeignerButton({
  foreignerId,
  name,
}: {
  foreignerId: number;
  name: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteForeignerAction(foreignerId);
        if (result.ok) {
          setShowConfirm(false);
          router.refresh();
        } else {
          setError("Nie udalo sie usunac cudzoziemca.");
        }
      } catch {
        setError("Blad polaczenia.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowConfirm(true);
        }}
        className="relative z-10 inline-flex items-center rounded-md p-1 text-primary/30 hover:bg-red-50 hover:text-red-600"
        title="Usun cudzoziemca"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary">Usunac cudzoziemca?</h3>
                <p className="mt-1 text-sm text-primary/60">
                  Czy na pewno chcesz usunac profil{" "}
                  <span className="font-semibold text-primary">&quot;{name}&quot;</span>?
                  Wszystkie podstawy zatrudnienia, zalaczniki i historia zmian zostana usuniete.
                  Operacja jest nieodwracalna.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg p-1 text-primary/40 hover:bg-primary/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="rounded-lg border border-primary/15 px-4 py-2 text-sm font-medium text-primary/60 hover:bg-primary/5"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isPending ? "Usuwanie..." : "Usun"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
