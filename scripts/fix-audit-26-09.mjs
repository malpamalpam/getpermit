/**
 * Audit fix 26.09:
 * 1. dataOd < 2000 → NULL (birth dates)
 * 2. Resztki tekstowe (stanowisko, firma)
 * 3. Frolovsky dataOd 2028 → swap with dataDo
 *
 * Usage:
 *   node scripts/fix-audit-26-09.mjs              # dry-run
 *   node scripts/fix-audit-26-09.mjs --run         # execute
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-audit-26-09";
const DO_RUN = process.argv.includes("--run");

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  AUDIT FIX 26.09`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // ===================================================================
  // 1. dataOd < 2000
  // ===================================================================
  console.log("--- 1. dataOd < 2000 (data urodzenia) ---");

  const birthBases = await db.fdkEmploymentBase.findMany({
    where: { dataOd: { lt: new Date("2000-01-01") } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true, dataUrodzenia: true } } },
  });

  console.log(`  Znaleziono: ${birthBases.length}`);
  for (const b of birthBases) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    const od = b.dataOd?.toISOString().slice(0, 10);
    console.log(`  #${b.id} [${name}] typ=${b.typ} dataOd=${od} → NULL`);
    if (DO_RUN) {
      if (!b.foreigner.dataUrodzenia && b.dataOd) {
        await db.fdkForeigner.update({ where: { id: b.foreigner.id }, data: { dataUrodzenia: b.dataOd } });
      }
      await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { dataOd: null } });
      await db.fdkChangeLog.create({
        data: { foreignerId: b.foreigner.id, changedBy: CHANGED_BY, field: "employment_base_fix",
          oldValue: `#${b.id} dataOd=${od}`, newValue: `dataOd → NULL (data urodzenia)` },
      });
    }
  }

  // ===================================================================
  // 2. Resztki tekstowe
  // ===================================================================
  console.log("\n--- 2. Resztki tekstowe (stanowisko/firma) ---");

  // Stanowisko starting with "/"
  const slashStan = await db.fdkEmploymentBase.findMany({
    where: { stanowisko: { startsWith: "/" } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });
  for (const b of slashStan) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    let cleaned = (b.stanowisko ?? "").replace(/^[\/\s]*/, "").replace(/^w\s+charakterze\s*/i, "").trim();
    // Deduplicate
    const half = Math.floor(cleaned.length / 2);
    if (half > 3 && cleaned.substring(0, half) === cleaned.substring(half)) {
      cleaned = cleaned.substring(0, half);
    }
    console.log(`  #${b.id} [${name}] stanowisko: "${b.stanowisko?.substring(0, 60)}" → "${cleaned.substring(0, 60)}"`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { stanowisko: cleaned || null } });
    }
  }

  // Stanowisko with form labels (Imię, Nazwisko, rodzaj pracy, etc.)
  const junkStanBases = await db.fdkEmploymentBase.findMany({
    where: { stanowisko: { not: null } },
    select: { id: true, stanowisko: true, foreignerId: true },
  });
  let junkStanCount = 0;
  const JUNK_STAN = [/Imi[eę]\s*:/i, /Nazwisko\s*:/i, /rodzaj\s+pracy\s*:/i, /podpis\s+osoby/i, /Wnioskowana\s+liczba/i];
  for (const b of junkStanBases) {
    if (JUNK_STAN.some(p => p.test(b.stanowisko ?? ""))) {
      console.log(`  #${b.id} stanowisko JUNK: "${(b.stanowisko ?? "").substring(0, 80)}"`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { stanowisko: null } });
      }
      junkStanCount++;
    }
  }
  if (junkStanCount > 0) console.log(`  Junk stanowisko wyczyszczone: ${junkStanCount}`);

  // Firma containing sentencja fragments (> 200 chars)
  const longFirma = await db.fdkEmploymentBase.findMany({
    where: { firma: { not: null } },
    select: { id: true, firma: true, foreignerId: true },
  });
  let firmaFixCount = 0;
  for (const b of longFirma) {
    if ((b.firma ?? "").length > 200) {
      console.log(`  #${b.id} firma too long (${(b.firma ?? "").length} chars): "${(b.firma ?? "").substring(0, 80)}..."`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { firma: null } });
      }
      firmaFixCount++;
    }
  }
  if (firmaFixCount > 0) console.log(`  Firma sentencja wyczyszczone: ${firmaFixCount}`);

  // ===================================================================
  // 3. Frolovsky (180) — dataOd 2028 → swap
  // ===================================================================
  console.log("\n--- 3. Frolovsky (180) — dataOd 2028 ---");

  const frolovskyBases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 180, dataOd: { gte: new Date("2028-01-01") } },
  });
  for (const b of frolovskyBases) {
    const od = b.dataOd?.toISOString().slice(0, 10);
    const doo = b.dataDo?.toISOString().slice(0, 10);
    if (b.dataDo && b.dataOd && b.dataOd > b.dataDo) {
      console.log(`  #${b.id} dataOd=${od} dataDo=${doo} → SWAP`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { dataOd: b.dataDo, dataDo: b.dataOd } });
        await db.fdkChangeLog.create({
          data: { foreignerId: 180, changedBy: CHANGED_BY, field: "employment_base_fix",
            oldValue: `#${b.id} dataOd=${od} dataDo=${doo}`, newValue: `Zamienione daty (od↔do)` },
        });
      }
    } else {
      console.log(`  #${b.id} dataOd=${od} dataDo=${doo} → dataOd > dataDo? ${b.dataOd && b.dataDo ? b.dataOd > b.dataDo : "brak dat"}`);
    }
  }

  // ===================================================================
  // Verification
  // ===================================================================
  console.log("\n--- WERYFIKACJA ---");
  const remaining = await db.fdkEmploymentBase.count({ where: { dataOd: { lt: new Date("2000-01-01") } } });
  const slashRemaining = await db.fdkEmploymentBase.count({ where: { stanowisko: { startsWith: "/" } } });
  console.log(`  dataOd < 2000: ${DO_RUN ? remaining : birthBases.length + " (do naprawy)"}`);
  console.log(`  stanowisko z "/": ${DO_RUN ? slashRemaining : slashStan.length + " (do naprawy)"}`);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`  dataOd < 2000: ${birthBases.length}`);
  console.log(`  Stanowisko "/": ${slashStan.length}`);
  console.log(`  Stanowisko junk: ${junkStanCount}`);
  console.log(`  Firma sentencja: ${firmaFixCount}`);
  console.log(`  Frolovsky swap: ${frolovskyBases.length}`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
