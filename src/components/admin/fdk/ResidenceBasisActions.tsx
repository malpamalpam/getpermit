"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Save, Loader2 } from "lucide-react";
import {
  editResidenceBasisAction,
  deleteResidenceBasisAction,
  editResidenceBasisV2Action,
  deleteResidenceBasisV2Action,
} from "@/lib/fdk-actions";

// ============================================================================
// Types
// ============================================================================

type LegacyBasisType = "karta" | "wiza" | "upo" | "ochrona_ukr";

interface ResidenceBasisData {
  id: number;
  typ: string;
  dataOd: Date | null;
  dataDo: Date | null;
  nrDecyzji: string | null;
  nrWizy: string | null;
  nrKartyPobytu: string | null;
  urzad: string | null;
  uwagi: string | null;
}

type Props =
  | {
      foreignerId: number;
      basisType: LegacyBasisType;
      residenceBasisId?: never;
      currentResidenceBasis?: never;
      currentDate?: string;
      currentNote?: string;
    }
  | {
      foreignerId: number;
      basisType: "residence_v2";
      residenceBasisId: number;
      currentResidenceBasis: ResidenceBasisData;
      currentDate?: never;
      currentNote?: never;
    };

// ============================================================================
// Component
// ============================================================================

export function ResidenceBasisActions(props: Props) {
  const { foreignerId, basisType } = props;
  const isV2 = basisType === "residence_v2";

  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [isPending, startTransition] = useTransition();

  // V2 form state
  const rb = isV2 ? props.currentResidenceBasis : null;
  const [dataOd, setDataOd] = useState(rb?.dataOd ? rb.dataOd.toISOString().slice(0, 10) : "");
  const [dataDo, setDataDo] = useState(
    rb?.dataDo ? rb.dataDo.toISOString().slice(0, 10) : (props.currentDate ?? ""),
  );
  const [nrDecyzji, setNrDecyzji] = useState(rb?.nrDecyzji ?? "");
  const [nrKartyPobytu, setNrKartyPobytu] = useState(rb?.nrKartyPobytu ?? "");
  const [nrWizy, setNrWizy] = useState(rb?.nrWizy ?? "");
  const [urzad, setUrzad] = useState(rb?.urzad ?? "");
  const [uwagi, setUwagi] = useState(rb?.uwagi ?? "");

  // Legacy form state (for UPO/ochrona_ukr)
  const [legacyNote, setLegacyNote] = useState(() => {
    if (isV2) return "";
    const parts = (props.currentNote ?? "").split("|").map((s) => s.trim());
    return parts.length >= 3 ? parts.slice(2).join(" | ") : (props.currentNote ?? "");
  });

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      let result;
      if (isV2 && props.residenceBasisId) {
        result = await editResidenceBasisV2Action(props.residenceBasisId, {
          dataOd: dataOd || undefined,
          dataDo: dataDo || undefined,
          nrDecyzji: nrDecyzji || undefined,
          nrKartyPobytu: nrKartyPobytu || undefined,
          nrWizy: nrWizy || undefined,
          urzad: urzad || undefined,
          uwagi: uwagi || undefined,
        });
      } else {
        result = await editResidenceBasisAction(foreignerId, {
          basisType: basisType as LegacyBasisType,
          date: dataDo || dataOd,
          note: legacyNote || undefined,
        });
      }
      if (result.ok) {
        setMode("view");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      if (isV2 && props.residenceBasisId) {
        await deleteResidenceBasisV2Action(props.residenceBasisId);
      } else {
        await deleteResidenceBasisAction(foreignerId, basisType);
      }
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
          {isV2 ? (
            <>
              {/* V2: all structured fields */}
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
                  <label className={labelCls}>Nr decyzji / sygnatura</label>
                  <input value={nrDecyzji} onChange={(e) => setNrDecyzji(e.target.value)} className={inputCls} placeholder="np. WSC-II-P.6151.34116.2025" />
                </div>
                <div>
                  <label className={labelCls}>Nr karty pobytu</label>
                  <input value={nrKartyPobytu} onChange={(e) => setNrKartyPobytu(e.target.value)} className={inputCls} placeholder="np. AB 1234567" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nr wizy</label>
                  <input value={nrWizy} onChange={(e) => setNrWizy(e.target.value)} className={inputCls} placeholder="np. PL 12345678" />
                </div>
                <div>
                  <label className={labelCls}>Urząd / wojewoda</label>
                  <input value={urzad} onChange={(e) => setUrzad(e.target.value)} className={inputCls} placeholder="np. Wojewoda Mazowiecki" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Uwagi</label>
                <textarea value={uwagi} onChange={(e) => setUwagi(e.target.value)} className={inputCls} rows={2} placeholder="Dodatkowe uwagi..." />
              </div>
            </>
          ) : (
            <>
              {/* Legacy: simple date + note */}
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
              <div>
                <label className={labelCls}>Uwagi / komentarz</label>
                <textarea value={legacyNote} onChange={(e) => setLegacyNote(e.target.value)} className={inputCls} rows={2} placeholder="Dodatkowe uwagi..." />
              </div>
            </>
          )}
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
