/**
 * Skrypt naprawczy stawek: re-parse istniejących wynagrodzeń.
 *
 * Dla każdej podstawy z polem `wynagrodzenie` — parsuje na nowo,
 * formatuje jako "kwota PLN brutto / mies." i oznacza podejrzane.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-salary.mjs               # dry-run
 *   node --env-file=.env.local scripts/fix-salary.mjs --run         # wykonaj
 *   node --env-file=.env.local scripts/fix-salary.mjs --run --report raport-fix-salary.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "fix-salary-script";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const csvRows = [["foreignerId", "nazwisko", "imie", "baseId", "typ", "old_wynagrodzenie", "new_wynagrodzenie", "podejrzana"]];

/**
 * Inline salary parser (mirror of parseSalary from pdf-parser.ts)
 */
function parseSalary(raw) {
  if (!raw || raw.length < 2) return null;
  const norm = raw.replace(/\s+/g, " ").trim();

  const numMatch = norm.match(/(\d[\d\s]*(?:[.,]\d{1,2})?)/);
  if (!numMatch) return null;

  const kwotaStr = numMatch[1].replace(/\s/g, "").replace(",", ".");
  const kwota = parseFloat(kwotaStr);
  if (isNaN(kwota) || kwota <= 0) return null;

  let jednostka = "nieznana";
  if (/miesi[ęe]czn|\/\s*mies|miesiac|\/m\b/i.test(norm)) jednostka = "miesiecznie";
  else if (/godzin|\/\s*h\b|\/\s*godz|za\s+godzin/i.test(norm)) jednostka = "godzinowo";

  let bruttoNetto = "nieznane";
  if (/brutto/i.test(norm)) bruttoNetto = "brutto";
  else if (/netto/i.test(norm)) bruttoNetto = "netto";

  const podejrzana =
    (jednostka === "miesiecznie" && kwota < 1000) ||
    (jednostka === "godzinowo" && kwota < 20) ||
    (jednostka === "nieznana" && kwota < 20);

  return { kwota, jednostka, bruttoNetto, raw: norm, podejrzana };
}

function formatSalary(s) {
  const fmt = s.kwota.toLocaleString("pl-PL", { minimumFractionDigits: s.kwota % 1 !== 0 ? 2 : 0 });
  const bn = s.bruttoNetto === "nieznane" ? "" : ` ${s.bruttoNetto}`;

  if (s.jednostka === "godzinowo") {
    const monthly = Math.round(s.kwota * 168);
    const monthlyFmt = monthly.toLocaleString("pl-PL");
    return `${fmt} PLN/h${bn} — ≈ ${monthlyFmt} PLN/mies. przy pełnym etacie`;
  }
  if (s.jednostka === "miesiecznie") return `${fmt} PLN${bn} / mies.`;
  return `${fmt} PLN${bn}`;
}

async function main() {
  console.log(`=== Fix stawek (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const bases = await db.fdkEmploymentBase.findMany({
    where: { wynagrodzenie: { not: null } },
    include: { foreigner: true },
  });

  console.log(`Znaleziono ${bases.length} podstaw z wynagrodzeniem\n`);

  let updated = 0;
  let suspicious = 0;

  for (const base of bases) {
    const oldWyn = base.wynagrodzenie;
    const parsed = parseSalary(oldWyn);
    if (!parsed) continue;

    const newWyn = formatSalary(parsed);
    if (newWyn === oldWyn) continue; // already formatted

    const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
    const flag = parsed.podejrzana ? " [PODEJRZANA]" : "";
    console.log(`  ${name} #${base.id}: "${oldWyn}" → "${newWyn}"${flag}`);

    if (parsed.podejrzana) suspicious++;

    if (DO_RUN) {
      const uwagi = parsed.podejrzana
        ? (base.uwagi ? `${base.uwagi}\n⚠ Stawka podejrzana — sprawdź` : "⚠ Stawka podejrzana — sprawdź")
        : base.uwagi;

      await db.fdkEmploymentBase.update({
        where: { id: base.id },
        data: { wynagrodzenie: newWyn, uwagi },
      });

      await db.fdkChangeLog.create({
        data: {
          foreignerId: base.foreignerId,
          changedBy: CHANGED_BY,
          field: "wynagrodzenie",
          oldValue: oldWyn,
          newValue: newWyn + (parsed.podejrzana ? " [PODEJRZANA]" : ""),
        },
      });
    }

    updated++;
    csvRows.push([
      String(base.foreignerId), base.foreigner.nazwisko, base.foreigner.imie ?? "",
      String(base.id), base.typ, oldWyn, newWyn, parsed.podejrzana ? "TAK" : "NIE",
    ]);
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`Zaktualizowanych: ${updated}`);
  console.log(`Podejrzanych stawek: ${suspicious}`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
