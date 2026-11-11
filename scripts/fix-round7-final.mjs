/**
 * Round 7 final fixes — targeted record corrections.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`=== FINAL FIXES — ${APPLY ? "APPLY" : "DRY RUN"} ===\n`);

  // 1. Delete Khoo emp #3754 (FRAME TIME — not FDK employer)
  console.log("1. Delete Khoo emp #3754 (Frame Time — not FDK)");
  const b3754 = await db.fdkEmploymentBase.findUnique({ where: { id: 3754 } });
  if (b3754) {
    console.log(`   Found: ${b3754.typ} firma="${b3754.firma}" nr=${b3754.nrDecyzji}`);
    if (APPLY) { await db.fdkEmploymentBase.delete({ where: { id: 3754 } }); console.log("   DELETED"); }
  }

  // 2. Delete Khoo residence #218 (created from att #7050 which is a WP, not TRC)
  //    and residence #62 (nr=440000/... is a contract number)
  console.log("\n2. Delete bad Khoo residence bases #218, #62");
  for (const id of [218, 62]) {
    const r = await db.fdkResidenceBasis.findUnique({ where: { id } });
    if (r) {
      console.log(`   #${id}: ${r.typ} ${r.dataOd?.toISOString().slice(0,10) ?? "-"} — ${r.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${r.nrDecyzji ?? "-"}`);
      if (APPLY) { await db.fdkResidenceBasis.delete({ where: { id } }); console.log("   DELETED"); }
    }
  }

  // 3. Fix att #7027 — restore detectedType to TRC_FDK (nulled by re-scrape side effect)
  console.log("\n3. Fix att #7027 detectedType → TRC_FDK");
  if (APPLY) {
    await db.fdkAttachment.update({ where: { id: 7027 }, data: { detectedType: "TRC_FDK" } });
    console.log("   UPDATED");
  }

  // 4. Fix att #7050 — should be ZEZWOLENIE_A not TRC_FDK (two copies of same WP, different scan)
  console.log("\n4. Fix att #7050 detectedType → ZEZWOLENIE_A");
  if (APPLY) {
    await db.fdkAttachment.update({ where: { id: 7050 }, data: { detectedType: "ZEZWOLENIE_A" } });
    console.log("   UPDATED");
  }

  // 5. Fix Khoo emp #2520 — re-scrape set status to NIEAKTYWNE, should be computed from dates
  //    Just clear the manual override so withComputedStatuses recalculates
  console.log("\n5. Fix Khoo emp #2520 status → BRAK_DANYCH (will recompute to AKTYWNE from dates)");
  const b2520 = await db.fdkEmploymentBase.findUnique({ where: { id: 2520 } });
  if (b2520) {
    console.log(`   Current: status=${b2520.status} dataDo=${b2520.dataDo?.toISOString().slice(0,10)}`);
    if (APPLY) {
      await db.fdkEmploymentBase.update({ where: { id: 2520 }, data: { status: "BRAK_DANYCH" } });
      console.log("   SET to BRAK_DANYCH (recomputes to AKTYWNE since dataDo=2029)");
    }
  }

  // 6. Fix Khoo emp #2520 firma — strip address, keep only name
  console.log("\n6. Fix Khoo emp #2520 firma — strip address");
  if (b2520 && b2520.firma && b2520.firma.includes(", ul")) {
    const cleanFirma = b2520.firma.split(", ul")[0].trim();
    console.log(`   "${b2520.firma}" → "${cleanFirma}"`);
    if (APPLY) {
      await db.fdkEmploymentBase.update({ where: { id: 2520 }, data: { firma: cleanFirma } });
    }
  }
  // Same for #3514
  const b3514 = await db.fdkEmploymentBase.findUnique({ where: { id: 3514 } });
  if (b3514 && b3514.firma && b3514.firma.includes(", ul")) {
    const cleanFirma = b3514.firma.split(", ul")[0].trim();
    console.log(`   #3514: "${b3514.firma}" → "${cleanFirma}"`);
    if (APPLY) {
      await db.fdkEmploymentBase.update({ where: { id: 3514 }, data: { firma: cleanFirma } });
    }
  }

  // 7. Bulk: strip address from firma across all employment bases
  console.log("\n7. Bulk: clean firma addresses (', ul.' → trim)");
  const withAddr = await db.fdkEmploymentBase.findMany({
    where: { firma: { contains: ", ul" } },
    select: { id: true, firma: true },
  });
  console.log(`   Records with address in firma: ${withAddr.length}`);
  if (APPLY) {
    for (const b of withAddr) {
      const clean = b.firma.split(/,\s*ul[.\s]/i)[0].trim();
      if (clean !== b.firma) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { firma: clean } });
      }
    }
    console.log("   UPDATED");
  }

  // 8. Final check
  console.log("\n=== Final Khoo /52 ===");
  const khooEmp = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 52 }, orderBy: { dataOd: "desc" } });
  for (const b of khooEmp) {
    console.log(`  emp #${b.id} ${b.typ} ${b.status} ${b.dataOd?.toISOString().slice(0,10) ?? "-"} — ${b.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${b.nrDecyzji ?? "-"} stan="${b.stanowisko?.substring(0,40) ?? "-"}" firma="${b.firma?.substring(0,30) ?? "-"}"`);
  }
  const khooRes = await db.fdkResidenceBasis.findMany({ where: { foreignerId: 52 }, orderBy: { dataOd: "desc" } });
  console.log("");
  for (const r of khooRes) {
    console.log(`  res #${r.id} ${r.typ} ${r.status} ${r.dataOd?.toISOString().slice(0,10) ?? "-"} — ${r.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${r.nrDecyzji ?? "-"} karta=${r.nrKartyPobytu ?? "-"} urzad=${r.urzad ?? "-"}`);
  }

  if (!APPLY) console.log("\n--- DRY RUN. Użyj --apply. ---");
  await db.$disconnect();
}

main().catch(console.error);
