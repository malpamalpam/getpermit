"use client";

import { useState, useTransition } from "react";
import { updateNotificationSettingsAction } from "@/lib/fdk-actions";
import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Settings {
  teamNotifyFrequencyDays: number;
  oswiadczenieDaysBefore: number;
  zezwolenieDaysBefore: number;
  pobytDaysBefore: number;
}

export function NotificationSettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await updateNotificationSettingsAction(form);
      setStatus(result.ok ? "success" : "error");
    });
  };

  const inputCls =
    "block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20";

  const fields: { key: keyof Settings; label: string; help: string; unit: string }[] = [
    {
      key: "teamNotifyFrequencyDays",
      label: "Częstotliwość powiadomień do zespołu",
      help: "Co ile dni wysyłać email podsumowujący do zespołu legalizacji",
      unit: "dni",
    },
    {
      key: "oswiadczenieDaysBefore",
      label: "Oświadczenia — wyprzedzenie",
      help: "Ile dni przed wygaśnięciem oświadczenia wysyłać powiadomienie (domyślnie 45 = 1,5 miesiąca)",
      unit: "dni",
    },
    {
      key: "zezwolenieDaysBefore",
      label: "Zezwolenia na pracę (WP) — wyprzedzenie",
      help: "Ile dni przed wygaśnięciem WP wysyłać powiadomienie (domyślnie 240 = 8 miesięcy)",
      unit: "dni",
    },
    {
      key: "pobytDaysBefore",
      label: "Decyzje pobytowe / wizy — wyprzedzenie",
      help: "Ile dni przed wygaśnięciem decyzji pobytowej/wizy wysyłać powiadomienie (domyślnie 60 = 2 miesiące)",
      unit: "dni",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-primary">Powiadomienia o kończących się dokumentach</h2>

      <div className="mb-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
        <strong>Ważna logika:</strong> Powiadomienia o zezwoleniach na pracę (WP) i oświadczeniach (OŚW) są
        wysyłane <strong>TYLKO</strong> dla osób bez aktywnej decyzji pobytowej. Osoby z aktywną decyzją
        pobytową otrzymują wyłącznie powiadomienia o kończącej się decyzji.
      </div>

      <div className="space-y-5">
        {fields.map(({ key, label, help, unit }) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-primary">{label}</label>
            <p className="mb-1.5 text-xs text-primary/50">{help}</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={730}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 1 }))}
                className={inputCls + " max-w-[120px]"}
                disabled={isPending}
              />
              <span className="text-sm text-primary/50">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? "Zapisywanie..." : "Zapisz ustawienia"}
        </button>
        {status === "success" && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Zapisano
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> Błąd zapisu
          </span>
        )}
      </div>
    </form>
  );
}
