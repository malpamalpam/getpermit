/**
 * Skrypt: migracja starych typów FdkBaseType na nowe.
 *
 * Mapowanie:
 *   ZEZWOLENIE → ZEZWOLENIE_A
 *   ZGLOSZENIE_UA → POWIADOMIENIE_UA
 *   KARTA_POBYTU → TRC_FDK
 *   BLUE_CARD → TRC_BLUE_CARD
 *   DOSTEP_UE → OD_UE
 *   DOSTEP_STUDENT → OD_STUDENT
 *   DOSTEP_POBYT_STALY → OD_POBYT_STALY
 *   DOSTEP_REZYDENT_UE → OD_REZYDENT_UE
 *   DOSTEP_KARTA_POLAKA → OD_KARTA_POLAKA
 *   DOSTEP_OCHRONA_MIEDZ → OD_OCHRONA_UZUP
 *   DOSTEP_DYPLOM_PL → OD_ABSOLWENT
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-base-types.mjs
 *   node --env-file=.env.local scripts/migrate-base-types.mjs --run --report raport-migrate-types.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const MAPPING = {
  ZEZWOLENIE: "ZEZWOLENIE_A",
  ZGLOSZENIE_UA: "POWIADOMIENIE_UA",
  KARTA_POBYTU: "TRC_FDK",
  BLUE_CARD: "TRC_BLUE_CARD",
  DOSTEP_UE: "OD_UE",
  DOSTEP_STUDENT: "OD_STUDENT",
  DOSTEP_POBYT_STALY: "OD_POBYT_STALY",
  DOSTEP_REZYDENT_UE: "OD_REZYDENT_UE",
  DOSTEP_KARTA_POLAKA: "OD_KARTA_POLAKA",
  DOSTEP_OCHRONA_MIEDZ: "OD_OCHRONA_UZUP",
  DOSTEP_DYPLOM_PL: "OD_ABSOLWENT",
};

const csvRows = [["baseId", "foreignerId", "nazwisko", "oldType", "newType", "action"]];

async function main() {
  console.log(`=== Migracja typów FdkBaseType (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  let total = 0;

  for (const [oldType, newType] of Object.entries(MAPPING)) {
    const bases = await db.fdkEmploymentBase.findMany({
      where: { typ: oldType },
      include: { foreigner: true },
    });

    if (bases.length === 0) continue;

    console.log(`\n${oldType} → ${newType}: ${bases.length} podstaw`);

    for (const base of bases) {
      const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
      if (DO_RUN) {
        await db.$executeRawUnsafe(
          `UPDATE fdk_employment_bases SET typ = $1::\"FdkBaseType\" WHERE id = $2`,
          newType, base.id
        );
      }
      csvRows.push([String(base.id), String(base.foreignerId), base.foreigner.nazwisko, oldType, newType, DO_RUN ? "migrated" : "would_migrate"]);
    }

    total += bases.length;
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`${DO_RUN ? "Zmigrowanych" : "Do migracji"}: ${total}`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
