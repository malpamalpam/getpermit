/**
 * Skrypt: usunięcie/przeklasyfikowanie podstaw z uwagą "WERYFIKACJA: obywatelstwo".
 *
 * Stary skrypt fix-oswiadczenia.mjs tworzył podstawy OSWIADCZENIE z adnotacją WERYFIKACJA
 * mimo że obywatelstwo nie uprawnia. Te podstawy nie powinny istnieć.
 *
 * Dry-run: wypisuje listę + CSV
 * --run: usuwa podstawy (lub przeklasyfikowuje, jeśli to możliwe)
 *
 * Usage:
 *   node --env-file=.env.local scripts/cleanup-weryfikacja-bases.mjs
 *   node --env-file=.env.local scripts/cleanup-weryfikacja-bases.mjs --run --report raport-cleanup-weryfikacja.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "cleanup-weryfikacja-script";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const csvRows = [["foreignerId", "nazwisko", "imie", "obywatelstwo", "baseId", "typ", "uwagi_fragment", "action"]];

async function main() {
  console.log(`=== Cleanup podstaw WERYFIKACJA: obywatelstwo (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  // Szukamy podstaw z uwagami zawierającymi "WERYFIKACJA: obywatelstwo"
  const bases = await db.fdkEmploymentBase.findMany({
    where: {
      uwagi: { contains: "WERYFIKACJA: obywatelstwo" },
    },
    include: { foreigner: true },
  });

  console.log(`Znaleziono ${bases.length} podstaw z uwagą "WERYFIKACJA: obywatelstwo"\n`);

  let deleted = 0;

  for (const base of bases) {
    const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
    const citizenship = base.foreigner.obywatelstwo ?? "?";
    const uwagiFragment = (base.uwagi ?? "").substring(0, 120);

    console.log(`  [${base.id}] ${name} (${citizenship}) — typ=${base.typ}, status=${base.status}`);
    console.log(`        uwagi: ${uwagiFragment}...`);

    if (DO_RUN) {
      await db.fdkEmploymentBase.delete({ where: { id: base.id } });

      await db.fdkChangeLog.create({
        data: {
          foreignerId: base.foreignerId,
          changedBy: CHANGED_BY,
          field: "employment_base_cleanup",
          oldValue: `Podstawa #${base.id} ${base.typ} (${base.nrOswiadczenia ?? base.nrDecyzji ?? "brak nr"})`,
          newValue: `Usunięta — fałszywa podstawa z adnotacją WERYFIKACJA obywatelstwa "${citizenship}".`,
        },
      });

      deleted++;
    }

    csvRows.push([
      String(base.foreignerId), base.foreigner.nazwisko, base.foreigner.imie ?? "",
      citizenship, String(base.id), base.typ, uwagiFragment,
      DO_RUN ? "deleted" : "would_delete",
    ]);
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`${DO_RUN ? "Usuniętych" : "Do usunięcia"}: ${DO_RUN ? deleted : bases.length}`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
