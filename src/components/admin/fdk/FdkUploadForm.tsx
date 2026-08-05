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

// Vercel Hobby plan has ~4.5 MB body limit for serverless functions.
// Files larger than this are uploaded via presigned URL directly to Supabase Storage.
const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4 MB
const MAX_FILE_SIZE_MB = 25;

export function FdkUploadForm({ foreignerId }: { foreignerId: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [kategoria, setKategoria] = useState("glowne");
  const [nazwaWyswietlana, setNazwaWyswietlana] = useState("");
  const [opis, setOpis] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setInfo(null);

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Plik jest za duży (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksymalny rozmiar: ${MAX_FILE_SIZE_MB} MB.`);
      setUploading(false);
      return;
    }

    try {
      let json;

      if (file.size > DIRECT_UPLOAD_THRESHOLD) {
        // Large file: use presigned upload to bypass Vercel body limit
        // Step 1: Get presigned URL from API
        const metaRes = await fetch("/api/fdk/attachments/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foreignerId,
            kategoria,
            nazwaWyswietlana: nazwaWyswietlana || file.name,
            opis: opis || undefined,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || "application/octet-stream",
            presigned: true,
          }),
        });

        let metaJson;
        try { metaJson = await metaRes.json(); } catch { setError(`Błąd serwera (HTTP ${metaRes.status}).`); return; }
        if (!metaRes.ok) { setError(metaJson.error ?? "Nie udało się przygotować uploadu."); return; }

        // Step 2: Upload file directly to Supabase Storage
        const uploadRes = await fetch(metaJson.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!uploadRes.ok) {
          setError(`Błąd przesyłania pliku do storage (HTTP ${uploadRes.status}). Spróbuj ponownie.`);
          return;
        }

        // Step 3: Confirm upload and trigger parsing
        const confirmRes = await fetch(`/api/fdk/attachments/${metaJson.attachmentId}?action=confirm-upload`, {
          method: "POST",
        });
        try { json = await confirmRes.json(); } catch { setError(`Błąd potwierdzenia uploadu (HTTP ${confirmRes.status}).`); return; }
        if (!confirmRes.ok) { setError(json.error ?? "Potwierdzenie uploadu nie powiodło się."); return; }
      } else {
        // Small file: standard FormData upload
        const fd = new FormData();
        fd.append("file", file);
        fd.append("foreignerId", String(foreignerId));
        fd.append("kategoria", kategoria);
        fd.append("nazwaWyswietlana", nazwaWyswietlana || file.name);
        if (opis) fd.append("opis", opis);

        const res = await fetch("/api/fdk/attachments/upload", { method: "POST", body: fd });
        if (res.status === 413) {
          setError("Plik jest za duży dla tego trybu. Spróbuj ponownie — system użyje alternatywnej metody.");
          return;
        }
        try { json = await res.json(); } catch { setError(`Błąd serwera (HTTP ${res.status}). Spróbuj ponownie.`); return; }
        if (!res.ok) { setError(json.error ?? "Upload failed"); return; }
      }

      // Show extraction info if partial
      if (json.message) {
        setInfo(json.message);
      }
      // Reset form
      setNazwaWyswietlana("");
      setOpis("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Błąd połączenia z serwerem. Sprawdź połączenie internetowe.");
      } else {
        setError("Błąd wysyłania pliku. Spróbuj ponownie lub zmniejsz rozmiar pliku.");
      }
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
      {info && <p className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-md p-2 border border-amber-200">{info}</p>}
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
