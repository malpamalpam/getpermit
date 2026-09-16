"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createForeignerAction } from "@/lib/fdk-actions";
import { Plus, X, Loader2 } from "lucide-react";

const FIELDS: { key: string; label: string; type?: string; required?: boolean }[] = [
  { key: "nazwisko", label: "Nazwisko", required: true },
  { key: "imie", label: "Imię" },
  { key: "dataUrodzenia", label: "Data urodzenia", type: "date" },
  { key: "obywatelstwo", label: "Obywatelstwo" },
  { key: "pesel", label: "PESEL" },
  { key: "nrPaszportu", label: "Nr paszportu" },
  { key: "paszportWaznyOd", label: "Paszport ważny od", type: "date" },
  { key: "paszportWaznyDo", label: "Paszport ważny do", type: "date" },
  { key: "adresPl", label: "Adres w PL" },
  { key: "telefon", label: "Telefon" },
  { key: "email", label: "Email" },
  { key: "uwagi", label: "Uwagi" },
];

export function CreateForeignerForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Record<string, string>>(() => {
    const state: Record<string, string> = {};
    for (const f of FIELDS) state[f.key] = "";
    return state;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nazwisko?.trim()) {
      setError("Nazwisko jest wymagane.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createForeignerAction(form as never);
        if (result.ok && result.id) {
          onClose();
          router.push(`/admin/fdk/${result.id}`);
          router.refresh();
        } else {
          setError("Nie udało się utworzyć. Sprawdź dane.");
        }
      } catch {
        setError("Błąd serwera. Spróbuj ponownie.");
      }
    });
  };

  const inputCls =
    "block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">
            Nowy cudzoziemiec
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-primary/40 hover:bg-primary/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {FIELDS.map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-primary/60">
                {label}{required ? " *" : ""}
              </label>
              <input
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className={inputCls}
                disabled={isPending}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-primary/15 px-4 py-2 text-sm font-medium text-primary/60 hover:bg-primary/5">
            Anuluj
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isPending ? "Tworzenie..." : "Utwórz"}
          </button>
        </div>
      </form>
    </div>
  );
}
