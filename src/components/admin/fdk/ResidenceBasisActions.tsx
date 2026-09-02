"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { editResidenceBasisAction, deleteResidenceBasisAction } from "@/lib/fdk-actions";

type BasisType = "karta" | "wiza" | "upo" | "ochrona_ukr";

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
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [date, setDate] = useState(currentDate ?? "");
  const [note, setNote] = useState(currentNote ?? "");
  const [isPending, startTransition] = useTransition();

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await editResidenceBasisAction(foreignerId, { basisType, date, note });
      if (result.ok) setMode("view");
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteResidenceBasisAction(foreignerId, basisType);
      setMode("view");
    });
  };

  if (mode === "view") {
    return (
      <div className="mt-1 flex gap-1">
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
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs text-red-600">Usunąć?</span>
        <button onClick={handleDelete} disabled={isPending} className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600 disabled:opacity-50">
          {isPending ? "..." : "Tak"}
        </button>
        <button onClick={() => setMode("view")} className="text-[10px] text-primary/50 hover:text-primary">Nie</button>
      </div>
    );
  }

  // Edit mode
  return (
    <form onSubmit={handleEdit} className="mt-1 flex items-center gap-1">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border border-primary/15 bg-white px-1.5 py-0.5 text-[10px] focus:border-accent focus:outline-none" />
      {basisType === "upo" && (
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Uwagi" className="rounded border border-primary/15 bg-white px-1.5 py-0.5 text-[10px] w-32 focus:border-accent focus:outline-none" />
      )}
      <button type="submit" disabled={isPending} className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white disabled:opacity-50">OK</button>
      <button type="button" onClick={() => setMode("view")} className="text-primary/40 hover:text-primary"><X className="h-3 w-3" /></button>
    </form>
  );
}
