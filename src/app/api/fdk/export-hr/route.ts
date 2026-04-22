import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/fdk/export-hr
 *
 * Eksportuje dane HR wszystkich cudzoziemców do CSV.
 */
export async function GET() {
  await requireAdmin();

  const contracts = await db.fdkHrContract.findMany({
    include: {
      foreigner: { select: { nazwisko: true, imie: true, pesel: true } },
    },
    orderBy: [{ foreigner: { nazwisko: "asc" } }, { rok: "desc" }],
  });

  const BOM = "\uFEFF";
  const header = [
    "Nazwisko",
    "Imię",
    "PESEL",
    "Rok",
    "Od",
    "Do",
    "Rodzaj umowy",
    "KUP",
    "Kwota brutto min.",
    "Kwota całościowa",
    "Stanowisko",
  ].join(";");

  const rows = contracts.map((c) => {
    const fmt = (d: Date | null) => d ? d.toLocaleDateString("pl-PL") : "";
    return [
      c.foreigner.nazwisko,
      c.foreigner.imie ?? "",
      c.foreigner.pesel ?? "",
      c.rok,
      fmt(c.dataOd),
      fmt(c.dataDo),
      c.rodzajUmowy ?? "",
      c.kup ? `${Number(c.kup) * 100}%` : "",
      c.kwotaBruttoMin ? Number(c.kwotaBruttoMin).toFixed(2) : "",
      c.kwotaCalosciowa ? Number(c.kwotaCalosciowa).toFixed(2) : "",
      c.stanowisko ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";");
  });

  const csv = BOM + header + "\n" + rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fdk_hr_export_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
