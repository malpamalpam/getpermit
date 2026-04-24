"use client";

import { useState, useTransition } from "react";
import { updateForeignerAction } from "@/lib/fdk-actions";
import { Save, X, Pencil } from "lucide-react";

interface ForeignerData {
  id: number;
  nazwisko: string;
  imie: string | null;
  dataUrodzenia: Date | null;
  miejsceUrodzenia: string | null;
  obywatelstwo: string | null;
  plec: string | null;
  pesel: string | null;
  nrPaszportu: string | null;
  paszportWaznyOd: Date | null;
  paszportWaznyDo: Date | null;
  adresPl: string | null;
  telefon: string | null;
  email: string | null;
  nrKonta: string | null;
  uwagi: string | null;
  jezykPreferowany: string | null;
  decyzjaPobytowaDo: Date | null;
  typDokumentuPobytowego: string | null;
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

type EditableKey = Exclude<keyof ForeignerData, "id">;

const FIELDS: { key: EditableKey; label: string; type?: string }[] = [
  { key: "nazwisko", label: "Nazwisko" },
  { key: "imie", label: "Imię" },
  { key: "dataUrodzenia", label: "Data urodzenia", type: "date" },
  { key: "miejsceUrodzenia", label: "Miejsce urodzenia" },
  { key: "obywatelstwo", label: "Obywatelstwo" },
  { key: "plec", label: "Płeć" },
  { key: "pesel", label: "PESEL" },
  { key: "nrPaszportu", label: "Nr paszportu" },
  { key: "paszportWaznyOd", label: "Paszport ważny od", type: "date" },
  { key: "paszportWaznyDo", label: "Paszport ważny do", type: "date" },
  { key: "adresPl", label: "Adres w PL" },
  { key: "telefon", label: "Telefon" },
  { key: "email", label: "Email" },
  { key: "nrKonta", label: "Nr konta" },
  { key: "jezykPreferowany", label: "Język preferowany" },
  { key: "decyzjaPobytowaDo", label: "Data ważności decyzji pobytowej", type: "date" },
  { key: "typDokumentuPobytowego", label: "Typ dokumentu pobytowego" },
  { key: "uwagi", label: "Uwagi" },
];

export function FdkEditForeignerForm({ foreigner }: { foreigner: ForeignerData }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const [form, setForm] = useState(() => {
    const state: Record<string, string> = {};
    for (const f of FIELDS) {
      const val = foreigner[f.key] as string | number | Date | null | undefined;
      state[f.key] = val instanceof Date ? fmtDate(val) : String(val ?? "");
    }
    return state;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await updateForeignerAction(foreigner.id, form as never);
      setStatus(result.ok ? "success" : "error");
      if (result.ok) {
        setEditing(false);
        // Refresh page to show updated data
        window.location.reload();
      }
    });
  };

  const inputCls =
    "block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20";

  if (!editing) {
    return (
      <div className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-primary">Dane osobowe</h2>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
          >
            <Pencil className="h-3.5 w-3.5" /> Edytuj
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          {FIELDS.map(({ key, label, type }) => {
            const raw = foreigner[key];
            const value =
              raw instanceof Date
                ? raw.toLocaleDateString("pl-PL")
                : raw ?? null;
            if (!value) return null;
            return (
              <div key={key} className="flex justify-between gap-4">
                <dt className="text-primary/60">{label}</dt>
                <dd className="text-right font-medium text-primary">{String(value)}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-accent/30 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-primary">Edycja danych</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/15 px-3 py-1.5 text-xs font-medium text-primary/60 hover:bg-primary/5"
          >
            <X className="h-3.5 w-3.5" /> Anuluj
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {isPending ? "Zapisywanie..." : "Zapisz"}
          </button>
        </div>
      </div>

      {status === "error" && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Wystąpił błąd podczas zapisywania.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, type }) => (
          <div key={key} className={key === "uwagi" || key === "adresPl" ? "sm:col-span-2" : ""}>
            <label className="mb-1 block text-xs font-medium text-primary/60">{label}</label>
            {key === "uwagi" ? (
              <textarea
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className={inputCls + " min-h-[60px]"}
                disabled={isPending}
              />
            ) : key === "jezykPreferowany" ? (
              <select
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className={inputCls}
                disabled={isPending}
              >
                <option value="">-- wybierz --</option>
                <option value="pl">Polski</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="uk">Українська</option>
              </select>
            ) : (
              <input
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className={inputCls}
                disabled={isPending}
              />
            )}
          </div>
        ))}
      </div>
    </form>
  );
}
