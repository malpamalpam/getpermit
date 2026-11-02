/**
 * Remove junk employment bases for Gimashev (id=44):
 * #941, #942, #943 — dataOd is 1994 (birth date), duplicate garbage stanowisko
 *
 * Usage:
 *   node scripts/cleanup-gimashev.mjs          # dry run
 *   node scripts/cleanup-gimashev.mjs --apply  # delete
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DO_APPLY = process.argv.includes("--apply");

const JUNK_IDS = [941, 942, 943];

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DRY RUN"}\n`);

  for (const id of JUNK_IDS) {
    const base = await db.fdkEmploymentBase.findUnique({ where: { id } });
    if (!base) {
      console.log(`#${id} — nie znaleziono (już usunięta?)`);
      continue;
    }
    console.log(`#${id}: typ=${base.typ} dataOd=${base.dataOd?.toISOString().slice(0, 10)} dataDo=${base.dataDo?.toISOString().slice(0, 10)} stanowisko="${base.stanowisko?.substring(0, 60)}..."`);

    if (DO_APPLY) {
      await db.fdkEmploymentBase.delete({ where: { id } });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: 44,
          changedBy: "cleanup-gimashev",
          field: "scrape",
          oldValue: `Usunięto śmieciową podstawę #${id}`,
          newValue: `Usunięto podstawę #${id} (${base.typ}, dataOd=${base.dataOd?.toISOString().slice(0, 10)}) — fałszywe dane (data urodzenia jako dataOd, zduplikowane stanowisko)`,
        },
      });
      console.log(`  → USUNIĘTA`);
    }
  }

  if (DO_APPLY) {
    console.log("\nPo czyszczeniu:");
    const remaining = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 44 } });
    for (const b of remaining) {
      console.log(JSON.stringify({
        id: b.id, typ: b.typ, nrDecyzji: b.nrDecyzji,
        dataOd: b.dataOd?.toISOString().slice(0, 10),
        dataDo: b.dataDo?.toISOString().slice(0, 10),
        stawka: b.stawka != null ? Number(b.stawka) : null,
      }));
    }
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
