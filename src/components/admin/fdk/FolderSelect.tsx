"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";

const FOLDER_OPTIONS = [
  { value: "wazne", label: "Ważne" },
  { value: "inne_dokumenty", label: "Inne dokumenty" },
  { value: "dokumenty_rodziny", label: "Dok. rodziny" },
] as const;

interface Props {
  attachmentId: number;
  currentFolder: string;
}

export default function FolderSelect({ attachmentId, currentFolder }: Props) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const folder = e.target.value;
    if (folder === currentFolder) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/fdk/attachments/${attachmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-1 rounded-md bg-primary/5 px-1.5 py-1 text-[11px] font-medium text-primary/70">
      <FolderOpen className="h-3 w-3" />
      <select
        value={currentFolder}
        onChange={handleChange}
        disabled={saving}
        className="border-0 bg-transparent p-0 text-[11px] font-medium text-primary/70 focus:outline-none focus:ring-0"
      >
        {FOLDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
