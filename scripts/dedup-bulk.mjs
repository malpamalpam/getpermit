/**
 * Bulk deduplication of employment bases across all profiles.
 *
 * Rules:
 * - For each (foreignerId, typ, status) group with >1 entries:
 *   - AKTYWNE: keep the one with most data (non-null fields), delete rest
 *   - WYGASLE/NIEAKTYWNE: keep the one with latest dataDo (or most data), delete rest
 *   - BRAK_DANYCH: keep one with most data, delete rest
 * - Exception: AKTYWNE bases with DIFFERENT nrDecyzji/nrOswiadczenia = separate documents, keep both
 * - Exception: POWIADOMIENIE_UA — keep only the newest AKTYWNE, all others → NIEAKTYWNE then dedup
 *
 * Usage:
 *   node --env-file=.env.local scripts/dedup-bulk.mjs            # dry-run
 *   node --env-file=.env.local scripts/dedup-bulk.mjs --run       # execute
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const CHANGED_BY = "dedup-bulk";

function score(b) {
  let s = 0;
  const fields = ["dataOd", "dataDo", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji", "nrOswiadczenia", "rodzajUmowy"];
  for (const f of fields) {
    if (b[f] !== null && b[f] !== undefined && b[f] !== "") s++;
  }
  return s;
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  BULK DEDUP — ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  const foreigners = await db.fdkForeigner.findMany({
    where: { hidden: false },
    include: { employmentBases: { orderBy: { id: "asc" } } },
  });

  let totalDeleted = 0;
  let totalMerged = 0;
  const csvLines = ["foreignerId;nazwisko;typ;status;kept_id;deleted_ids;reason"];

  for (const f of foreigners) {
    if (f.employmentBases.length < 2) continue;

    // Group by (typ, status)
    const groups = new Map();
    for (const b of f.employmentBases) {
      const key = `${b.typ}|${b.status}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(b);
    }

    for (const [key, bases] of groups) {
      if (bases.length < 2) continue;

      const [typ, status] = key.split("|");

      // Exception: AKTYWNE with different document numbers = separate docs, don't merge
      if (status === "AKTYWNE") {
        const withNr = bases.filter(b => b.nrDecyzji || b.nrOswiadczenia);
        const uniqueNrs = new Set(withNr.map(b => (b.nrDecyzji || b.nrOswiadczenia || "").trim()).filter(Boolean));
        if (uniqueNrs.size > 1) continue; // Different documents, skip
      }

      // Score and sort
      const scored = bases.map(b => ({ base: b, score: score(b) }));
      scored.sort((a, b) => {
        // Prefer: more data > newer dataDo > newer id
        if (b.score !== a.score) return b.score - a.score;
        const aDo = a.base.dataDo?.getTime() ?? 0;
        const bDo = b.base.dataDo?.getTime() ?? 0;
        if (bDo !== aDo) return bDo - aDo;
        return b.base.id - a.base.id;
      });

      const keeper = scored[0].base;
      const toDelete = scored.slice(1).map(s => s.base);

      if (toDelete.length === 0) continue;

      const name = `${f.imie ?? ""} ${f.nazwisko}`.trim();
      const deleteIds = toDelete.map(b => b.id);
      console.log(`  [${name}] ${typ}|${status}: keep #${keeper.id}, delete ${deleteIds.map(id => `#${id}`).join(",")}`);

      if (DO_RUN) {
        // Merge: fill keeper's empty fields from duplicates
        const mergeFields = ["dataOd", "dataDo", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji",
          "nrOswiadczenia", "rodzajUmowy", "urzad", "sygnatura", "obywatelstwo"];
        const updateData = {};
        for (const dup of toDelete) {
          for (const field of mergeFields) {
            if ((keeper[field] === null || keeper[field] === undefined || keeper[field] === "") &&
                dup[field] !== null && dup[field] !== undefined && dup[field] !== "") {
              if (!updateData[field]) updateData[field] = dup[field];
            }
          }
        }
        if (Object.keys(updateData).length > 0) {
          await db.fdkEmploymentBase.update({ where: { id: keeper.id }, data: updateData });
          totalMerged++;
        }

        // Delete duplicates
        for (const dup of toDelete) {
          await db.fdkEmploymentBase.delete({ where: { id: dup.id } });
          totalDeleted++;
        }

        await db.fdkChangeLog.create({
          data: {
            foreignerId: f.id, changedBy: CHANGED_BY, field: "dedup_bulk",
            oldValue: `${typ}|${status} x${bases.length}`,
            newValue: `Zachowano #${keeper.id}, usunięto ${deleteIds.map(id => `#${id}`).join(",")}`,
          },
        });
      } else {
        totalDeleted += toDelete.length;
      }

      csvLines.push(`${f.id};"${f.nazwisko}";${typ};${status};${keeper.id};${deleteIds.join(",")};dedup`);
    }
  }

  fs.writeFileSync("raport-dedup-bulk.csv", csvLines.join("\n"), "utf-8");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`  Usunięte duplikaty: ${totalDeleted}`);
  console.log(`  Scalone dane: ${totalMerged}`);
  console.log(`  Raport: raport-dedup-bulk.csv`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
