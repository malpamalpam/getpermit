"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteFdkAttachmentAction } from "@/lib/fdk-actions";

export function DeleteAttachmentButton({ attachmentId, nazwa }: { attachmentId: number; nazwa: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm(`Na pewno usunąć załącznik "${nazwa}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteFdkAttachmentAction(attachmentId);
        if (result.ok) {
          router.refresh();
        } else {
          setError("Nie udało się usunąć pliku.");
        }
      } catch {
        setError("Błąd połączenia.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
        title="Usuń plik"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Usuń
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </>
  );
}
