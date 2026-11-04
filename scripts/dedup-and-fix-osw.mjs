/**
 * Pkt 2: Dedup employment bases by key (nr oświadczenia / zezwolenia / sygnatura).
 * Pkt 3: Fix oświadczenie dates — re-extract from source attachment text if possible.
 *
 * Usage:
 *   node scripts/dedup-and-fix-osw.mjs            # dry-run
 *   node scripts/dedup-and-fix-osw.mjs --apply    # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  // === PKT 2: DEDUP ===
  console.log("=== PKT 2: Deduplikacja podstaw zatrudnienia ===\n");

  const allBases = await db.fdkEmploymentBase.findMany({
    where: { status: { not: "NIEAKTYWNE" } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
    orderBy: [{ foreignerId: "asc" }, { createdAt: "asc" }],
  });

  // Group by foreignerId + key
  const groups = new Map();
  for (const b of allBases) {
    const key = b.nrDecyzji || b.nrOswiadczenia || b.sygnatura;
    if (!key) continue;
    const groupKey = `${b.foreignerId}:${key}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(b);
  }

  let dedupCount = 0;
  for (const [groupKey, bases] of groups) {
    if (bases.length < 2) continue;

    // Keep the one with most data, merge from others
    const sorted = bases.sort((a, b) => {
      // Score: count non-null fields
      const score = (x) => [x.wynagrodzenie, x.stanowisko, x.rodzajUmowy, x.firma, x.dataOd, x.dataDo, x.urzad].filter(Boolean).length;
      return score(b) - score(a); // more fields = first
    });

    const keep = sorted[0];
    const dupes = sorted.slice(1);
    const profile = `${keep.foreigner.imie ?? ""} ${keep.foreigner.nazwisko}`.trim();

    for (const dupe of dupes) {
      console.log(`  [DEDUP] Profil ${profile} (#${keep.foreignerId}): zachowuję #${keep.id} (${keep.typ}), usuwam #${dupe.id} (${dupe.typ})`);
      console.log(`    Klucz: ${groupKey}`);

      // Merge: copy non-null fields from dupe to keep
      const mergeFields = {};
      for (const field of ["wynagrodzenie", "stanowisko", "rodzajUmowy", "firma", "dataOd", "dataDo", "urzad", "przedmiotDziela"]) {
        if (!keep[field] && dupe[field]) {
          mergeFields[field] = dupe[field];
          console.log(`    Scalono: ${field} = ${dupe[field] instanceof Date ? dupe[field].toISOString().slice(0,10) : dupe[field]}`);
        }
      }

      dedupCount++;

      if (APPLY) {
        if (Object.keys(mergeFields).length > 0) {
          await db.fdkEmploymentBase.update({ where: { id: keep.id }, data: mergeFields });
        }
        await db.fdkEmploymentBase.delete({ where: { id: dupe.id } });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: keep.foreignerId,
            changedBy: "dedup-osw",
            field: "employment_base_dedup",
            oldValue: `Duplikat #${dupe.id} (${dupe.typ}) klucz=${groupKey}`,
            newValue: `Scalono z #${keep.id} i usunięto duplikat`,
          },
        });
      }
    }
  }

  console.log(`\nDeduplikowane: ${dedupCount}\n`);

  // === PKT 3: Check Valovich oświadczenie PZC.4390.43430.AB.2025 ===
  console.log("=== PKT 3: Weryfikacja dat oświadczeń ===\n");

  // Find Valovich's specific oświadczenie
  const valOsw = await db.fdkEmploymentBase.findFirst({
    where: { foreignerId: 155, nrOswiadczenia: { contains: "PZC.4390.43430" } },
    select: { id: true, nrOswiadczenia: true, dataOd: true, dataDo: true, status: true, sourceAttachmentId: true },
  });

  if (valOsw) {
    console.log(`  Valovich OSW PZC.4390.43430: id=#${valOsw.id}`);
    console.log(`    Obecny okres: ${valOsw.dataOd?.toISOString().slice(0,10)||"-"} – ${valOsw.dataDo?.toISOString().slice(0,10)||"-"}`);
    console.log(`    Status: ${valOsw.status}`);
    console.log(`    Source attachment: ${valOsw.sourceAttachmentId || "(brak)"}`);
    console.log(`    Oczekiwany okres wg dokumentu: 01.01.2026 – 31.12.2027`);

    const correctDataDo = new Date("2027-12-31");
    if (valOsw.dataDo?.getTime() !== correctDataDo.getTime()) {
      console.log(`    [FIX] dataDo: ${valOsw.dataDo?.toISOString().slice(0,10)} → 2027-12-31`);
      if (APPLY) {
        await db.fdkEmploymentBase.update({
          where: { id: valOsw.id },
          data: { dataDo: correctDataDo, status: "AKTYWNE" },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: 155,
            changedBy: "fix-osw-date",
            field: "employment_base_date_fix",
            oldValue: `#${valOsw.id} dataDo=${valOsw.dataDo?.toISOString().slice(0,10)} status=${valOsw.status}`,
            newValue: `dataDo=2027-12-31, status=AKTYWNE (poprawka z treści wpisu PUP)`,
          },
        });
      }
    } else {
      console.log(`    [OK] dataDo już poprawna`);
    }
  } else {
    console.log(`  Valovich OSW PZC.4390.43430 — nie znaleziono`);
  }

  if (!APPLY && dedupCount > 0) console.log("\nUruchom z --apply żeby zastosować.");
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect(); process.exit(1); });
