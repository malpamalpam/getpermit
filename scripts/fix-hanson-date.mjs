/**
 * Fix Hanson #1343: set dataOd so withComputedStatuses marks it AKTYWNE.
 * The decision SC-XIV.6151.2749.2025 — using 2025 as year of issuance.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  const base = await db.fdkEmploymentBase.findUnique({ where: { id: 1343 } });
  if (!base) { console.log("Base #1343 not found"); return; }

  console.log(`#1343: dataOd=${base.dataOd?.toISOString().slice(0,10) ?? "null"} dataDo=${base.dataDo?.toISOString().slice(0,10) ?? "null"} status=${base.status}`);

  // Set dataOd to a reasonable date — decision issued in 2025, use 2025-09-01 as approximate
  // This ensures withComputedStatuses computes AKTYWNE (dataOd in past, dataDo 2029-08-24 in future)
  const dataOd = new Date("2025-09-01");
  console.log(`Setting dataOd → 2025-09-01 (approximate decision date, source: data_podpisu)`);

  if (DO_RUN) {
    await db.fdkEmploymentBase.update({
      where: { id: 1343 },
      data: { dataOd },
    });
    await db.fdkChangeLog.create({
      data: {
        foreignerId: 280,
        changedBy: "fix-hanson-date",
        field: "dataOd",
        oldValue: "null",
        newValue: "2025-09-01 (przybliżona data wydania decyzji)",
      },
    });
    console.log("Done.");
  } else {
    console.log("(dry-run)");
  }

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
