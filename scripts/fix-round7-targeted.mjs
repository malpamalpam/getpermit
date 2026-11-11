/**
 * Round 7 targeted fixes — specific records + bulk folder/type corrections + re-scrape.
 *
 * Usage:
 *   node scripts/fix-round7-targeted.mjs --dry-run
 *   node scripts/fix-round7-targeted.mjs --apply
 *   node scripts/fix-round7-targeted.mjs --apply --rescrape
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const RESCRAPE = process.argv.includes("--rescrape");
const BASE_URL = process.env.BASE_URL || "https://getpermit.pl";

async function main() {
  console.log(`=== TARGETED FIXES — ${APPLY ? "APPLY" : "DRY RUN"} ===\n`);

  // =====================================================================
  // 1. Abramova /223 — fix UA attachments: set folder=wazne, detectedType
  // =====================================================================
  console.log("--- 1. Abramova /223: Fix UA attachments ---");
  const abrUA = await prisma.fdkAttachment.findMany({
    where: {
      foreignerId: 223,
      nazwaPliku: { contains: "zg" }, // matches zgloszenie/zgłoszenie
    },
    select: { id: true, nazwaPliku: true, folder: true, detectedType: true },
  });
  // Also get ones with "Zgłoszenie"
  const abrUA2 = await prisma.fdkAttachment.findMany({
    where: {
      foreignerId: 223,
      nazwaPliku: { contains: "Zg" },
    },
    select: { id: true, nazwaPliku: true, folder: true, detectedType: true },
  });
  const allUA = new Map();
  for (const a of [...abrUA, ...abrUA2]) {
    if (/zg[łl]oszeni|zgłoszenie/i.test(a.nazwaPliku)) allUA.set(a.id, a);
  }
  console.log(`  Found ${allUA.size} UA attachments`);
  for (const a of allUA.values()) {
    console.log(`    #${a.id} folder=${a.folder ?? "null"} type=${a.detectedType ?? "null"} ${a.nazwaPliku}`);
    if (APPLY) {
      await prisma.fdkAttachment.update({
        where: { id: a.id },
        data: { folder: "wazne", detectedType: "POWIADOMIENIE_UA" },
      });
    }
  }

  // Also fix PESEL_UKR
  const pesel = await prisma.fdkAttachment.findFirst({
    where: { foreignerId: 223, nazwaPliku: { contains: "PESEL_UKR" } },
  });
  if (pesel && pesel.folder !== "wazne") {
    console.log(`  Fix PESEL_UKR #${pesel.id}: folder → wazne, type → PESEL_UKR`);
    if (APPLY) {
      await prisma.fdkAttachment.update({
        where: { id: pesel.id },
        data: { folder: "wazne", detectedType: "PESEL_UKR" },
      });
    }
  }

  // =====================================================================
  // 2. Khoo /52 — fix misclassified attachments
  // =====================================================================
  console.log("\n--- 2. Khoo /52: Fix misclassified attachments ---");
  const khooFixes = [
    // UDD (umowa) — not TRC, move to inne_dokumenty
    { id: 7136, newType: null, newFolder: "inne_dokumenty", reason: "UDD umowa, not a decision" },
    // experience/CV — not TRC
    { id: 7127, newType: null, newFolder: "inne_dokumenty", reason: "Experience letter, not a decision" },
    { id: 7128, newType: null, newFolder: "inne_dokumenty", reason: "Experience letter signed, not a decision" },
    // WP 2020-2021 — zezwolenie, not TRC
    { id: 7049, newType: "ZEZWOLENIE_A", newFolder: "wazne", reason: "Work permit, not TRC" },
    // Prosba o pozniejsze rozpoczecie — not zezwolenie
    { id: 7130, newType: null, newFolder: "zezwolenie", reason: "Request letter, not a permit" },
  ];
  for (const fix of khooFixes) {
    const att = await prisma.fdkAttachment.findUnique({ where: { id: fix.id }, select: { nazwaPliku: true, detectedType: true, folder: true } });
    if (!att) { console.log(`    #${fix.id} NOT FOUND`); continue; }
    console.log(`    #${fix.id} ${att.nazwaPliku}: ${att.detectedType}→${fix.newType ?? "null"}, ${att.folder}→${fix.newFolder} (${fix.reason})`);
    if (APPLY) {
      await prisma.fdkAttachment.update({
        where: { id: fix.id },
        data: { detectedType: fix.newType, folder: fix.newFolder },
      });
    }
  }

  // =====================================================================
  // 3. Khoo /52 — fix residence base #59 (karta pobytu nr in wrong field)
  // =====================================================================
  console.log("\n--- 3. Khoo /52: Fix residence base #59 (karta pobytu nr) ---");
  const rb59 = await prisma.fdkResidenceBasis.findUnique({ where: { id: 59 } });
  if (rb59 && rb59.nrDecyzji === "RP5967911" && !rb59.nrKartyPobytu) {
    console.log(`    #59: Move nrDecyzji=${rb59.nrDecyzji} to nrKartyPobytu`);
    if (APPLY) {
      await prisma.fdkResidenceBasis.update({
        where: { id: 59 },
        data: { nrKartyPobytu: "RP5967911", nrDecyzji: null },
      });
    }
  }

  // =====================================================================
  // 4. Delete bad employment bases from misclassified attachments
  // =====================================================================
  console.log("\n--- 4. Delete employment bases from non-decision attachments ---");
  // Employment bases linked to UDD, experience, prosba
  const badSourceIds = [7136, 7127, 7128, 7130];
  const badBases = await prisma.fdkEmploymentBase.findMany({
    where: { sourceAttachmentId: { in: badSourceIds } },
    select: { id: true, typ: true, foreignerId: true, sourceAttachmentId: true },
  });
  console.log(`  Employment bases from bad sources: ${badBases.length}`);
  for (const b of badBases) {
    console.log(`    emp #${b.id} typ=${b.typ} src=${b.sourceAttachmentId}`);
  }
  // Also delete residence bases from these attachments
  const badResBases = await prisma.fdkResidenceBasis.findMany({
    where: { sourceAttachmentId: { in: badSourceIds } },
    select: { id: true, typ: true, sourceAttachmentId: true },
  });
  console.log(`  Residence bases from bad sources: ${badResBases.length}`);
  for (const b of badResBases) {
    console.log(`    res #${b.id} typ=${b.typ} src=${b.sourceAttachmentId}`);
  }

  if (APPLY) {
    if (badBases.length > 0) {
      const r = await prisma.fdkEmploymentBase.deleteMany({ where: { id: { in: badBases.map(b => b.id) } } });
      console.log(`  Deleted ${r.count} employment bases`);
    }
    if (badResBases.length > 0) {
      const r = await prisma.fdkResidenceBasis.deleteMany({ where: { id: { in: badResBases.map(b => b.id) } } });
      console.log(`  Deleted ${r.count} residence bases`);
    }
  }

  // =====================================================================
  // 5. Delete residence base #60 (partial: only dataOd, no dataDo)
  // =====================================================================
  console.log("\n--- 5. Delete partial residence bases (Khoo) ---");
  // #60: TRC_FDK 2021-02-23 — (no dataDo), #63: no dates at all
  const partialIds = [];
  const khooRes = await prisma.fdkResidenceBasis.findMany({
    where: { foreignerId: 52 },
    select: { id: true, typ: true, dataOd: true, dataDo: true, nrDecyzji: true },
  });
  for (const r of khooRes) {
    if (!r.dataOd || !r.dataDo) {
      // Only keep if it's the active one or has very important data
      if (r.nrDecyzji && r.dataDo) continue; // has number + end date = keep
      if (r.nrDecyzji === "RP5967911") continue; // karta pobytu — keep
      partialIds.push(r.id);
      console.log(`    Delete res #${r.id}: ${r.typ} ${r.dataOd?.toISOString().slice(0,10) ?? "-"} — ${r.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${r.nrDecyzji ?? "-"}`);
    }
  }
  if (APPLY && partialIds.length > 0) {
    const r = await prisma.fdkResidenceBasis.deleteMany({ where: { id: { in: partialIds } } });
    console.log(`  Deleted ${r.count} partial residence bases`);
  }

  // =====================================================================
  // 6. Bulk: fix all attachments with "zgloszenie" in name → POWIADOMIENIE_UA + wazne
  // =====================================================================
  console.log("\n--- 6. Bulk: Fix UA notification attachments across all foreigners ---");
  const allUAAtts = await prisma.fdkAttachment.findMany({
    where: {
      OR: [
        { nazwaPliku: { contains: "zgloszenie_UA" } },
        { nazwaPliku: { contains: "zgłoszenie_UA" } },
        { nazwaPliku: { contains: "zgloszenie UA" } },
        { nazwaPliku: { contains: "zgłoszenie UA" } },
        { nazwaPliku: { contains: "zgłoszenie)UA" } },
        { nazwaPliku: { contains: "Zgłoszenie_UA" } },
        { nazwaPliku: { contains: "PSZ-PPWPU" } },
      ],
      detectedType: null,
    },
    select: { id: true, foreignerId: true, nazwaPliku: true, folder: true },
  });
  console.log(`  UA attachments with null detectedType: ${allUAAtts.length}`);
  if (APPLY) {
    for (const a of allUAAtts) {
      await prisma.fdkAttachment.update({
        where: { id: a.id },
        data: { folder: "wazne", detectedType: "POWIADOMIENIE_UA" },
      });
    }
    console.log(`  Updated ${allUAAtts.length} attachments`);
  }

  // =====================================================================
  // 7. Re-scrape key attachments
  // =====================================================================
  if (RESCRAPE) {
    console.log("\n--- 7. Re-scrape key attachments ---");
    const toRescrape = new Set();

    // Abraham zezwolenie 2024
    toRescrape.add(185);

    // Khoo zezwolenie attachments
    toRescrape.add(7050); // Khoo Wp 2020-2021 (ZEZWOLENIE_A)
    toRescrape.add(7137); // Zezwolenie_Khoo_24.11.2025

    // Khoo TRC 2022 (retry stanowisko)
    toRescrape.add(7030);

    // All Abramova UA attachments
    for (const a of allUA.values()) toRescrape.add(a.id);

    // Khoo residence — re-scrape TRC decisions for urzad
    toRescrape.add(7027); // Decyzja TRC 2029
    toRescrape.add(7053); // Spelling correction (TRC src for #49)

    console.log(`  Attachments to re-scrape: ${toRescrape.size}`);

    let ok = 0, fail = 0;
    for (const attId of toRescrape) {
      try {
        const res = await fetch(`${BASE_URL}/api/fdk/attachments/${attId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "scrape" }),
        });
        if (res.ok) {
          ok++;
          const data = await res.json().catch(() => ({}));
          console.log(`    [OK] #${attId}: ${data.extracted?.detectedType ?? "?"} stan=${data.extracted?.stanowisko?.substring(0,30) ?? "-"} urzad=${data.extracted?.urzad ?? "-"}`);
        } else {
          fail++;
          const txt = await res.text().catch(() => "");
          console.log(`    [FAIL] #${attId}: ${res.status} ${txt.substring(0, 80)}`);
        }
        await new Promise((r) => setTimeout(r, 500)); // Rate limit
      } catch (e) {
        fail++;
        console.log(`    [ERROR] #${attId}: ${e.message}`);
      }
    }
    console.log(`  RE-SCRAPED: ${ok} OK, ${fail} failed`);
  }

  // =====================================================================
  // 8. Final status
  // =====================================================================
  console.log("\n--- 8. Final status for key profiles ---");
  for (const [name, fid] of [["Khoo", 52], ["Abraham", 47], ["Abramova", 223]]) {
    const empCount = await prisma.fdkEmploymentBase.count({ where: { foreignerId: fid } });
    const resCount = await prisma.fdkResidenceBasis.count({ where: { foreignerId: fid } });
    const f = await prisma.fdkForeigner.findUnique({ where: { id: fid }, select: { upoDoreczone: true } });
    console.log(`  ${name} /${fid}: ${empCount} employment, ${resCount} residence, upo=${f?.upoDoreczone?.toISOString().slice(0,10) ?? "null"}`);
  }

  if (!APPLY) console.log("\n--- DRY RUN. Użyj --apply. Dla re-scrape: --apply --rescrape ---");
  await prisma.$disconnect();
}

main().catch(console.error);
