"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Loader2, Check, AlertCircle } from "lucide-react";

interface Props {
  attachmentId: number;
  typPliku: string;
}

const TYPE_LABELS: Record<string, string> = {
  ZEZWOLENIE: "Zezwolenie na pracę",
  OSWIADCZENIE: "Oświadczenie",
  KARTA_POBYTU: "Karta pobytu",
  BLUE_CARD: "EU Blue Card",
  ODWOLANIE: "Odwołanie/zażalenie",
};

export function ScrapeButton({ attachmentId, typPliku }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; isError: boolean } | null>(null);

  if (typPliku !== "pdf") return null;

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/fdk/attachments/${attachmentId}?action=scrape`);
      const data = await res.json();
      if (data.ok) {
        const parts: string[] = [];

        // Document type
        if (data.extracted?.detectedType) {
          parts.push(TYPE_LABELS[data.extracted.detectedType] ?? data.extracted.detectedType);
        }

        // ODWOLANIE — special message, no employment base
        if (data.extracted?.detectedType === "ODWOLANIE") {
          setResult({ text: `${parts[0]} — nie utworzono podstawy zatrudnienia`, isError: false });
          router.refresh();
          return;
        }

        if (data.extracted?.dataOd) parts.push(`Od: ${data.extracted.dataOd}`);
        if (data.extracted?.dataDo) parts.push(`Do: ${data.extracted.dataDo}`);
        if (data.extracted?.firma) parts.push(data.extracted.firma);
        if (data.extracted?.rodzajUmowy) parts.push(data.extracted.rodzajUmowy);
        if (data.employmentBaseCreated) parts.push("✓ dodano do podstaw zatrudnienia");

        // Show message (e.g. appeal)
        if (data.message) parts.push(data.message);

        setResult({ text: parts.join(" | ") || "Wyciągnięto dane", isError: false });
        router.refresh();
      } else {
        setResult({ text: data.error || "Nie udało się", isError: true });
      }
    } catch {
      setResult({ text: "Błąd połączenia", isError: true });
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
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : result && !result.isError ? (
          <Check className="h-3 w-3" />
        ) : result?.isError ? (
          <AlertCircle className="h-3 w-3" />
        ) : (
          <FileSearch className="h-3 w-3" />
        )}
        {loading ? "Scrapuję… (może potrwać ~30s)" : "Zescrapuj dane"}
      </button>
      {result && (
        <p className={`mt-1 text-[10px] ${result.isError ? "text-red-600" : "text-orange-600"}`}>
          {result.text}
        </p>
      )}
    </div>
  );
}
