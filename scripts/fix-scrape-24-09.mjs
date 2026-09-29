/**
 * Fix scrape issues 24.09:
 * 1. dataOd < 2000 (birth dates used as document dates)
 * 2. Iskra PSZ-ZOPP — already fixed in parser, rescrape needed
 * 3. Kurei — newest UA AKTYWNE + pobytowa UKR for all UA foreigners
 * 4. Wizy — rescrape visa files (removed from skip list)
 *
 * Usage:
 *   node scripts/fix-scrape-24-09.mjs              # dry-run
 *   node scripts/fix-scrape-24-09.mjs --run         # execute
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "fix-scrape-24-09";
const DO_RUN = process.argv.includes("--run");

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  FIX SCRAPE 24.09`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // ===================================================================
  // 1. dataOd < 2000 — birth dates
  // ===================================================================
  console.log("--- 1. Podstawy z dataOd < 2000 (data urodzenia) ---");

  const birthDateBases = await db.fdkEmploymentBase.findMany({
    where: { dataOd: { lt: new Date("2000-01-01") } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true, dataUrodzenia: true } } },
  });

  console.log(`  Znaleziono: ${birthDateBases.length}`);
  let birthFixCount = 0;
  for (const base of birthDateBases) {
    const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
    const dataOd = base.dataOd?.toISOString().slice(0, 10);
    console.log(`  #${base.id} [${name}] typ=${base.typ} dataOd=${dataOd} dataDo=${base.dataDo?.toISOString().slice(0, 10) ?? "-"}`);

    // Set dataOd to null (scraper should have used header date, not birth date)
    if (DO_RUN) {
      // If foreigner doesn't have dataUrodzenia, set it from dataOd
      if (!base.foreigner.dataUrodzenia && base.dataOd) {
        await db.fdkForeigner.update({
          where: { id: base.foreigner.id },
          data: { dataUrodzenia: base.dataOd },
        });
      }
      await db.fdkEmploymentBase.update({
        where: { id: base.id },
        data: { dataOd: null },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: base.foreigner.id, changedBy: CHANGED_BY,
          field: "employment_base_fix",
          oldValue: `#${base.id} dataOd=${dataOd}`,
          newValue: `dataOd ustawione na null — ${dataOd} to data urodzenia`,
        },
      });
    }
    birthFixCount++;
  }
  console.log(`  Poprawionych: ${birthFixCount}\n`);

  // ===================================================================
  // 3. Kurei + globalnie: najnowsze UA = AKTYWNE, pobytowa UKR
  // ===================================================================
  console.log("--- 3. Najnowsze powiadomienie UA → AKTYWNE + pobytowa UKR ---");

  // Find all foreigners with ZGLOSZENIE_UA/POWIADOMIENIE_UA bases
  const uaForeigners = await db.fdkForeigner.findMany({
    where: {
      employmentBases: {
        some: { typ: { in: ["ZGLOSZENIE_UA", "POWIADOMIENIE_UA"] } },
      },
    },
    include: {
      employmentBases: {
        where: { typ: { in: ["ZGLOSZENIE_UA", "POWIADOMIENIE_UA"] } },
        orderBy: { dataOd: "desc" },
      },
    },
  });

  console.log(`  Cudzoziemców z powiadomieniami UA: ${uaForeigners.length}`);
  let uaFixCount = 0;
  let ukrFixCount = 0;

  for (const f of uaForeigners) {
    const name = `${f.imie ?? ""} ${f.nazwisko}`.trim();
    const bases = f.employmentBases;
    if (bases.length === 0) continue;

    // Newest UA should be AKTYWNE (or at least not BRAK_DANYCH)
    const newest = bases[0]; // sorted desc by dataOd
    if (newest.status === "BRAK_DANYCH") {
      console.log(`  [FIX] ${name} (id=${f.id}): UA #${newest.id} status BRAK_DANYCH → AKTYWNE`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({
          where: { id: newest.id },
          data: { status: "AKTYWNE" },
        });
      }
      uaFixCount++;
    }

    // Older ones should be NIEAKTYWNE
    for (let i = 1; i < bases.length; i++) {
      if (bases[i].status === "AKTYWNE" || bases[i].status === "BRAK_DANYCH") {
        if (DO_RUN) {
          await db.fdkEmploymentBase.update({
            where: { id: bases[i].id },
            data: { status: "NIEAKTYWNE" },
          });
        }
      }
    }

    // Pobytowa UKR — set ochronaCzasowaUkr if not already set
    if (!f.ochronaCzasowaUkr) {
      // Check if foreigner is Ukrainian (obywatelstwo)
      const isUkr = f.obywatelstwo && /ukrai|україн/i.test(f.obywatelstwo);
      if (isUkr) {
        console.log(`  [FIX] ${name} (id=${f.id}): ustawiam ochronaCzasowaUkr = true`);
        if (DO_RUN) {
          await db.fdkForeigner.update({
            where: { id: f.id },
            data: { ochronaCzasowaUkr: true },
          });
          await db.fdkChangeLog.create({
            data: {
              foreignerId: f.id, changedBy: CHANGED_BY,
              field: "ochronaCzasowaUkr",
              oldValue: "false",
              newValue: "true — obywatel UA z powiadomieniami, automatyczne ustawienie",
            },
          });
        }
        ukrFixCount++;
      }
    }
  }
  console.log(`  UA status poprawiony: ${uaFixCount}`);
  console.log(`  Pobytowa UKR dodana: ${ukrFixCount}\n`);

  // ===================================================================
  // SUMMARY
  // ===================================================================
  console.log(`${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`  dataOd < 2000 naprawione: ${birthFixCount}`);
  console.log(`  UA AKTYWNE naprawione: ${uaFixCount}`);
  console.log(`  Pobytowa UKR dodana: ${ukrFixCount}`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
