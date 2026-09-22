"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Loader2 } from "lucide-react";
import { createResidenceReminderAction } from "@/lib/fdk-actions";

export function ResidenceReminderButton({ foreignerId }: { foreignerId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!date) return;
    startTransition(async () => {
      const result = await createResidenceReminderAction(foreignerId, { reminderDate: date });
      if (result.ok) {
        setOpen(false);
        setDate("");
        router.refresh();
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded p-0.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50"
        title="Ustaw przypomnienie o aktualizację statusu"
      >
        <Bell className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
      <Bell className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded border border-amber-300 px-2 py-1 text-xs"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !date}
        className="rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Przypomnij"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-amber-400 hover:text-amber-600">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
