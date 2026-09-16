/**
 * Skrypt: czyszczenie błędnych pól w podstawach ZGLOSZENIE_UA.
 * Szuka stanowisk/rodzajUmowy zawierających etykiety formularza zamiast wartości.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-zgloszenie-ua-bases.mjs
 *   node --env-file=.env.local scripts/fix-zgloszenie-ua-bases.mjs --run --report raport-fix-zgloszenie-ua.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "fix-zgloszenie-ua-script";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const BAD_PATTERNS = [
  /WYMIAR\s+CZASU/i,
  /Symbol\s+PKD/i,
  /PKD[\s-]*\d{4}/i,
  /podklasy?\s+dzia[łl]alno/i,
  /nie\s+dotyczy/i,
  /Stanowisko\s*\/?\s*rodzaj/i,
];

const csvRows = [["baseId", "foreignerId", "nazwisko", "field", "oldValue", "action"]];

async function main() {
  console.log(`=== Fix ZGLOSZENIE_UA — czyszczenie etykiet (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const bases = await db.fdkEmploymentBase.findMany({
    where: { typ: "ZGLOSZENIE_UA" },
    include: { foreigner: true },
  });

  console.log(`Znaleziono ${bases.length} podstaw ZGLOSZENIE_UA\n`);

  let fixed = 0;

  for (const base of bases) {
    const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
    const updates = {};

    // Sprawdź stanowisko
    if (base.stanowisko && BAD_PATTERNS.some((p) => p.test(base.stanowisko))) {
      console.log(`  [${base.id}] ${name} — stanowisko: "${base.stanowisko.substring(0, 80)}..." → WYCZYŚĆ`);
      updates.stanowisko = null;
      csvRows.push([String(base.id), String(base.foreignerId), base.foreigner.nazwisko, "stanowisko", base.stanowisko.substring(0, 120), "cleared"]);
    }

    // Sprawdź rodzajUmowy
    if (base.rodzajUmowy && BAD_PATTERNS.some((p) => p.test(base.rodzajUmowy))) {
      console.log(`  [${base.id}] ${name} — rodzajUmowy: "${base.rodzajUmowy.substring(0, 80)}..." → WYCZYŚĆ`);
      updates.rodzajUmowy = null;
      csvRows.push([String(base.id), String(base.foreignerId), base.foreigner.nazwisko, "rodzajUmowy", base.rodzajUmowy.substring(0, 120), "cleared"]);
    }

    // Sprawdź podjeciePracy (legacy field)
    if (base.podjeciePracy && BAD_PATTERNS.some((p) => p.test(base.podjeciePracy))) {
      updates.podjeciePracy = null;
      csvRows.push([String(base.id), String(base.foreignerId), base.foreigner.nazwisko, "podjeciePracy", base.podjeciePracy.substring(0, 120), "cleared"]);
    }

    if (Object.keys(updates).length > 0) {
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: updates });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: base.foreignerId,
            changedBy: CHANGED_BY,
            field: "employment_base_fix",
            oldValue: `Podstawa #${base.id} ZGLOSZENIE_UA`,
            newValue: `Wyczyszczone pola z etykietami formularza: ${Object.keys(updates).join(", ")}`,
          },
        });
      }
      fixed++;
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
