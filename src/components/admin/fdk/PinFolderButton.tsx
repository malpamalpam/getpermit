"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff } from "lucide-react";

interface Props {
  attachmentId: number;
  targetFolder: string;
  targetLabel: string;
  isPinned: boolean;
}

/**
 * Toggle button that adds/removes a folder from attachment's extraFolders.
 * Use case: final declaration (folder="wazne") → pin also to "oswiadczenie",
 * or vice versa.
 */
export function PinFolderButton({ attachmentId, targetFolder, targetLabel, isPinned }: Props) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setSaving(true);
    try {
      const body = isPinned
        ? { removeExtraFolder: targetFolder }
        : { addExtraFolder: targetFolder };
      const res = await fetch(`/api/fdk/attachments/${attachmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={saving}
      title={isPinned ? `Usuń z "${targetLabel}"` : `Pokaż też w "${targetLabel}"`}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
        isPinned
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-primary/5 text-primary/50 hover:bg-primary/10"
      }`}
    >
      {isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
      {isPinned ? targetLabel : `+${targetLabel}`}
    </button>
  );
}
