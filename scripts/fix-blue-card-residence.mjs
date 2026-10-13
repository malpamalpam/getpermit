/**
 * Fix: find all profiles where employment base is TRC_BLUE_CARD
 * but matching residence base is TRC_FDK → fix to TRC_BLUE_CARD.
 *
 * Also directly fix Morozov #28 residence by sygnatura.
 *
 * Usage:
 *   node scripts/fix-blue-card-residence.mjs          # dry-run
 *   node scripts/fix-blue-card-residence.mjs --apply  # apply
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const CHANGED_BY = "fix-blue-card-residence";

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  // Find all TRC_BLUE_CARD employment bases with nrDecyzji
  const blueCardEmp = await db.fdkEmploymentBase.findMany({
    where: { typ: "TRC_BLUE_CARD", nrDecyzji: { not: null } },
    select: { id: true, foreignerId: true, nrDecyzji: true, firma: true },
  });

  console.log(`Znaleziono ${blueCardEmp.length} podstaw zatrudnienia TRC_BLUE_CARD z nrDecyzji\n`);

  let fixed = 0;

  for (const emp of blueCardEmp) {
    // Find matching residence base with same nrDecyzji but wrong type
    const wrongRes = await db.fdkResidenceBasis.findMany({
      where: {
        foreignerId: emp.foreignerId,
        nrDecyzji: emp.nrDecyzji,
        typ: { not: "TRC_BLUE_CARD" },
      },
    });

    if (wrongRes.length === 0) continue;

    const foreigner = await db.fdkForeigner.findUnique({
      where: { id: emp.foreignerId },
      select: { nazwisko: true, imie: true },
    });
    const name = `${foreigner?.nazwisko} ${foreigner?.imie || ""}`.trim();

    for (const rb of wrongRes) {
      console.log(`  [FIX] ${name} (ID ${emp.foreignerId}) residence #${rb.id}: ${rb.typ} → TRC_BLUE_CARD (${rb.nrDecyzji})`);
      fixed++;

      if (APPLY) {
        await db.fdkResidenceBasis.update({
          where: { id: rb.id },
          data: { typ: "TRC_BLUE_CARD" },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: emp.foreignerId,
            changedBy: CHANGED_BY,
            field: "res_blue_card_fix",
            oldValue: `#${rb.id} ${rb.typ}`,
            newValue: `TRC_BLUE_CARD (sygnatura ${rb.nrDecyzji}, emp #${emp.id})`,
          },
        });
      }
    }
  }

  // Also check employment bases with wrong residence (by same sourceAttachmentId)
  const blueCardEmpAll = await db.fdkEmploymentBase.findMany({
    where: { typ: "TRC_BLUE_CARD", sourceAttachmentId: { not: null } },
    select: { id: true, foreignerId: true, sourceAttachmentId: true, nrDecyzji: true },
  });

  for (const emp of blueCardEmpAll) {
    const wrongRes = await db.fdkResidenceBasis.findMany({
      where: {
        foreignerId: emp.foreignerId,
        sourceAttachmentId: emp.sourceAttachmentId,
        typ: { not: "TRC_BLUE_CARD" },
      },
    });

    for (const rb of wrongRes) {
      const foreigner = await db.fdkForeigner.findUnique({
        where: { id: emp.foreignerId },
        select: { nazwisko: true, imie: true },
      });
      const name = `${foreigner?.nazwisko} ${foreigner?.imie || ""}`.trim();
      console.log(`  [FIX src] ${name} (ID ${emp.foreignerId}) residence #${rb.id}: ${rb.typ} → TRC_BLUE_CARD (srcAtt ${emp.sourceAttachmentId})`);
      fixed++;

      if (APPLY) {
        await db.fdkResidenceBasis.update({
          where: { id: rb.id },
          data: { typ: "TRC_BLUE_CARD" },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: emp.foreignerId,
            changedBy: CHANGED_BY,
            field: "res_blue_card_fix",
            oldValue: `#${rb.id} ${rb.typ}`,
            newValue: `TRC_BLUE_CARD (srcAtt ${emp.sourceAttachmentId})`,
          },
        });
      }
    }
  }

  console.log(`\nPoprawione: ${fixed}`);
  if (!APPLY && fixed > 0) console.log("Uruchom z --apply żeby zastosować.");
}

main().catch(console.error).finally(() => db.$disconnect());
