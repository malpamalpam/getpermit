"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addResidenceBasisAction } from "@/lib/fdk-actions";

const TYPES = [
  // TRC
  { value: "trc_fdk", label: "TRC — FDK" },
  { value: "trc_inny", label: "TRC — inny pracodawca" },
  { value: "trc_humanitarne", label: "TRC — ze względów humanitarnych" },
  { value: "trc_pobyt_cudz", label: "TRC — pobyt z cudzoziemcem" },
  { value: "trc_blue_card", label: "TRC — Blue Card" },
  { value: "trc_malzonek_pl", label: "TRC — Małżonek obywatela PL" },
  { value: "trc_studia", label: "TRC — studia" },
  { value: "trc_absolwent", label: "TRC — absolwent" },
  { value: "trc_dzialalnosc", label: "TRC — działalność gospodarcza" },
  { value: "trc_inne", label: "TRC — inne okoliczności" },
  // Wizy i ruch bezwizowy
  { value: "wiza", label: "Wiza" },
  { value: "ruch_bezwizowy", label: "Ruch bezwizowy" },
  // Pobyt stały / rezydent
  { value: "pobyt_staly", label: "Pobyt stały" },
  { value: "rezydent_ue", label: "Rezydent długoterminowy UE" },
  // Ochrona
  { value: "uchodzca", label: "Status uchodźcy" },
  { value: "ochrona_uzup", label: "Ochrona uzupełniająca" },
  { value: "zgoda_humanitarna", label: "Zgoda na pobyt ze względów humanitarnych" },
  { value: "zgoda_tolerowany", label: "Zgoda na pobyt tolerowany" },
  // Specjalne
  { value: "uk_wystapienie", label: "Umowa wystąpienia (UK)" },
  { value: "ue_eog", label: "Obywatel UE/EOG/Szwajcarii" },
  { value: "pesel_ukr", label: "Pesel UKR" },
  { value: "cukr", label: "CUKR" },
  // W procedurze
  { value: "stempel", label: "W procedurze — stempel w paszporcie" },
  { value: "przedluzenie", label: "Pobyt na przedłużeniu" },
  // Inne
  { value: "inne", label: "Inna podstawa pobytu" },
] as const;

export function AddResidenceBasisButton({ foreignerId }: { foreignerId: number }) {
  const [open, setOpen] = useState(false);
  const [typ, setTyp] = useState("stempel");
  const [data, setData] = useState("");
  const [dataDo, setDataDo] = useState("");
  const [notatka, setNotatka] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await addResidenceBasisAction(foreignerId, { typ, data, dataDo, notatka });
      setStatus(result.ok ? "success" : "error");
      if (result.ok) {
        setTimeout(() => { setOpen(false); setStatus("idle"); setTyp("stempel"); setData(""); setDataDo(""); setNotatka(""); }, 1000);
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/20 px-3 py-1.5 text-xs font-medium text-primary/60 transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="h-3 w-3" /> Dodaj podstawę pobytową
      </button>
    );
  }

  const needsDataDo = typ.startsWith("trc_") || ["wiza", "pobyt_staly", "rezydent_ue", "uchodzca", "ochrona_uzup", "zgoda_humanitarna", "zgoda_tolerowany", "uk_wystapienie", "ue_eog", "pesel_ukr", "cukr", "ruch_bezwizowy"].includes(typ);

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-2">
      <div className="text-xs font-semibold text-primary/70">Nowa podstawa pobytowa</div>

      <select
        value={typ}
        onChange={(e) => setTyp(e.target.value)}
        className="w-full rounded border border-primary/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-primary/50">{needsDataDo ? "Ważna od" : "Data złożenia wniosku"}</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
            className="w-full rounded border border-primary/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        {needsDataDo && (
          <div className="flex-1">
            <label className="text-[10px] text-primary/50">Ważna do</label>
            <input
              type="date"
              value={dataDo}
              onChange={(e) => setDataDo(e.target.value)}
              className="w-full rounded border border-primary/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        )}
      </div>

      <input
        type="text"
        value={notatka}
        onChange={(e) => setNotatka(e.target.value)}
        placeholder="Notatka (np. wojewoda, nr sprawy)"
        className="w-full rounded border border-primary/15 bg-white px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {isPending ? "Zapisuję..." : "Zapisz"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus("idle"); }}
          className="rounded px-3 py-1.5 text-xs text-primary/60 hover:text-primary"
        >
          Anuluj
        </button>
        {status === "success" && <span className="text-xs text-green-600">Zapisano</span>}
        {status === "error" && <span className="text-xs text-red-600">Błąd</span>}
      </div>
    </form>
  );
}
