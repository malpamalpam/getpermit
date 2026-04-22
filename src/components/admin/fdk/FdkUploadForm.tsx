"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "glowne", label: "Dokumenty główne" },
  { value: "wp_2023", label: "WP 2023" },
  { value: "wp_2024", label: "WP 2024" },
  { value: "wp_2025", label: "WP 2025" },
  { value: "trc_2024", label: "TRC 2024" },
  { value: "trc_2025", label: "TRC 2025" },
  { value: "hr", label: "HR" },
  { value: "inne", label: "Inne" },
];

export function FdkUploadForm({ foreignerId }: { foreignerId: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kategoria, setKategoria] = useState("glowne");
  const [nazwaWyswietlana, setNazwaWyswietlana] = useState("");
  const [opis, setOpis] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("foreignerId", String(foreignerId));
    fd.append("kategoria", kategoria);
    fd.append("nazwaWyswietlana", nazwaWyswietlana || file.name);
    if (opis) fd.append("opis", opis);

    try {
      const res = await fetch("/api/fdk/attachments/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
        return;
      }
      // Reset form
      setNazwaWyswietlana("");
      setOpis("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setError("Błąd połączenia");
    } finally {
      setUploading(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-primary/15 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-dashed border-primary/20 bg-surface p-6">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
        <Upload className="h-4 w-4 text-accent" /> Dodaj załącznik
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-primary/60">Plik *</label>
          <input
            ref={fileRef}
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.xlsx"
            className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent"
            disabled={uploading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary/60">Kategoria</label>
          <select value={kategoria} onChange={(e) => setKategoria(e.target.value)} className={inputCls} disabled={uploading}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary/60">Nazwa wyświetlana</label>
          <input
            type="text"
            value={nazwaWyswietlana}
            onChange={(e) => setNazwaWyswietlana(e.target.value)}
            placeholder="Opcjonalnie (domyślnie nazwa pliku)"
            className={inputCls}
            disabled={uploading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary/60">Opis</label>
          <input
            type="text"
            value={opis}
            onChange={(e) => setOpis(e.target.value)}
            placeholder="Opcjonalny opis"
            className={inputCls}
            disabled={uploading}
          />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={uploading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "Wysyłanie..." : "Wyślij"}
      </button>
    </form>
  );
}
