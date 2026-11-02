/**
 * Final 2 fixes:
 * 1. Delete DOSTEP_DYPLOM_PL for Burak (174) and Morozov (28) if they exist
 * 2. Fix Abramova stanowisko from KZIS classification to actual work description
 * 3. Scan all ZGLOSZENIE_UA for KZIS-style stanowisko
 *
 * node scripts/fix-final-two.mjs          # diagnoza
 * node scripts/fix-final-two.mjs --apply  # napraw
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DO_APPLY = process.argv.includes("--apply");

// KZiS classification patterns — these are job GROUP names, not actual job descriptions
const KZIS_PATTERNS = [
  /^Pozostali\s/i,
  /^Inni\s/i,
  /gdzie indziej niesklasyfikowani/i,
  /^\d{4,6}\s/,  // starts with KZiS code number
  /^Specjaliści\s.*niesklasyfikowani/i,
  /^Pracownicy\s.*niesklasyfikowani/i,
  /^Technicy\s.*niesklasyfikowani/i,
];

function isKzisClassification(stanowisko) {
  if (!stanowisko) return false;
  return KZIS_PATTERNS.some(p => p.test(stanowisko));
}

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DIAGNOZA"}\n`);

  // === 1. Delete DOSTEP_DYPLOM_PL for Burak and Morozov ===
  console.log("=== 1. DOSTEP_DYPLOM_PL — Burak (174) i Morozov (28) ===");
  for (const fid of [174, 28]) {
    const bases = await db.fdkEmploymentBase.findMany({
      where: { foreignerId: fid, typ: "DOSTEP_DYPLOM_PL" },
    });
    const f = await db.fdkForeigner.findUnique({ where: { id: fid }, select: { imie: true, nazwisko: true } });
    if (bases.length > 0) {
      for (const b of bases) {
        console.log(`  USUWAM #${b.id} ${f.imie} ${f.nazwisko} (${fid}) firma="${b.firma}"`);
        if (DO_APPLY) {
          await db.fdkEmploymentBase.delete({ where: { id: b.id } });
          await db.fdkChangeLog.create({
            data: {
              foreignerId: fid,
              changedBy: "fix-final-two",
              field: "employment_base_fix",
              oldValue: `DOSTEP_DYPLOM_PL #${b.id}`,
              newValue: "Usunięto — dyplom zagranicznej uczelni, nie polskiej",
            },
          });
        }
      }
    } else {
      console.log(`  ${f.imie} ${f.nazwisko} (${fid}): brak — już usunięte`);
    }
  }

  // Report all remaining DOSTEP_DYPLOM_PL
  console.log("\n=== Raport: wszystkie DOSTEP_DYPLOM_PL ===");
  const allDyplom = await db.fdkEmploymentBase.findMany({
    where: { typ: "DOSTEP_DYPLOM_PL" },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true, obywatelstwo: true } } },
  });
  console.log(`Łącznie: ${allDyplom.length}`);
  for (const b of allDyplom) {
    console.log(`  #${b.id} id=${b.foreigner.id} ${b.foreigner.imie} ${b.foreigner.nazwisko} [${b.foreigner.obywatelstwo}] uczelnia="${b.firma}" status=${b.status}`);
  }

  // === 2. Fix Abramova + scan all ZGLOSZENIE_UA for KZiS stanowisko ===
  console.log("\n=== 2. Stanowisko KZiS → opis pracy ===");

  const allUA = await db.fdkEmploymentBase.findMany({
    where: { typ: "ZGLOSZENIE_UA" },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });

  const kzisProblems = allUA.filter(b => isKzisClassification(b.stanowisko));
  console.log(`Podstaw ZGLOSZENIE_UA z klasyfikacją KZiS zamiast opisu pracy: ${kzisProblems.length}`);

  for (const b of kzisProblems) {
    // Check if this person has other UA bases with proper stanowisko (description, not classification)
    const otherUA = allUA.filter(
      o => o.foreignerId === b.foreignerId && o.id !== b.id && o.stanowisko && !isKzisClassification(o.stanowisko)
    );
    // Use the newest proper stanowisko as replacement, or null
    const replacement = otherUA.length > 0
      ? otherUA.sort((a, c) => (c.dataOd?.getTime() ?? 0) - (a.dataOd?.getTime() ?? 0))[0].stanowisko
      : null;

    console.log(`  #${b.id} id=${b.foreigner.id} ${b.foreigner.imie} ${b.foreigner.nazwisko}: "${b.stanowisko}"`);
    if (replacement) {
      console.log(`    → zamieniam na: "${replacement.substring(0, 80)}"`);
    } else {
      console.log(`    → brak alternatywy, ustawiam null`);
    }

    if (DO_APPLY) {
      await db.fdkEmploymentBase.update({
        where: { id: b.id },
        data: { stanowisko: replacement },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: b.foreignerId,
          changedBy: "fix-final-two",
          field: "employment_base_fix",
          oldValue: b.stanowisko,
          newValue: `Stanowisko zmienione z klasyfikacji KZiS na opis pracy: ${replacement ?? "(null)"}`,
        },
      });
    }
  }

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
