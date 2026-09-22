"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Save, Loader2 } from "lucide-react";
import { editResidenceBasisAction, deleteResidenceBasisAction } from "@/lib/fdk-actions";

type BasisType = "karta" | "wiza" | "upo" | "ochrona_ukr";

const RESIDENCE_TYPES = [
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
  { value: "wiza", label: "Wiza" },
  { value: "ruch_bezwizowy", label: "Ruch bezwizowy" },
  { value: "pobyt_staly", label: "Pobyt stały" },
  { value: "rezydent_ue", label: "Rezydent długoterminowy UE" },
  { value: "uchodzca", label: "Status uchodźcy" },
  { value: "ochrona_uzup", label: "Ochrona uzupełniająca" },
  { value: "zgoda_humanitarna", label: "Zgoda na pobyt ze wzgl. humanitarnych" },
  { value: "zgoda_tolerowany", label: "Zgoda na pobyt tolerowany" },
  { value: "uk_wystapienie", label: "Umowa wystąpienia (UK)" },
  { value: "ue_eog", label: "Obywatel UE/EOG/Szwajcarii" },
  { value: "pesel_ukr", label: "Pesel UKR" },
  { value: "cukr", label: "CUKR" },
  { value: "stempel", label: "W procedurze — stempel w paszporcie" },
  { value: "przedluzenie", label: "Pobyt na przedłużeniu" },
  { value: "inne", label: "Inna podstawa pobytu" },
];

export function ResidenceBasisActions({
  foreignerId,
  basisType,
  currentDate,
  currentNote,
}: {
  foreignerId: number;
  basisType: BasisType;
  currentDate?: string;
  currentNote?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [typ, setTyp] = useState(() => {
    if (basisType === "karta") return "trc_fdk";
    if (basisType === "wiza") return "wiza";
    if (basisType === "upo") return "stempel";
    return "inne";
  });
  const [dataOd, setDataOd] = useState("");
  const [dataDo, setDataDo] = useState(currentDate ?? "");

  // Parse structured note: "nrDokumentu | urzad | free-text uwagi"
  const [nrDokumentu, setNrDokumentu] = useState(() => {
    const parts = (currentNote ?? "").split("|").map((s) => s.trim());
    return parts.length >= 3 ? parts[0] : "";
  });
  const [urzadWojewoda, setUrzadWojewoda] = useState(() => {
    const parts = (currentNote ?? "").split("|").map((s) => s.trim());
    return parts.length >= 3 ? parts[1] : "";
  });
  const [uwagi, setUwagi] = useState(() => {
    const parts = (currentNote ?? "").split("|").map((s) => s.trim());
    return parts.length >= 3 ? parts.slice(2).join(" | ") : (currentNote ?? "");
  });

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      // Compose structured note: "nrDokumentu | urzad | uwagi"
      const parts = [nrDokumentu.trim(), urzadWojewoda.trim(), uwagi.trim()];
      const hasStructured = parts[0] || parts[1];
      const composedNote = hasStructured ? parts.join(" | ") : uwagi.trim();

      const result = await editResidenceBasisAction(foreignerId, {
        basisType,
        date: dataDo || dataOd,
        note: composedNote || undefined,
      });
      if (result.ok) {
        setMode("view");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteResidenceBasisAction(foreignerId, basisType);
      setMode("view");
      router.refresh();
    });
  };

  if (mode === "view") {
    return (
      <div className="flex gap-1">
        <button onClick={() => setMode("edit")} className="rounded p-0.5 text-primary/30 hover:text-accent" title="Edytuj">
          <Pencil className="h-3 w-3" />
        </button>
        <button onClick={() => setMode("confirmDelete")} className="rounded p-0.5 text-primary/30 hover:text-red-500" title="Usuń">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">Usunąć?</span>
        <button onClick={handleDelete} disabled={isPending} className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600 disabled:opacity-50">
          {isPending ? "..." : "Tak"}
        </button>
        <button onClick={() => setMode("view")} className="text-[10px] text-primary/50 hover:text-primary">Nie</button>
      </div>
    );
  }

  // Full edit modal
  const inputCls = "block w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20";
  const labelCls = "mb-1 block text-xs font-medium text-primary/60";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleEdit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">Edytuj podstawę pobytową</h3>
          <button type="button" onClick={() => setMode("view")} className="rounded-lg p-1.5 text-primary/40 hover:bg-primary/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Typ podstawy</label>
            <select value={typ} onChange={(e) => setTyp(e.target.value)} className={inputCls}>
              {RESIDENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data od</label>
              <input type="date" value={dataOd} onChange={(e) => setDataOd(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data do</label>
              <input type="date" value={dataDo} onChange={(e) => setDataDo(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nr dokumentu / karty</label>
              <input value={nrDokumentu} onChange={(e) => setNrDokumentu(e.target.value)} className={inputCls} placeholder="np. AB 1234567" />
            </div>
            <div>
              <label className={labelCls}>Urząd / wojewoda</label>
              <input value={urzadWojewoda} onChange={(e) => setUrzadWojewoda(e.target.value)} className={inputCls} placeholder="np. Wojewoda Mazowiecki" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Uwagi / komentarz</label>
            <textarea value={uwagi} onChange={(e) => setUwagi(e.target.value)} className={inputCls} rows={2} placeholder="Dodatkowe uwagi..." />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMode("confirmDelete")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={() => setMode("view")} className="rounded-lg border border-primary/15 px-4 py-2 text-sm font-medium text-primary/60 hover:bg-primary/5">
              Anuluj
            </button>
            <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPending ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
