/**
 * Master migration runner — executes all pending migrations in correct order.
 * Each step: dry-run report → apply if --apply flag.
 *
 * Usage:
 *   node scripts/run-all-migrations.mjs --dry-run   → reports only
 *   node scripts/run-all-migrations.mjs --apply      → apply all
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// ============================================================================
// Helpers
// ============================================================================

function isFdkEmployer(text) {
  if (!text) return true;
  const lower = text.toLowerCase();
  const names = ["firma dla każdego", "firma dla kazdego", "fundacja firma", "fdk"];
  const addresses = ["lwowska 5/15", "lwowska 17/4", "lwowska 5"];
  const nips = ["7010962890", "5252625624"];
  for (const name of names) if (lower.includes(name)) return true;
  for (const addr of addresses) if (lower.includes(addr)) return true;
  for (const nip of nips) if (lower.includes(nip)) return true;
  return false;
}

function score(r) {
  let s = 0;
  if (r.dataOd) s++;
  if (r.dataDo) s++;
  if (r.nrDecyzji) s += 2;
  if (r.nrKartyPobytu) s += 2;
  if (r.urzad) s++;
  if (r.nrWizy) s++;
  if (r.sourceAttachmentId) s++;
  if (r.status !== "BRAK_DANYCH") s++;
  return s;
}

// ============================================================================
// Steps
// ============================================================================

async function step1_cleanupEmpty() {
  console.log("\n=== STEP 1: Cleanup empty records (pkt 6) ===");
  const empty = await prisma.fdkEmploymentBase.findMany({
    where: { nrDecyzji: null, nrOswiadczenia: null, dataOd: null, dataDo: null },
    select: { id: true, foreignerId: true, sourceAttachmentId: true, typ: true },
  });
  const toDelete = empty.filter((b) => !b.sourceAttachmentId);
  console.log(`  Empty employment bases: ${empty.length} total, ${toDelete.length} without source (delete)`);
  if (APPLY && toDelete.length > 0) {
    const r = await prisma.fdkEmploymentBase.deleteMany({ where: { id: { in: toDelete.map(b => b.id) } } });
    console.log(`  Deleted: ${r.count}`);
  }

  const emptyRes = await prisma.fdkResidenceBasis.findMany({
    where: { nrDecyzji: null, nrWizy: null, nrKartyPobytu: null, dataOd: null, dataDo: null },
    select: { id: true, sourceAttachmentId: true },
  });
  const resToDelete = emptyRes.filter((b) => !b.sourceAttachmentId);
  console.log(`  Empty residence bases: ${emptyRes.length} total, ${resToDelete.length} without source (delete)`);
  if (APPLY && resToDelete.length > 0) {
    const r = await prisma.fdkResidenceBasis.deleteMany({ where: { id: { in: resToDelete.map(b => b.id) } } });
    console.log(`  Deleted: ${r.count}`);
  }
  return toDelete.length + resToDelete.length;
}

async function step2_reclassifyWrp() {
  console.log("\n=== STEP 2: Reclassify WRP → ZEZWOLENIE_A (pkt 2) ===");
  const empWrp = await prisma.fdkEmploymentBase.findMany({
    where: { nrDecyzji: { startsWith: "WRP" }, typ: { notIn: ["ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "ZEZWOLENIE"] } },
    select: { id: true, typ: true, nrDecyzji: true },
  });
  console.log(`  Employment bases with WRP: ${empWrp.length}`);
  if (APPLY) {
    for (const b of empWrp) {
      await prisma.fdkEmploymentBase.update({ where: { id: b.id }, data: { typ: "ZEZWOLENIE_A" } });
    }
  }

  // Also check sygnatura field for WRP (from fix-permit-numbers logic)
  const empSygWrp = await prisma.fdkEmploymentBase.findMany({
    where: { sygnatura: { startsWith: "WRP" }, typ: { notIn: ["ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "ZEZWOLENIE"] } },
    select: { id: true },
  });
  console.log(`  Employment bases with WRP in sygnatura: ${empSygWrp.length}`);
  if (APPLY) {
    for (const b of empSygWrp) {
      await prisma.fdkEmploymentBase.update({ where: { id: b.id }, data: { typ: "ZEZWOLENIE_A" } });
    }
  }

  const resWrp = await prisma.fdkResidenceBasis.findMany({
    where: { nrDecyzji: { startsWith: "WRP" }, typ: { notIn: ["ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "ZEZWOLENIE"] } },
    select: { id: true },
  });
  console.log(`  Residence bases with WRP: ${resWrp.length}`);
  if (APPLY) {
    for (const b of resWrp) {
      await prisma.fdkResidenceBasis.update({ where: { id: b.id }, data: { typ: "ZEZWOLENIE_A" } });
    }
  }
  return empWrp.length + empSygWrp.length + resWrp.length;
}

async function step3_fixPermitNumbers() {
  console.log("\n=== STEP 3: Move WRP from nrDecyzji → sygnatura (pkt 1) ===");
  const wrpInNr = await prisma.fdkEmploymentBase.findMany({
    where: { nrDecyzji: { startsWith: "WRP" } },
    select: { id: true, nrDecyzji: true, sygnatura: true },
  });
  console.log(`  Records with WRP in nrDecyzji: ${wrpInNr.length}`);
  if (APPLY) {
    for (const b of wrpInNr) {
      await prisma.fdkEmploymentBase.update({
        where: { id: b.id },
        data: { sygnatura: b.sygnatura || b.nrDecyzji, nrDecyzji: null },
      });
    }
  }
  return wrpInNr.length;
}

async function step4_removeNonFdk() {
  console.log("\n=== STEP 4: Remove non-FDK employment bases (pkt 5) ===");
  const withFirma = await prisma.fdkEmploymentBase.findMany({
    where: { firma: { not: null } },
    select: { id: true, firma: true, typ: true },
  });
  const nonFdk = withFirma.filter((b) => !isFdkEmployer(b.firma));
  const trcInny = await prisma.fdkEmploymentBase.findMany({
    where: { typ: "TRC_INNY_PRACODAWCA" },
    select: { id: true },
  });
  const ids = new Set([...nonFdk.map(b => b.id), ...trcInny.map(b => b.id)]);
  console.log(`  Non-FDK by firma: ${nonFdk.length}, TRC_INNY_PRACODAWCA: ${trcInny.length}, unique: ${ids.size}`);
  if (APPLY && ids.size > 0) {
    const r = await prisma.fdkEmploymentBase.deleteMany({ where: { id: { in: [...ids] } } });
    console.log(`  Deleted: ${r.count}`);
  }
  return ids.size;
}

async function step5_dedupResidence() {
  console.log("\n=== STEP 5: Dedup residence bases (pkt 7) ===");
  const all = await prisma.fdkResidenceBasis.findMany({
    orderBy: [{ foreignerId: "asc" }, { typ: "asc" }],
  });

  const groups = new Map();
  for (const r of all) {
    const key = r.nrDecyzji
      ? `${r.foreignerId}|${r.typ}|nr:${r.nrDecyzji}`
      : r.dataDo
        ? `${r.foreignerId}|${r.typ}|do:${r.dataDo.toISOString().slice(0, 10)}`
        : `${r.foreignerId}|${r.typ}|id:${r.id}`;
    const group = groups.get(key) ?? [];
    group.push(r);
    groups.set(key, group);
  }

  let deleteCount = 0;
  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    group.sort((a, b) => score(b) - score(a));
    const keep = group[0];
    const dupes = group.slice(1);

    if (APPLY) {
      // Merge fields
      const update = {};
      for (const dupe of dupes) {
        if (!keep.nrKartyPobytu && dupe.nrKartyPobytu) update.nrKartyPobytu = dupe.nrKartyPobytu;
        if (!keep.urzad && dupe.urzad) update.urzad = dupe.urzad;
        if (!keep.dataOd && dupe.dataOd) update.dataOd = dupe.dataOd;
        if (!keep.nrDecyzji && dupe.nrDecyzji) update.nrDecyzji = dupe.nrDecyzji;
      }
      if (Object.keys(update).length > 0) {
        await prisma.fdkResidenceBasis.update({ where: { id: keep.id }, data: update });
      }
      for (const dupe of dupes) {
        await prisma.fdkResidenceBasis.delete({ where: { id: dupe.id } }).catch(() => {});
      }
    }
    deleteCount += dupes.length;
  }

  // Empty BRAK_DANYCH
  const emptyBrak = all.filter(
    (r) => r.status === "BRAK_DANYCH" && !r.nrDecyzji && !r.nrKartyPobytu && !r.nrWizy && !r.dataOd && !r.dataDo
  );
  console.log(`  Duplicates: ${deleteCount}, empty BRAK_DANYCH: ${emptyBrak.length}`);
  if (APPLY) {
    for (const r of emptyBrak) {
      await prisma.fdkResidenceBasis.delete({ where: { id: r.id } }).catch(() => {});
    }
  }
  return deleteCount + emptyBrak.length;
}

async function step6_fixContractNumbers() {
  console.log("\n=== STEP 6: Fix contract numbers in nrDecyzji (pkt 6 #6) ===");
  const contractPattern = await prisma.fdkEmploymentBase.findMany({
    where: { nrDecyzji: { contains: "/UDD/" } },
    select: { id: true, nrDecyzji: true, foreignerId: true },
  });
  console.log(`  Records with /UDD/ in nrDecyzji: ${contractPattern.length}`);
  if (APPLY) {
    for (const b of contractPattern) {
      await prisma.fdkEmploymentBase.update({ where: { id: b.id }, data: { nrDecyzji: null } });
    }
  }

  // Also check residence bases
  const resContract = await prisma.fdkResidenceBasis.findMany({
    where: { nrDecyzji: { contains: "/UDD/" } },
    select: { id: true },
  });
  console.log(`  Residence bases with /UDD/ in nrDecyzji: ${resContract.length}`);
  if (APPLY) {
    for (const b of resContract) {
      await prisma.fdkResidenceBasis.update({ where: { id: b.id }, data: { nrDecyzji: null } });
    }
  }
  return contractPattern.length + resContract.length;
}

async function step7_scanFalseWProcedurze() {
  console.log("\n=== STEP 7: Scan false 'w procedurze' (pkt 9b) ===");
  const withUpo = await prisma.fdkForeigner.findMany({
    where: { upoDoreczone: { not: null } },
    select: {
      id: true, imie: true, nazwisko: true, upoDoreczone: true,
      attachments: { select: { nazwaPliku: true, detectedType: true } },
    },
  });

  const evidenceTypes = ["POBYT_NA_PRZEDLUZENIU", "ZASWIADCZENIE_POSTEPOWANIE"];
  const evidencePatterns = ["upo", "stempel", "potwierdzenie"];

  const falseRecords = withUpo.filter((f) => !f.attachments.some(
    (a) => (a.detectedType && evidenceTypes.includes(a.detectedType)) ||
           evidencePatterns.some((p) => a.nazwaPliku.toLowerCase().includes(p))
  ));

  console.log(`  Foreigners 'w procedurze': ${withUpo.length}, without evidence: ${falseRecords.length}`);
  for (const f of falseRecords) {
    console.log(`    /admin/fdk/${f.id} — ${f.imie} ${f.nazwisko} — upo: ${f.upoDoreczone?.toISOString().slice(0, 10)}`);
  }
  // Don't auto-delete — list for manual review
  return falseRecords.length;
}

async function step8_finalCounts() {
  console.log("\n=== FINAL COUNTS ===");
  const c1 = await prisma.fdkEmploymentBase.count({
    where: { nrDecyzji: null, nrOswiadczenia: null, dataOd: null, dataDo: null },
  });
  const c2 = await prisma.fdkEmploymentBase.count({
    where: { nrDecyzji: { startsWith: "WRP" } },
  });
  const c3 = await prisma.fdkEmploymentBase.count({
    where: { nrDecyzji: { contains: "/UDD/" } },
  });
  const c4 = await prisma.fdkResidenceBasis.count({
    where: { nrDecyzji: null, nrWizy: null, nrKartyPobytu: null, dataOd: null, dataDo: null },
  });
  const c5 = await prisma.fdkResidenceBasis.count({
    where: { typ: { in: ["TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_BLUE_CARD", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC", "TRC_INNE_OKOLICZNOSCI"] }, urzad: null },
  });

  console.log(`  Employment bases (no number AND no period): ${c1}`);
  console.log(`  Employment bases with WRP in nrDecyzji: ${c2}`);
  console.log(`  Employment bases with /UDD/ in nrDecyzji: ${c3}`);
  console.log(`  Residence bases (no number AND no period): ${c4}`);
  console.log(`  Residence bases TRC with empty urzad: ${c5} (needs rescrape)`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`=== ALL MIGRATIONS — ${APPLY ? "APPLY" : "DRY RUN"} ===`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@').substring(0, 60)}...\n`);

  const results = {};
  results.step1 = await step1_cleanupEmpty();
  results.step2 = await step2_reclassifyWrp();
  results.step3 = await step3_fixPermitNumbers();
  results.step4 = await step4_removeNonFdk();
  results.step5 = await step5_dedupResidence();
  results.step6 = await step6_fixContractNumbers();
  results.step7 = await step7_scanFalseWProcedurze();
  await step8_finalCounts();

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));

  if (!APPLY) {
    console.log("\n--- DRY RUN. Uruchom z --apply żeby zastosować. ---");
  }

  writeFileSync("raport-all-migrations.json", JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
