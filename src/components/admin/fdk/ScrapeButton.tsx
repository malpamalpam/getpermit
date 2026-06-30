"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Loader2, Check } from "lucide-react";

interface Props {
  attachmentId: number;
  typPliku: string;
}

export function ScrapeButton({ attachmentId, typPliku }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (typPliku !== "pdf") return null;

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/fdk/attachments/${attachmentId}?action=scrape`);
      const data = await res.json();
      if (data.ok) {
        const parts: string[] = [];
        if (data.extracted?.dataOd) parts.push(`Od: ${data.extracted.dataOd}`);
        if (data.extracted?.dataDo) parts.push(`Do: ${data.extracted.dataDo}`);
        if (data.extracted?.rodzajPracy) parts.push(`Praca: ${data.extracted.rodzajPracy}`);
        if (data.extracted?.rodzajUmowy) parts.push(`Umowa: ${data.extracted.rodzajUmowy}`);
        if (data.extracted?.wynagrodzenie) parts.push(`Wynagrodzenie: ${data.extracted.wynagrodzenie}`);
        if (data.employmentBaseCreated) parts.push("Dodano do podstaw zatrudnienia");
        setResult(parts.length > 0 ? parts.join(" | ") : "Wyciągnięto dane");
        router.refresh();
      } else {
        setResult(data.error || "Nie udało się");
      }
    } catch {
      setResult("Błąd połączenia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleScrape}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-200 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : result ? <Check className="h-3 w-3" /> : <FileSearch className="h-3 w-3" />}
        {loading ? "Scrapuję..." : "Zescrapuj dane"}
      </button>
      {result && (
        <p className="mt-1 text-[10px] text-orange-600">{result}</p>
      )}
    </div>
  );
}
