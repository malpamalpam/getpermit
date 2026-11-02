/**
 * Diagnoza i naprawa Crooks (183) i Afrasiyabov (211):
 * - Pokaż załączniki decyzyjne
 * - Rescrape kluczowe dokumenty OCR
 * - Popraw dane w bazie
 *
 * node scripts/fix-crooks-afrasiyabov.mjs          # diagnoza
 * node scripts/fix-crooks-afrasiyabov.mjs --fix     # napraw dane
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DO_FIX = process.argv.includes("--fix");

async function main() {
  // === CROOKS (id=183) ===
  console.log("=== CROOKS (id=183) ===");
  const crooks = await db.fdkForeigner.findUnique({
    where: { id: 183 },
    include: {
      employmentBases: { orderBy: { dataOd: "desc" } },
      attachments: { where: { kategoria: { in: ["glowne", "trc"] } }, orderBy: { id: "asc" } },
    },
  });

  console.log(`${crooks.imie} ${crooks.nazwisko}\n`);

  console.log("Podstawy:");
  for (const b of crooks.employmentBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} stawka=${b.stawka != null ? Number(b.stawka) : "-"} rodzajUmowy="${b.rodzajUmowy ?? ""}" stanowisko="${b.stanowisko ?? ""}" dataOd=${b.dataOd?.toISOString().slice(0, 10) ?? "?"} dataDo=${b.dataDo?.toISOString().slice(0, 10) ?? "?"}`);
  }

  console.log("\nZałączniki decyzyjne:");
  for (const a of crooks.attachments) {
    const isDecision = /decyzj|trc|kart.*pobytu|zezwoleni/i.test(a.nazwaPliku);
    if (isDecision) {
      console.log(`  att=${a.id} ${a.nazwaPliku} (${a.typPliku}) opis="${a.opis ?? ""}"`);
    }
  }

  // Fix Crooks #1241: stawka=4 → should be higher, rodzajUmowy="pobyt czasowy i praca" → clear
  // #798: zduplikowane stanowisko
  if (DO_FIX) {
    console.log("\nNaprawiam Crooks:");

    // #1241 — rodzajUmowy is wrong ("pobyt czasowy i praca" is the decision type, not contract type)
    // stawka=4 is clearly wrong (probably "4" from "4300" or extraction error)
    // Clear both — let manual entry or rescrape fix them
    const b1241 = await db.fdkEmploymentBase.findUnique({ where: { id: 1241 } });
    if (b1241) {
      console.log(`  #1241: stawka ${Number(b1241.stawka)} → null, rodzajUmowy "${b1241.rodzajUmowy}" → null`);
      await db.fdkEmploymentBase.update({
        where: { id: 1241 },
        data: { stawka: null, rodzajUmowy: null },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: 183,
          changedBy: "fix-crooks-afrasiyabov",
          field: "employment_base_fix",
          oldValue: `stawka=${Number(b1241.stawka)}, rodzajUmowy="${b1241.rodzajUmowy}"`,
          newValue: `Wyczyszczono błędne dane: stawka i rodzajUmowy z parsingu — "pobyt czasowy i praca" to typ decyzji, nie umowy`,
        },
      });
    }

    // #798 — fix duplicated stanowisko
    const b798 = await db.fdkEmploymentBase.findUnique({ where: { id: 798 } });
    if (b798 && b798.stanowisko) {
      // Remove "/ w charakterze " prefix and deduplication
      let fixed = b798.stanowisko
        .replace(/^\/\s*w\s+charakterze\s+/i, "")
        .replace(/(.+?)\1+$/, "$1") // remove exact duplication
        .trim();
      if (fixed !== b798.stanowisko) {
        console.log(`  #798: stanowisko "${b798.stanowisko.substring(0, 60)}..." → "${fixed}"`);
        await db.fdkEmploymentBase.update({
          where: { id: 798 },
          data: { stanowisko: fixed },
        });
      }
    }
  }

  // === AFRASIYABOV (id=211) ===
  console.log("\n=== AFRASIYABOV (id=211) ===");
  const afr = await db.fdkForeigner.findUnique({
    where: { id: 211 },
    include: {
      employmentBases: { orderBy: { dataOd: "desc" } },
      attachments: { where: { kategoria: { in: ["glowne", "trc"] } }, orderBy: { id: "asc" } },
    },
  });

  console.log(`${afr.imie} ${afr.nazwisko}\n`);

  console.log("Podstawy:");
  for (const b of afr.employmentBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} stawka=${b.stawka != null ? Number(b.stawka) : "-"} rodzajUmowy="${b.rodzajUmowy ?? ""}" stanowisko="${b.stanowisko ?? ""}" dataOd=${b.dataOd?.toISOString().slice(0, 10) ?? "?"} dataDo=${b.dataDo?.toISOString().slice(0, 10) ?? "?"} nrDecyzji="${b.nrDecyzji ?? ""}"`);
  }

  console.log("\nZałączniki decyzyjne:");
  for (const a of afr.attachments) {
    const isDecision = /decyzj|trc|kart.*pobytu|zezwoleni|blue/i.test(a.nazwaPliku);
    if (isDecision) {
      console.log(`  att=${a.id} ${a.nazwaPliku} (${a.typPliku}) opis="${a.opis ?? ""}"`);
    }
  }

  if (DO_FIX) {
    console.log("\nNaprawiam Afrasiyabov:");

    // He should have umowa o dzieło, not umowa zlecenie on #424
    const b424 = await db.fdkEmploymentBase.findUnique({ where: { id: 424 } });
    if (b424 && b424.rodzajUmowy === "umowa zlecenie") {
      console.log(`  #424: rodzajUmowy "umowa zlecenie" → "umowa o dzieło"`);
      await db.fdkEmploymentBase.update({
        where: { id: 424 },
        data: { rodzajUmowy: "umowa o dzieło" },
      });
    }

    // #360 BLUE_CARD — should probably be KARTA_POBYTU or deactivated
    // #423 KARTA_POBYTU BRAK_DANYCH — junk, no data
    // Keep #422 and #424 as the real ones, deactivate others
    const deactivateIds = [360, 423];
    for (const id of deactivateIds) {
      const b = await db.fdkEmploymentBase.findUnique({ where: { id } });
      if (b && (b.status === "AKTYWNE" || b.status === "BRAK_DANYCH")) {
        console.log(`  #${id} ${b.typ} ${b.status} → NIEAKTYWNE`);
        await db.fdkEmploymentBase.update({
          where: { id },
          data: { status: "NIEAKTYWNE" },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: 211,
            changedBy: "fix-crooks-afrasiyabov",
            field: "employment_base_fix",
            oldValue: b.status,
            newValue: `#${id} (${b.typ}) → NIEAKTYWNE — pusta/zduplikowana podstawa`,
          },
        });
      }
    }

    // #425 is duplicate of #422 (same data) — deactivate
    const b425 = await db.fdkEmploymentBase.findUnique({ where: { id: 425 } });
    const b422 = await db.fdkEmploymentBase.findUnique({ where: { id: 422 } });
    if (b425 && b422 && b425.stanowisko?.toLowerCase() === b422.stanowisko?.toLowerCase()) {
      console.log(`  #425 duplikat #422 → NIEAKTYWNE`);
      await db.fdkEmploymentBase.update({
        where: { id: 425 },
        data: { status: "NIEAKTYWNE" },
      });
    }
  }

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
