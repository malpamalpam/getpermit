import { type NextRequest, NextResponse } from "next/server";

const KZIS_URL = "https://broker.praca.gov.pl/api/liniowy.json";

interface KzisEntry {
  kod: string;
  opis: string;
}

// Cache w pamięci — ładujemy raz, trzymamy do restartu
let cachedOccupations: KzisEntry[] | null = null;
let cachePromise: Promise<KzisEntry[]> | null = null;

async function loadOccupations(): Promise<KzisEntry[]> {
  if (cachedOccupations) return cachedOccupations;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const res = await fetch(KZIS_URL, { next: { revalidate: 86400 } }); // cache 24h
      const data = await res.json();
      // Filtruj tylko 6-cyfrowe kody (konkretne zawody/specjalności)
      const occupations: KzisEntry[] = (data.pozycje ?? [])
        .filter((p: KzisEntry) => p.kod.length === 6)
        .map((p: KzisEntry) => ({ kod: p.kod, opis: p.opis }));
      cachedOccupations = occupations;
      return occupations;
    } catch (e) {
      console.error("[kzis] Failed to load occupations:", e);
      return [];
    }
  })();

  return cachePromise;
}

/**
 * GET /api/kzis?q=programista&limit=20
 * Wyszukuje zawody po nazwie lub kodzie.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get("limit") ?? 20),
    50
  );

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const occupations = await loadOccupations();

  const results = occupations
    .filter(
      (o) =>
        o.opis.toLowerCase().includes(q) || o.kod.startsWith(q)
    )
    .slice(0, limit);

  return NextResponse.json({ results });
}
