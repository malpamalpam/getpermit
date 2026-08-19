/**
 * Cleanup junk label values in text fields of employment bases WITH dates.
 * These are form-label remnants left by OCR (e.g. "/ rodzaj pracy:", "Wnioskowana liczba kandydatów").
 * The bases themselves are valid (have dates/numbers), but text fields contain garbage.
 *
 * Usage:
 *   node scripts/cleanup-labels.mjs               # dry-run
 *   node scripts/cleanup-labels.mjs --run          # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "cleanup-labels";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

function isJunkFieldValue(value) {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  if (v.length === 0) return true;
  if (v.endsWith(":")) return true;
  if (/Imi[eę]\s*:|Nazwisko\s*:|rodzaj\s+pracy\s*:|podpis\s+osoby|Wnioskowana\s+liczba|i\s+podpis\s+osoby/i.test(v)) return true;
  const slashCount = (v.match(/\//g) ?? []).length;
  if (slashCount >= 2 && v.length > 40) return true;
  if (/^\s*\/\s*rodzaj\s+pracy/i.test(v)) return true;
  // Additional patterns
  if (/^[-–—\/\s]+$/.test(v)) return true; // only dashes/slashes
  if (/wnioskowana\s+liczba/i.test(v)) return true;
  if (/nazwa\s+podmiotu/i.test(v)) return true;
  if (/adres\s+podmiotu/i.test(v)) return true;
  return false;
}

const TEXT_FIELDS = ["stanowisko", "firma", "rodzajUmowy", "wynagrodzenie"];

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  CLEANUP ETYKIET — pola tekstowe z wartościami-etykietami`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  const bases = await db.fdkEmploymentBase.findMany({
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
    orderBy: [{ foreignerId: "asc" }, { id: "asc" }],
  });

  console.log(`Podstaw w bazie: ${bases.length}\n`);

  let cleaned = 0;

  for (const base of bases) {
    const fieldsToClean = {};

    for (const field of TEXT_FIELDS) {
      const value = base[field];
      if (isJunkFieldValue(value)) {
        fieldsToClean[field] = value;
      }
    }

    if (Object.keys(fieldsToClean).length === 0) continue;

    const personName = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
    const fieldList = Object.entries(fieldsToClean)
      .map(([k, v]) => `${k}="${String(v).substring(0, 50)}"`)
      .join(", ");

    console.log(`  #${base.id} [${base.typ}] ${personName}: ${fieldList}`);

    if (DO_RUN) {
      const updateData = {};
      for (const field of Object.keys(fieldsToClean)) {
        updateData[field] = null;
      }
      await db.fdkEmploymentBase.update({ where: { id: base.id }, data: updateData });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: base.foreignerId,
          changedBy: CHANGED_BY,
          field: "employment_base_update",
          oldValue: JSON.stringify(fieldsToClean),
          newValue: `Wyczyszczono etykiety formularza z podstawy #${base.id}: ${Object.keys(fieldsToClean).join(", ")}`,
        },
      });
      console.log(`    → wyczyszczono`);
    }

    cleaned++;
  }

  console.log(`\nPodstaw do wyczyszczenia: ${cleaned}`);
  if (!DO_RUN) console.log(`Uruchom z --run aby zastosować.\n`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
