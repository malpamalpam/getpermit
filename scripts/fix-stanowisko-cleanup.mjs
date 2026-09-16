/**
 * Skrypt: czyszczenie stanowisk zawierających etykiety (tekst przed dwukropkiem).
 * Np. "Stanowisko: spawacz" → "spawacz"
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-stanowisko-cleanup.mjs
 *   node --env-file=.env.local scripts/fix-stanowisko-cleanup.mjs --run --report raport-fix-stanowisko.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "fix-stanowisko-script";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const csvRows = [["baseId", "foreignerId", "nazwisko", "oldStanowisko", "newStanowisko", "action"]];

async function main() {
  console.log(`=== Fix stanowisko — cleanup etykiet (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const bases = await db.fdkEmploymentBase.findMany({
    where: {
      stanowisko: { not: null },
    },
    include: { foreigner: true },
  });

  console.log(`Znaleziono ${bases.length} podstaw ze stanowiskiem\n`);

  let fixed = 0;

  for (const base of bases) {
    if (!base.stanowisko) continue;

    let newStanowisko = base.stanowisko;

    // Jeśli zawiera dwukropek — weź tylko wartość po ostatnim dwukropku
    if (newStanowisko.includes(":")) {
      const afterColon = newStanowisko.split(":").pop().trim();
      if (afterColon.length > 2) newStanowisko = afterColon;
    }

    // Usuń znane etykiety z początku
    newStanowisko = newStanowisko
      .replace(/^(?:Stanowisko|Rodzaj pracy|Rodzaj wykonywanej pracy)\s*[:/]\s*/i, "")
      .trim();

    if (newStanowisko !== base.stanowisko) {
      const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
      console.log(`  [${base.id}] ${name}: "${base.stanowisko.substring(0, 60)}" → "${newStanowisko.substring(0, 60)}"`);

      if (DO_RUN) {
        await db.fdkEmploymentBase.update({
          where: { id: base.id },
          data: { stanowisko: newStanowisko },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: base.foreignerId,
            changedBy: CHANGED_BY,
            field: "stanowisko",
            oldValue: base.stanowisko,
            newValue: newStanowisko,
          },
        });
      }

      fixed++;
      csvRows.push([String(base.id), String(base.foreignerId), base.foreigner.nazwisko, base.stanowisko.substring(0, 120), newStanowisko.substring(0, 120), DO_RUN ? "fixed" : "would_fix"]);
    }
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`${DO_RUN ? "Naprawionych" : "Do naprawy"}: ${fixed} / ${bases.length}`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
