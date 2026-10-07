import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const CHANGED_BY = "fix-633-nichols-v2";

async function main() {
  console.log("=== Profil 633 (Nichols) — usunięcie TRC + dedup powiadomień ===\n");

  // 1. Delete fake TRC #1232
  const trc = await db.fdkEmploymentBase.findUnique({ where: { id: 1232 } });
  if (trc && trc.foreignerId === 633) {
    console.log(`  USUWAM #1232 ${trc.typ} (nigdy nie miał TRC)`);
    await db.fdkEmploymentBase.delete({ where: { id: 1232 } });
    await db.fdkChangeLog.create({
      data: { foreignerId: 633, changedBy: CHANGED_BY, field: "delete_false_base",
        oldValue: `#1232 ${trc.typ} ${trc.status}`, newValue: "USUNIĘTO — nigdy nie miał TRC" },
    });
  }

  // 2. Dedup powiadomień: zachowaj najnowsze aktywne (#3403 od 2026-10-02), usuń resztę
  const keep = 3403;
  const toDelete = [3257, 3258, 3260, 3404]; // duplikaty i puste
  for (const id of toDelete) {
    const b = await db.fdkEmploymentBase.findUnique({ where: { id } });
    if (!b || b.foreignerId !== 633) continue;
    console.log(`  USUWAM #${id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} (duplikat/pusty)`);
    await db.fdkEmploymentBase.delete({ where: { id } });
  }

  // 3. Update #3403 to AKTYWNE (najnowsze powiadomienie)
  await db.fdkEmploymentBase.update({
    where: { id: 3403 },
    data: { status: "AKTYWNE" },
  });
  console.log(`  #3403 POWIADOMIENIE_UA → AKTYWNE`);

  // 4. Keep #3259 ZGLOSZENIE_UA as NIEAKTYWNE (historical)
  console.log(`  #3259 ZGLOSZENIE_UA — zachowane jako NIEAKTYWNE (historyczne)`);

  await db.fdkChangeLog.create({
    data: { foreignerId: 633, changedBy: CHANGED_BY, field: "dedup_cleanup",
      oldValue: "7 podstaw (1 TRC, 4 duplikaty powiadomień)",
      newValue: "Zachowano #3403 POWIADOMIENIE_UA AKTYWNE + #3259 ZGLOSZENIE_UA NIEAKTYWNE" },
  });

  // Show final
  console.log("\n=== Stan końcowy ===\n");
  const bases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 633 }, orderBy: { id: "asc" },
    select: { id: true, typ: true, status: true, dataOd: true, dataDo: true },
  });
  for (const b of bases) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
