/**
 * Targeted fix: restore Valovich /155 TRC-FDK residence basis
 * + scan all foreigners with valid permit but 0 residence bases.
 *
 * Usage:
 *   node scripts/fix-valovich.mjs           # dry run
 *   node scripts/fix-valovich.mjs --apply
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`=== FIX VALOVICH + SCAN === ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  // ── 1. Valovich /155 ──────────────────────────────────────────────────────
  console.log("1. Valovich /155 — podstawy pobytu:");
  const existing = await db.fdkResidenceBasis.findMany({
    where: { foreignerId: 155 },
    orderBy: { dataOd: "desc" },
  });
  if (existing.length) {
    for (const r of existing)
      console.log(`   #${r.id} ${r.typ} ${r.dataOd?.toISOString().slice(0,10)??"-"} — ${r.dataDo?.toISOString().slice(0,10)??"-"} nr=${r.nrDecyzji??"-"}`);
  } else {
    console.log("   (brak)");
  }

  const alreadyOk = existing.some(
    (r) => r.nrDecyzji === "WSC-II-P.6151.85854.2024"
         || (r.typ === "TRC_FDK" && r.dataDo?.toISOString().slice(0,10) === "2028-01-28")
  );

  if (alreadyOk) {
    console.log("   ✓ TRC-FDK już istnieje — pomijam");
  } else {
    console.log("   → DO WSTAWIENIA: TRC-FDK 28.01.2025–28.01.2028 WSC-II-P.6151.85854.2024");
    if (APPLY) {
      const created = await db.fdkResidenceBasis.create({
        data: {
          foreignerId: 155,
          typ:         "TRC_FDK",
          status:      "AKTYWNE",
          dataOd:      new Date("2025-01-28"),
          dataDo:      new Date("2028-01-28"),
          nrDecyzji:   "WSC-II-P.6151.85854.2024",
          urzad:       "Wojewoda Mazowiecki",
        },
      });
      console.log(`   ✓ WSTAWIONO #${created.id}`);

      // Sync flat field on foreigner if stale
      const f = await db.fdkForeigner.findUnique({ where: { id: 155 }, select: { decyzjaPobytowaDo: true } });
      const target = new Date("2028-01-28");
      if (!f?.decyzjaPobytowaDo || f.decyzjaPobytowaDo < target) {
        await db.fdkForeigner.update({ where: { id: 155 }, data: { decyzjaPobytowaDo: target } });
        console.log("   ✓ Zaktualizowano decyzjaPobytowaDo = 2028-01-28");
      }
    }
  }

  // ── 2. Scan all foreigners with valid permit but 0 residence bases ─────────
  console.log("\n2. Cudzoziemcy z ważną decyzją pobytową, ale bez podstaw pobytu:");

  const withPermit = await db.fdkForeigner.findMany({
    where: { decyzjaPobytowaDo: { gt: new Date() } },
    select: {
      id: true, imie: true, nazwisko: true, decyzjaPobytowaDo: true,
      _count: { select: { residenceBases: true } },
    },
    orderBy: { decyzjaPobytowaDo: "desc" },
  });

  const missing = withPermit.filter((f) => f._count.residenceBases === 0);
  console.log(`   Łącznie z decyzją w przyszłości: ${withPermit.length}`);
  console.log(`   Bez żadnej podstawy pobytu:      ${missing.length}`);

  for (const f of missing) {
    console.log(`   /${f.id} ${f.imie??""} ${f.nazwisko} — kp do ${f.decyzjaPobytowaDo?.toISOString().slice(0,10)}`);
  }

  if (!APPLY) console.log("\n--- DRY RUN. Uruchom z --apply aby zapisać. ---");
  await db.$disconnect();
}

main().catch(console.error);
