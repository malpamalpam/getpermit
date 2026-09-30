"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, Loader2 } from "lucide-react";
import { toggleForeignerHiddenAction } from "@/lib/fdk-actions";

export function ToggleHiddenButton({ foreignerId, hidden }: { foreignerId: number; hidden: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (!confirm(hidden ? "Przywrócić profil na listę aktywnych?" : "Ukryć profil? Dane zostaną zachowane.")) return;
    startTransition(async () => {
      await toggleForeignerHiddenAction(foreignerId);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        hidden
          ? "border-green-200 text-green-700 hover:bg-green-50"
          : "border-gray-200 text-gray-600 hover:bg-gray-50"
      } disabled:opacity-50`}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      {hidden ? "Przywróć na listę" : "Ukryj"}
    </button>
  );
}
