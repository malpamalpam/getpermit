/**
 * Fix issues from scrape run 22-23.09:
 * 1. Zdublowane stanowisko "w charakterze X X" → "X"
 * 2. Legacy ZEZWOLENIE → ZEZWOLENIE_A
 * 3. Report profiles with attachments > 0 and 0 bases
 *
 * Usage:
 *   node scripts/fix-scrape-issues-23-09.mjs              # dry-run
 *   node scripts/fix-scrape-issues-23-09.mjs --run         # execute
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "fix-scrape-issues-23-09";
const DO_RUN = process.argv.includes("--run");

function cleanStanowisko(s) {
  if (!s) return s;
  let cleaned = s.trim();
  // Strip "/ w charakterze" prefix
  cleaned = cleaned.replace(/^[\/\s]*w\s+charakterze\s*/i, "").trim();
  // Deduplicate: "admin baz danychadmin baz danych" → "admin baz danych"
  const half = Math.floor(cleaned.length / 2);
  if (half > 3 && cleaned.substring(0, half) === cleaned.substring(half)) {
    cleaned = cleaned.substring(0, half);
  }
  return cleaned;
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  FIX SCRAPE ISSUES 23.09`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // ===================================================================
  // 1. Fix zdublowane stanowisko
  // ===================================================================
  console.log("--- 1. Zdublowane stanowisko ---");

  const basesWithStanowisko = await db.fdkEmploymentBase.findMany({
    where: { stanowisko: { not: null } },
    select: { id: true, stanowisko: true, foreignerId: true },
  });

  let stanFixCount = 0;
  for (const base of basesWithStanowisko) {
    const cleaned = cleanStanowisko(base.stanowisko);
    if (cleaned !== base.stanowisko) {
      console.log(`  #${base.id}: "${base.stanowisko?.substring(0, 60)}" → "${cleaned?.substring(0, 60)}"`);
      stanFixCount++;
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { stanowisko: cleaned } });
      }
    }
  }
  console.log(`  Poprawionych: ${stanFixCount}\n`);

  // ===================================================================
  // 2. Legacy ZEZWOLENIE → ZEZWOLENIE_A
  // ===================================================================
  console.log("--- 2. Legacy ZEZWOLENIE → ZEZWOLENIE_A ---");

  const legacyZezwolenia = await db.fdkEmploymentBase.findMany({
    where: { typ: "ZEZWOLENIE" },
    select: { id: true, foreignerId: true },
  });

  console.log(`  Podstaw z typem ZEZWOLENIE: ${legacyZezwolenia.length}`);
  if (legacyZezwolenia.length > 0 && DO_RUN) {
    await db.fdkEmploymentBase.updateMany({
      where: { typ: "ZEZWOLENIE" },
      data: { typ: "ZEZWOLENIE_A" },
    });
    console.log(`  → Zmigrowno na ZEZWOLENIE_A`);
  }

  // ===================================================================
  // 3. Report profiles still with 0 bases
  // ===================================================================
  console.log("\n--- 3. Profile z załącznikami > 0 i 0 podstaw ---");

  const profiles = await db.fdkForeigner.findMany({
    include: {
      _count: { select: { attachments: true, employmentBases: true } },
    },
    orderBy: { nazwisko: "asc" },
  });

  const zeroBases = profiles.filter((p) => p._count.attachments > 0 && p._count.employmentBases === 0);
  console.log(`  Profili z zał. > 0 i 0 podstaw: ${zeroBases.length}`);

  const csvLines = ["id;nazwisko;imie;zalaczniki;podstawy;uwagi"];
  for (const p of zeroBases) {
    csvLines.push(`${p.id};"${p.nazwisko}";"${p.imie ?? ""}";"${p._count.attachments}";"0";""` );
  }
  fs.writeFileSync("raport-zero-bases.csv", csvLines.join("\n"), "utf-8");
  console.log(`  Raport: raport-zero-bases.csv`);

  // Per-letter summary
  const byLetter = {};
  for (const p of zeroBases) {
    const l = (p.nazwisko || "?").toUpperCase().charAt(0);
    byLetter[l] = (byLetter[l] || 0) + 1;
  }
  for (const [l, c] of Object.entries(byLetter).sort()) {
    console.log(`    ${l}: ${c}`);
  }

  // ===================================================================
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`  Stanowisko poprawione: ${stanFixCount}`);
  console.log(`  ZEZWOLENIE → ZEZWOLENIE_A: ${legacyZezwolenia.length}`);
  console.log(`  Profile z 0 podstaw: ${zeroBases.length}`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
