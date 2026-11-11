/**
 * Round 7 migration — fixes remaining data issues on production.
 *
 * Steps:
 * 1. Delete bad employment bases (strict: no full period OR contract data)
 * 2. Delete bad residence bases (no full period, duplicates, BRAK_DANYCH empties)
 * 3. Remove ZEZWOLENIE_A from residence bases (not a residence basis type)
 * 4. Fix raw type names in uwagi ("TRC_FDK" → "TRC — FDK")
 * 5. Clear false "w procedurze" (list for review, auto-clear Abramova /223)
 * 6. Re-scrape attachments via API (zezwolenia, TRC with empty stanowisko, UA)
 *
 * Usage:
 *   node scripts/migration-round7.mjs --dry-run
 *   node scripts/migration-round7.mjs --apply
 *   node scripts/migration-round7.mjs --apply --rescrape  (also trigger OCR)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const RESCRAPE = process.argv.includes("--rescrape");
const BASE_URL = process.env.NEXTAUTH_URL || process.env.BASE_URL || "http://localhost:3000";

const TYPE_LABELS = {
  TRC_FDK: "TRC — FDK", TRC_INNY_PRACODAWCA: "TRC — inny pracodawca",
  TRC_HUMANITARNE: "TRC — humanitarne", TRC_BLUE_CARD: "Blue Card",
  TRC_POBYT_Z_CUDZ: "TRC — pobyt z cudzoziemcem", TRC_MALZONEK_PL: "TRC — małżonek PL",
  TRC_STUDIA: "TRC — studia", TRC_ABSOLWENT: "TRC — absolwent",
  TRC_DZIALALNOSC: "TRC — działalność", TRC_INNE_OKOLICZNOSCI: "TRC — inne okoliczności",
  ZEZWOLENIE_A: "Zezwolenie A", ZEZWOLENIE_A_KONT: "Zezwolenie A kont.",
  BLUE_CARD: "Blue Card", KARTA_POBYTU: "TRC", OSWIADCZENIE: "Oświadczenie",
  POWIADOMIENIE_UA: "Powiadomienie UA", ZGLOSZENIE_UA: "Zgłoszenie UA",
};

function humanType(raw) {
  return TYPE_LABELS[raw] || raw.replace(/_/g, " ");
}

// ============================================================================
// Step 1: Delete bad employment bases
// ============================================================================
async function step1() {
  console.log("\n=== STEP 1: Delete bad employment bases (strict criteria) ===");

  // 1a. No full period (missing dataOd OR dataDo), added by scraper
  const noFullPeriod = await prisma.fdkEmploymentBase.findMany({
    where: {
      sourceAttachmentId: { not: null }, // scraper-created
      OR: [{ dataOd: null }, { dataDo: null }],
    },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });
  console.log(`  No full period (scraper-created): ${noFullPeriod.length}`);

  // 1b. No document number (neither nrDecyzji nor nrOswiadczenia), scraper-created
  const noNumber = await prisma.fdkEmploymentBase.findMany({
    where: {
      sourceAttachmentId: { not: null },
      nrDecyzji: null,
      nrOswiadczenia: null,
    },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });
  console.log(`  No document number (scraper-created): ${noNumber.length}`);

  // Combine unique IDs
  const toDelete = new Map();
  for (const b of [...noFullPeriod, ...noNumber]) {
    // Keep records that have BOTH full period AND a number
    const hasFullPeriod = b.dataOd && b.dataDo;
    const hasNumber = b.nrDecyzji || b.nrOswiadczenia;
    if (!hasFullPeriod || !hasNumber) {
      toDelete.set(b.id, b);
    }
  }

  const csvRows = ["id,foreignerId,foreigner,typ,status,dataOd,dataDo,nrDecyzji,reason"];
  for (const b of toDelete.values()) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    const reason = (!b.dataOd || !b.dataDo) ? "no_full_period" : "no_number";
    csvRows.push(`${b.id},${b.foreignerId},"${name}",${b.typ},${b.status},${b.dataOd?.toISOString().slice(0,10) ?? ""},${b.dataDo?.toISOString().slice(0,10) ?? ""},${b.nrDecyzji ?? b.nrOswiadczenia ?? ""},${reason}`);
  }
  writeFileSync("raport-r7-step1-bad-employment.csv", csvRows.join("\n"));

  if (APPLY && toDelete.size > 0) {
    const r = await prisma.fdkEmploymentBase.deleteMany({ where: { id: { in: [...toDelete.keys()] } } });
    console.log(`  DELETED: ${r.count}`);
  }
  return toDelete.size;
}

// ============================================================================
// Step 2: Delete bad residence bases
// ============================================================================
async function step2() {
  console.log("\n=== STEP 2: Delete bad / duplicate residence bases ===");

  // 2a. No full period AND no number, scraper-created
  const bad = await prisma.fdkResidenceBasis.findMany({
    where: {
      OR: [
        // No full period
        { dataOd: null },
        { dataDo: null },
      ],
    },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });

  const toDelete = new Map();
  for (const b of bad) {
    const hasFullPeriod = b.dataOd && b.dataDo;
    const hasNumber = b.nrDecyzji || b.nrKartyPobytu || b.nrWizy;
    // Delete if: (no full period AND no number) OR status=BRAK_DANYCH with nothing useful
    if ((!hasFullPeriod && !hasNumber) ||
        (b.status === "BRAK_DANYCH" && !hasFullPeriod && !hasNumber)) {
      toDelete.set(b.id, b);
    }
  }

  // 2b. Dedup: group by (foreignerId, typ, nrDecyzji or dataDo)
  const all = await prisma.fdkResidenceBasis.findMany({
    orderBy: [{ foreignerId: "asc" }, { typ: "asc" }],
  });
  const groups = new Map();
  for (const r of all) {
    if (toDelete.has(r.id)) continue; // already marked
    const key = r.nrDecyzji
      ? `${r.foreignerId}|${r.typ}|nr:${r.nrDecyzji}`
      : r.dataDo
        ? `${r.foreignerId}|${r.typ}|do:${r.dataDo.toISOString().slice(0, 10)}`
        : null;
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(r);
    groups.set(key, group);
  }

  let dupCount = 0;
  for (const [, group] of groups) {
    if (group.length <= 1) continue;
    // Score: more non-null fields = better
    group.sort((a, b) => {
      const sc = (r) => [r.dataOd, r.dataDo, r.nrDecyzji, r.nrKartyPobytu, r.urzad, r.nrWizy].filter(Boolean).length;
      return sc(b) - sc(a);
    });
    const keep = group[0];
    for (let i = 1; i < group.length; i++) {
      toDelete.set(group[i].id, group[i]);
      dupCount++;
      // Merge fields into keep
      if (APPLY) {
        const update = {};
        const d = group[i];
        if (!keep.nrKartyPobytu && d.nrKartyPobytu) update.nrKartyPobytu = d.nrKartyPobytu;
        if (!keep.urzad && d.urzad) update.urzad = d.urzad;
        if (!keep.dataOd && d.dataOd) update.dataOd = d.dataOd;
        if (Object.keys(update).length > 0) {
          await prisma.fdkResidenceBasis.update({ where: { id: keep.id }, data: update });
        }
      }
    }
  }

  console.log(`  Bad (no period + no number): ${toDelete.size - dupCount}`);
  console.log(`  Duplicates to merge: ${dupCount}`);

  if (APPLY && toDelete.size > 0) {
    for (const id of toDelete.keys()) {
      await prisma.fdkResidenceBasis.delete({ where: { id } }).catch(() => {});
    }
    console.log(`  DELETED: ${toDelete.size}`);
  }
  return toDelete.size;
}

// ============================================================================
// Step 3: Remove ZEZWOLENIE from residence bases
// ============================================================================
async function step3() {
  console.log("\n=== STEP 3: Remove ZEZWOLENIE from residence bases ===");
  const zezw = await prisma.fdkResidenceBasis.findMany({
    where: { typ: { in: ["ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "ZEZWOLENIE"] } },
    select: { id: true, foreignerId: true, nrDecyzji: true },
  });
  console.log(`  Zezwolenia in residence bases: ${zezw.length}`);
  if (APPLY && zezw.length > 0) {
    const r = await prisma.fdkResidenceBasis.deleteMany({
      where: { typ: { in: ["ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "ZEZWOLENIE"] } },
    });
    console.log(`  DELETED: ${r.count}`);
  }
  return zezw.length;
}

// ============================================================================
// Step 4: Fix raw type names in uwagi
// ============================================================================
async function step4() {
  console.log("\n=== STEP 4: Fix raw type names in uwagi ===");
  const withRawType = await prisma.fdkEmploymentBase.findMany({
    where: { uwagi: { contains: "przez TRC_" } },
    select: { id: true, uwagi: true },
  });
  console.log(`  Records with raw type in uwagi: ${withRawType.length}`);
  if (APPLY) {
    for (const b of withRawType) {
      let fixed = b.uwagi;
      for (const [raw, label] of Object.entries(TYPE_LABELS)) {
        fixed = fixed.replace(new RegExp(raw, "g"), label);
      }
      if (fixed !== b.uwagi) {
        await prisma.fdkEmploymentBase.update({ where: { id: b.id }, data: { uwagi: fixed } });
      }
    }
  }
  return withRawType.length;
}

// ============================================================================
// Step 5: Clear false "w procedurze"
// ============================================================================
async function step5() {
  console.log("\n=== STEP 5: Clear false 'w procedurze' ===");
  const withUpo = await prisma.fdkForeigner.findMany({
    where: { upoDoreczone: { not: null } },
    select: {
      id: true, imie: true, nazwisko: true, upoDoreczone: true, upoUwagi: true,
      attachments: { select: { nazwaPliku: true, detectedType: true } },
    },
  });

  const evidenceTypes = ["POBYT_NA_PRZEDLUZENIU", "ZASWIADCZENIE_POSTEPOWANIE"];
  const evidencePatterns = ["upo", "stempel", "potwierdzenie"];

  const falseRecords = withUpo.filter((f) => !f.attachments.some(
    (a) => (a.detectedType && evidenceTypes.includes(a.detectedType)) ||
           evidencePatterns.some((p) => a.nazwaPliku.toLowerCase().includes(p))
  ));

  console.log(`  Total 'w procedurze': ${withUpo.length}`);
  console.log(`  Without evidence (false): ${falseRecords.length}`);
  for (const f of falseRecords) {
    console.log(`    /${f.id} ${f.imie} ${f.nazwisko} — upo: ${f.upoDoreczone?.toISOString().slice(0, 10)} — ${f.upoUwagi ?? ""}`);
  }

  if (APPLY && falseRecords.length > 0) {
    for (const f of falseRecords) {
      await prisma.fdkForeigner.update({
        where: { id: f.id },
        data: { upoDoreczone: null, upoUwagi: null },
      });
    }
    console.log(`  CLEARED: ${falseRecords.length}`);
  }
  return falseRecords.length;
}

// ============================================================================
// Step 6: Trigger re-scrape for key attachments
// ============================================================================
async function step6() {
  console.log("\n=== STEP 6: Re-scrape attachments (OCR) ===");
  if (!RESCRAPE) {
    console.log("  Skipped (use --rescrape flag). Listing what would be re-scraped:");
  }

  // 6a. Zezwolenia with WRP sygnatura but no permit number
  const zezwAtts = await prisma.fdkEmploymentBase.findMany({
    where: {
      typ: { in: ["ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT"] },
      nrDecyzji: null, // cleared by previous migration
      sourceAttachmentId: { not: null },
    },
    select: { sourceAttachmentId: true, foreignerId: true },
  });

  // 6b. TRC with empty stanowisko
  const trcAtts = await prisma.fdkEmploymentBase.findMany({
    where: {
      typ: { in: ["TRC_FDK", "TRC_BLUE_CARD", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL"] },
      OR: [{ stanowisko: null }, { stanowisko: "" }],
      sourceAttachmentId: { not: null },
    },
    select: { sourceAttachmentId: true, foreignerId: true },
  });

  // 6c. UA notifications for specific foreigners
  const uaAtts = await prisma.fdkAttachment.findMany({
    where: {
      detectedType: { in: ["POWIADOMIENIE_UA", "ZGLOSZENIE_UA"] },
      folder: "wazne",
    },
    select: { id: true, foreignerId: true },
  });

  // 6d. Residence bases with empty urzad (re-scrape source attachment)
  const noUrzad = await prisma.fdkResidenceBasis.findMany({
    where: {
      urzad: null,
      sourceAttachmentId: { not: null },
      typ: { startsWith: "TRC" },
    },
    select: { sourceAttachmentId: true },
  });

  const allAttIds = new Set();
  for (const b of zezwAtts) if (b.sourceAttachmentId) allAttIds.add(b.sourceAttachmentId);
  for (const b of trcAtts) if (b.sourceAttachmentId) allAttIds.add(b.sourceAttachmentId);
  for (const a of uaAtts) allAttIds.add(a.id);
  for (const b of noUrzad) if (b.sourceAttachmentId) allAttIds.add(b.sourceAttachmentId);

  console.log(`  Zezwolenia without permit number: ${zezwAtts.length} attachments`);
  console.log(`  TRC with empty stanowisko: ${trcAtts.length} attachments`);
  console.log(`  UA notifications: ${uaAtts.length} attachments`);
  console.log(`  Residence bases with empty urzad: ${noUrzad.length} attachments`);
  console.log(`  TOTAL unique attachments to re-scrape: ${allAttIds.size}`);

  if (RESCRAPE && allAttIds.size > 0) {
    let ok = 0, fail = 0;
    for (const attId of allAttIds) {
      try {
        const res = await fetch(`${BASE_URL}/api/fdk/attachments/${attId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "scrape" }),
        });
        if (res.ok) {
          ok++;
          if (ok % 10 === 0) console.log(`  ... ${ok} done`);
        } else {
          const txt = await res.text().catch(() => "");
          fail++;
          console.log(`  [FAIL] att #${attId}: ${res.status} ${txt.substring(0, 100)}`);
        }
        // Rate limit: 200ms between requests
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        fail++;
        console.log(`  [ERROR] att #${attId}: ${e.message}`);
      }
    }
    console.log(`  RE-SCRAPED: ${ok} OK, ${fail} failed`);
  }

  return allAttIds.size;
}

// ============================================================================
// Final counts
// ============================================================================
async function finalCounts() {
  console.log("\n=== FINAL COUNTS ===");
  const queries = {
    "Zezwolenia z Nr LIKE 'WRP%'": await prisma.fdkEmploymentBase.count({ where: { nrDecyzji: { startsWith: "WRP" } } }),
    "Employment bez pełnego okresu (scraper)": await prisma.fdkEmploymentBase.count({
      where: { sourceAttachmentId: { not: null }, OR: [{ dataOd: null }, { dataDo: null }] },
    }),
    "Employment bez numeru (scraper)": await prisma.fdkEmploymentBase.count({
      where: { sourceAttachmentId: { not: null }, nrDecyzji: null, nrOswiadczenia: null },
    }),
    "TRC z pustym stanowiskiem": await prisma.fdkEmploymentBase.count({
      where: { typ: { startsWith: "TRC" }, OR: [{ stanowisko: null }, { stanowisko: "" }] },
    }),
    "Residence z pustym urzad (TRC)": await prisma.fdkResidenceBasis.count({
      where: { typ: { startsWith: "TRC" }, urzad: null },
    }),
    "Residence typu ZEZWOLENIE": await prisma.fdkResidenceBasis.count({
      where: { typ: { in: ["ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "ZEZWOLENIE"] } },
    }),
    "Fałszywe 'w procedurze'": (await prisma.fdkForeigner.count({ where: { upoDoreczone: { not: null } } })),
  };

  for (const [label, count] of Object.entries(queries)) {
    const status = count === 0 ? "✓" : count < 10 ? "⚠" : "✗";
    console.log(`  ${status} ${label}: ${count}`);
  }
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log(`=== MIGRATION ROUND 7 — ${APPLY ? "APPLY" : "DRY RUN"}${RESCRAPE ? " + RESCRAPE" : ""} ===\n`);

  const r = {};
  r.step1 = await step1();
  r.step2 = await step2();
  r.step3 = await step3();
  r.step4 = await step4();
  r.step5 = await step5();
  r.step6 = await step6();
  await finalCounts();

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(r, null, 2));

  writeFileSync("raport-migration-round7.json", JSON.stringify(r, null, 2));
  if (!APPLY) console.log("\n--- DRY RUN. Uruchom z --apply. Dla re-scrape: --apply --rescrape ---");
}

main().catch(console.error).finally(() => prisma.$disconnect());
