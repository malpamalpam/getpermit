/**
 * Final fixes 29.09:
 * 1. Kurei (704): set ochronaCzasowaUkr, newest UA AKTYWNE
 * 2. Stoliar (230): newest UA AKTYWNE
 * 3. Sithole (826): dataOd=2002 → NULL (birth date, threshold too low)
 * 4. Iskra (616): check what happened with PSZ-ZOPP
 * 5. All UA bases with BRAK_DANYCH → newest=AKTYWNE, rest=NIEAKTYWNE
 * 6. dataOd 2000-2005 audit
 *
 * Usage:
 *   node scripts/fix-final-29-09.mjs              # dry-run
 *   node scripts/fix-final-29-09.mjs --run         # execute
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-final-29-09";
const DO_RUN = process.argv.includes("--run");

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  FINAL FIXES 29.09`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // 1. Kurei — force ochronaCzasowaUkr + fix UA
  console.log("--- 1. Kurei (704) ---");
  const kurei = await db.fdkForeigner.findUnique({ where: { id: 704 }, include: { employmentBases: { where: { typ: { in: ["ZGLOSZENIE_UA", "POWIADOMIENIE_UA"] } }, orderBy: { id: "desc" } } } });
  if (kurei) {
    console.log(`  obywatelstwo: "${kurei.obywatelstwo}", ukr: ${kurei.ochronaCzasowaUkr}`);
    if (!kurei.ochronaCzasowaUkr) {
      console.log(`  [FIX] ochronaCzasowaUkr → true`);
      if (DO_RUN) await db.fdkForeigner.update({ where: { id: 704 }, data: { ochronaCzasowaUkr: true } });
    }
    // Newest UA → AKTYWNE
    if (kurei.employmentBases.length > 0) {
      const newest = kurei.employmentBases[0];
      if (newest.status !== "AKTYWNE") {
        console.log(`  [FIX] UA #${newest.id} → AKTYWNE`);
        if (DO_RUN) await db.fdkEmploymentBase.update({ where: { id: newest.id }, data: { status: "AKTYWNE" } });
      }
      for (const b of kurei.employmentBases.slice(1)) {
        if (b.status !== "NIEAKTYWNE") {
          if (DO_RUN) await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { status: "NIEAKTYWNE" } });
        }
      }
    }
  }

  // 2. Global: all UA with BRAK_DANYCH → newest AKTYWNE, rest NIEAKTYWNE
  console.log("\n--- 2. Global UA status fix ---");
  const allUaForeigners = await db.fdkForeigner.findMany({
    where: { employmentBases: { some: { typ: { in: ["ZGLOSZENIE_UA", "POWIADOMIENIE_UA"] }, status: "BRAK_DANYCH" } } },
    include: { employmentBases: { where: { typ: { in: ["ZGLOSZENIE_UA", "POWIADOMIENIE_UA"] } }, orderBy: { id: "desc" } } },
  });
  let uaFixCount = 0;
  for (const f of allUaForeigners) {
    if (f.employmentBases.length === 0) continue;
    const newest = f.employmentBases[0];
    if (newest.status === "BRAK_DANYCH") {
      const name = `${f.imie ?? ""} ${f.nazwisko}`.trim();
      console.log(`  [FIX] ${name} (id=${f.id}): UA #${newest.id} BRAK_DANYCH → AKTYWNE`);
      if (DO_RUN) await db.fdkEmploymentBase.update({ where: { id: newest.id }, data: { status: "AKTYWNE" } });
      uaFixCount++;
    }
    for (const b of f.employmentBases.slice(1)) {
      if (b.status === "BRAK_DANYCH" || b.status === "AKTYWNE") {
        if (DO_RUN) await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { status: "NIEAKTYWNE" } });
      }
    }
  }
  console.log(`  UA AKTYWNE naprawione: ${uaFixCount}`);

  // 3. Sithole (826) — dataOd=2002 → NULL
  console.log("\n--- 3. dataOd 2000-2005 audit ---");
  const suspectBases = await db.fdkEmploymentBase.findMany({
    where: { dataOd: { gte: new Date("2000-01-01"), lt: new Date("2005-01-01") } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true, dataUrodzenia: true } } },
  });
  console.log(`  Podstawy z dataOd 2000-2005: ${suspectBases.length}`);
  let suspect2002Count = 0;
  for (const b of suspectBases) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    const od = b.dataOd?.toISOString().slice(0, 10);
    const doo = b.dataDo?.toISOString().slice(0, 10) ?? "-";
    // If dataOd is close to foreigner's birth date, it's likely a birth date
    const isBirth = b.foreigner.dataUrodzenia && Math.abs((b.dataOd?.getTime() ?? 0) - b.foreigner.dataUrodzenia.getTime()) < 86400000 * 365;
    // Or if gap between dataOd and dataDo is > 15 years, suspicious
    const gap = b.dataDo && b.dataOd ? (b.dataDo.getTime() - b.dataOd.getTime()) / 86400000 / 365 : 0;
    const isSuspicious = gap > 15 || isBirth;
    if (isSuspicious) {
      console.log(`  #${b.id} [${name}] dataOd=${od} dataDo=${doo} gap=${gap.toFixed(1)}y ${isBirth ? "BIRTH" : "GAP>15"} → NULL`);
      if (DO_RUN) {
        if (!b.foreigner.dataUrodzenia && b.dataOd) {
          await db.fdkForeigner.update({ where: { id: b.foreigner.id }, data: { dataUrodzenia: b.dataOd } });
        }
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { dataOd: null } });
      }
      suspect2002Count++;
    } else {
      console.log(`  #${b.id} [${name}] dataOd=${od} dataDo=${doo} gap=${gap.toFixed(1)}y — OK (prawidłowa data)`);
    }
  }

  // 4. Iskra (616) — diagnose
  console.log("\n--- 4. Iskra (616) ---");
  const iskra = await db.fdkForeigner.findUnique({
    where: { id: 616 },
    include: { employmentBases: true, changeLogs: { where: { field: "scrape" }, orderBy: { changedAt: "desc" }, take: 20 } },
  });
  if (iskra) {
    console.log(`  Bases: ${iskra.employmentBases.length}`);
    console.log(`  Scrape logs:`);
    for (const log of iskra.changeLogs) {
      console.log(`    ${log.newValue?.substring(0, 100)}`);
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  UA fixed: ${uaFixCount}, dataOd 2000-2005 fixed: ${suspect2002Count}`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
