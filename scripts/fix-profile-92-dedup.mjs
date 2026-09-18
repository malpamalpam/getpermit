/**
 * Skrypt: naprawa profilu 92 — usunięcie duplikatu TRC_FDK BRAK_DANYCH.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-profile-92-dedup.mjs
 *   node --env-file=.env.local scripts/fix-profile-92-dedup.mjs --run
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-profile-92-dedup";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`=== Fix profil 92 — dedupe (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const bases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 92 },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Wszystkie podstawy profilu 92 (${bases.length}):\n`);
  for (const b of bases) {
    console.log(`  [${b.id}] typ=${b.typ} status=${b.status} nrDecyzji=${b.nrDecyzji ?? "BRAK"} dataOd=${b.dataOd?.toISOString().slice(0,10) ?? "BRAK"} dataDo=${b.dataDo?.toISOString().slice(0,10) ?? "BRAK"} firma=${(b.firma ?? "").substring(0, 40)}`);
  }

  // Szukamy duplikatów TRC_FDK/KARTA_POBYTU z BRAK_DANYCH i bez dat
  const trcBases = bases.filter(b => b.typ === "TRC_FDK" || b.typ === "KARTA_POBYTU");
  const dupsToDelete = trcBases.filter(b => b.status === "BRAK_DANYCH" && !b.dataOd && !b.dataDo);
  const goodBases = trcBases.filter(b => b.dataOd || b.dataDo || b.status !== "BRAK_DANYCH");

  console.log(`\nTRC/KP podstawy: ${trcBases.length}`);
  console.log(`  Dobre (z datami/statusem): ${goodBases.length}`);
  console.log(`  Duplikaty BRAK_DANYCH bez dat: ${dupsToDelete.length}`);

  for (const dup of dupsToDelete) {
    console.log(`\n  USUŃ #${dup.id}: typ=${dup.typ} nrDecyzji=${dup.nrDecyzji ?? "BRAK"} firma=${(dup.firma ?? "").substring(0, 60)}`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.delete({ where: { id: dup.id } });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: 92,
          changedBy: CHANGED_BY,
          field: "employment_base_dedup",
          oldValue: `#${dup.id} ${dup.typ} BRAK_DANYCH nrDecyzji=${dup.nrDecyzji}`,
          newValue: `Usunięty duplikat bez dat`,
        },
      });
      console.log(`  → Usunięto.`);
    }
  }

  console.log(`\n=== Gotowe ===`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
