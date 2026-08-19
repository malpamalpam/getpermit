/**
 * Add DOSTEP_UE employment base to all EU/EEA/Swiss citizens who don't have one yet.
 *
 * Usage:
 *   node scripts/add-dostep-ue.mjs               # dry-run
 *   node scripts/add-dostep-ue.mjs --run          # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "add-dostep-ue";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

// EU/EEA/Swiss country names (PL and EN variants that may appear in obywatelstwo field)
const EU_COUNTRIES = new Set([
  // PL names
  "austria", "belgia", "bułgaria", "bulgaria", "chorwacja", "cypr", "czechy",
  "dania", "estonia", "finlandia", "francja", "grecja", "hiszpania",
  "holandia", "niderlandy", "irlandia", "litwa", "łotwa", "lotwa", "luksemburg",
  "malta", "niemcy", "polska", "portugalia", "rumunia", "słowacja", "slowacja",
  "słowenia", "slowenia", "szwecja", "węgry", "wegry", "włochy", "wlochy",
  // EEA (non-EU)
  "islandia", "liechtenstein", "norwegia",
  // Swiss
  "szwajcaria",
  // EN names
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic", "czechia",
  "denmark", "estonia", "finland", "france", "germany", "greece", "hungary",
  "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta",
  "netherlands", "holland", "poland", "portugal", "romania", "slovakia",
  "slovenia", "spain", "sweden",
  "iceland", "liechtenstein", "norway", "switzerland",
]);

function isEuCitizen(obywatelstwo) {
  if (!obywatelstwo) return false;
  return EU_COUNTRIES.has(obywatelstwo.toLowerCase().trim());
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  DODAJ DOSTEP_UE DLA OBYWATELI UE/EOG/SZWAJCARII`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  const foreigners = await db.fdkForeigner.findMany({
    where: { obywatelstwo: { not: null } },
    include: {
      employmentBases: { select: { typ: true } },
    },
  });

  console.log(`Cudzoziemców z obywatelstwem: ${foreigners.length}\n`);

  const toAdd = [];
  const alreadyHas = [];
  const notEu = [];

  for (const f of foreigners) {
    if (!isEuCitizen(f.obywatelstwo)) {
      notEu.push(f);
      continue;
    }

    const hasDostep = f.employmentBases.some((b) => b.typ === "DOSTEP_UE");
    if (hasDostep) {
      alreadyHas.push(f);
      continue;
    }

    toAdd.push(f);
  }

  console.log(`  Obywateli UE/EOG:       ${toAdd.length + alreadyHas.length}`);
  console.log(`  Już ma DOSTEP_UE:       ${alreadyHas.length}`);
  console.log(`  Do dodania:             ${toAdd.length}`);
  console.log(`  Spoza UE:               ${notEu.length}\n`);

  if (toAdd.length > 0) {
    console.log("DO DODANIA:");
    for (const f of toAdd) {
      console.log(`  id=${f.id} ${f.imie ?? ""} ${f.nazwisko} — ${f.obywatelstwo}`);
    }
  }

  if (!DO_RUN) {
    console.log(`\nUruchom z --run aby dodać.\n`);
    await db.$disconnect();
    return;
  }

  // Apply
  console.log(`\nDodaję DOSTEP_UE...\n`);
  let added = 0;
  for (const f of toAdd) {
    try {
      await db.fdkEmploymentBase.create({
        data: {
          foreignerId: f.id,
          typ: "DOSTEP_UE",
          status: "AKTYWNE",
        },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: f.id,
          changedBy: CHANGED_BY,
          field: "employment_base_create",
          oldValue: null,
          newValue: `Dodano DOSTEP_UE — obywatel ${f.obywatelstwo} (UE/EOG). Otwarty dostęp do rynku pracy bez zezwolenia.`,
        },
      });
      added++;
      console.log(`  [OK] id=${f.id} ${f.imie ?? ""} ${f.nazwisko} (${f.obywatelstwo})`);
    } catch (err) {
      console.error(`  [ERR] id=${f.id}: ${err.message}`);
    }
  }

  console.log(`\nDodano DOSTEP_UE: ${added} / ${toAdd.length}\n`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
