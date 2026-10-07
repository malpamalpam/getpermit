import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const CHANGED_BY = "fix-633-nichols";

async function main() {
  console.log("=== Profil 633 (Joseph Nichols) — cleanup ===\n");

  // Delete fake OSWIADCZENIE #3405 and fake TRC_FDK #3406
  for (const id of [3405, 3406]) {
    const b = await db.fdkEmploymentBase.findUnique({ where: { id } });
    if (!b || b.foreignerId !== 633) { console.log(`  #${id}: nie istnieje lub nie należy do 633`); continue; }
    console.log(`  USUWAM #${id} ${b.typ} status=${b.status} (nigdy nie miał tego dokumentu)`);
    await db.fdkEmploymentBase.delete({ where: { id } });
    await db.fdkChangeLog.create({
      data: {
        foreignerId: 633, changedBy: CHANGED_BY,
        field: "delete_false_base",
        oldValue: `#${id} ${b.typ} ${b.status}`,
        newValue: "USUNIĘTO — obywatel USA, nigdy nie miał TRC ani oświadczenia",
      },
    });
  }

  // Show final state
  console.log("\n=== Stan końcowy ===\n");
  const bases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 633 },
    orderBy: { id: "asc" },
    select: { id: true, typ: true, status: true, dataOd: true, dataDo: true },
  });
  for (const b of bases) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
