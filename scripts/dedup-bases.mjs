/**
 * Deduplikacja podstaw zatrudnienia w całej bazie FDK.
 *
 * Reguły:
 *   1. Ten sam cudzoziemiec + ten sam typ + ta sama dataDo (i ten sam nrDecyzji jeśli jest) → duplikat
 *   2. Scal dane: niepuste pola wygrywają, starszy rekord → oznacz "wchłonięty"
 *   3. Ten sam plik (sourceAttachmentId) → zachowaj jeden rekord
 *
 * Usage:
 *   node --env-file=.env.local scripts/dedup-bases.mjs               # dry-run
 *   node --env-file=.env.local scripts/dedup-bases.mjs --run          # wykonaj
 *   node --env-file=.env.local scripts/dedup-bases.mjs --run --report raport-dedup.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "dedup-bases-script";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const csvRows = [["foreignerId", "nazwisko", "imie", "baseId_kept", "baseId_removed", "typ", "dataDo", "reason"]];

async function main() {
  console.log(`=== Deduplikacja podstaw zatrudnienia (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const foreigners = await db.fdkForeigner.findMany({
    include: {
      employmentBases: { orderBy: { createdAt: "asc" } },
    },
  });

  let totalRemoved = 0;
  let totalMerged = 0;

  for (const f of foreigners) {
    if (f.employmentBases.length < 2) continue;

    // Group by (typ, dataDo, nrDecyzji/nrOswiadczenia)
    const groups = new Map();
    for (const base of f.employmentBases) {
      const dataDo = base.dataDo ? base.dataDo.toISOString().slice(0, 10) : "null";
      const docNr = base.nrDecyzji || base.nrOswiadczenia || "";
      const key = `${base.typ}|${dataDo}|${docNr}`;

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(base);
    }

    for (const [key, bases] of groups) {
      if (bases.length < 2) continue;

      // Keep the one with most data (count non-null fields)
      const scored = bases.map((b) => {
        let score = 0;
        const fields = ["dataOd", "dataDo", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji", "nrOswiadczenia", "rodzajUmowy", "urzad", "sygnatura"];
        for (const f of fields) {
          if (b[f] !== null && b[f] !== undefined && b[f] !== "") score++;
        }
        return { base: b, score };
      });
      scored.sort((a, b) => b.score - a.score);

      const keeper = scored[0].base;
      const duplicates = scored.slice(1).map((s) => s.base);

      for (const dup of duplicates) {
        const name = `${f.imie ?? ""} ${f.nazwisko}`.trim();
        const dataDo = dup.dataDo ? dup.dataDo.toISOString().slice(0, 10) : "brak";
        console.log(`  [DEDUP] ${name}: usuwam #${dup.id} (${dup.typ}, do ${dataDo}), zachowuję #${keeper.id}`);

        // Merge: fill in keeper's empty fields from duplicate
        if (DO_RUN) {
          const updateData = {};
          const mergeFields = ["dataOd", "dataDo", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji",
            "nrOswiadczenia", "rodzajUmowy", "urzad", "sygnatura", "rodzajSprawy", "obywatelstwo"];
          for (const field of mergeFields) {
            if ((keeper[field] === null || keeper[field] === undefined || keeper[field] === "") &&
                dup[field] !== null && dup[field] !== undefined && dup[field] !== "") {
              updateData[field] = dup[field];
            }
          }
          if (Object.keys(updateData).length > 0) {
            await db.fdkEmploymentBase.update({ where: { id: keeper.id }, data: updateData });
            totalMerged++;
          }

          // Log and delete duplicate
          await db.fdkChangeLog.create({
            data: {
              foreignerId: f.id,
              changedBy: CHANGED_BY,
              field: "dedup",
              oldValue: `Podstawa #${dup.id} (${dup.typ})`,
              newValue: `Wchłonięta przez #${keeper.id} — duplikat usunięty`,
            },
          });
          await db.fdkEmploymentBase.delete({ where: { id: dup.id } });
        }

        totalRemoved++;
        csvRows.push([
          String(f.id), f.nazwisko, f.imie ?? "", String(keeper.id), String(dup.id),
          dup.typ, dataDo, "dedup_same_type_date",
        ]);
      }
    }
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`Usunięto duplikatów: ${totalRemoved}`);
  console.log(`Scalono danych: ${totalMerged}`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
