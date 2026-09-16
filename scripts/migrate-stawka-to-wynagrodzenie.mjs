/**
 * Skrypt: migracja stawka → wynagrodzenie.
 * Przepisuje wartość stawka do wynagrodzenie tam gdzie wynagrodzenie jest puste.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-stawka-to-wynagrodzenie.mjs
 *   node --env-file=.env.local scripts/migrate-stawka-to-wynagrodzenie.mjs --run --report raport-migrate-stawka.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const csvRows = [["baseId", "foreignerId", "nazwisko", "typ", "stawka", "wynagrodzenie_old", "wynagrodzenie_new", "action"]];

async function main() {
  console.log(`=== Migracja stawka → wynagrodzenie (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const bases = await db.$queryRaw`
    SELECT b.id, b.foreigner_id, b.typ, b.stawka, b.wynagrodzenie,
           f.nazwisko, f.imie
    FROM fdk_employment_bases b
    JOIN fdk_foreigners f ON f.id = b.foreigner_id
    WHERE b.stawka IS NOT NULL
  `;

  console.log(`Znaleziono ${/** @type {any[]} */ (bases).length} podstaw ze stawką\n`);

  let migrated = 0;

  for (const b of /** @type {any[]} */ (bases)) {
    const stawkaNum = Number(b.stawka);
    const newWyn = `${stawkaNum.toLocaleString("pl-PL")} PLN`;
    const hasWyn = !!b.wynagrodzenie;

    console.log(`  [${b.id}] ${b.imie ?? ""} ${b.nazwisko} — typ=${b.typ} stawka=${stawkaNum} wynagrodzenie=${b.wynagrodzenie ?? "BRAK"}`);

    if (!hasWyn) {
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({
          where: { id: b.id },
          data: { wynagrodzenie: newWyn },
        });
        console.log(`        → wynagrodzenie = "${newWyn}"`);
      }
      migrated++;
      csvRows.push([String(b.id), String(b.foreigner_id), b.nazwisko, b.typ, String(stawkaNum), b.wynagrodzenie ?? "", newWyn, hasWyn ? "skip_has_wyn" : "migrated"]);
    } else {
      console.log(`        → pomijam (wynagrodzenie już wypełnione)`);
      csvRows.push([String(b.id), String(b.foreigner_id), b.nazwisko, b.typ, String(stawkaNum), b.wynagrodzenie, "", "skip_has_wyn"]);
    }
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`${DO_RUN ? "Zmigrowanych" : "Do migracji"}: ${migrated}`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
