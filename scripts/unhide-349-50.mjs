import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  for (const id of [349, 50]) {
    const f = await db.fdkForeigner.findUnique({ where: { id }, select: { id: true, imie: true, nazwisko: true, hidden: true } });
    if (!f) continue;
    console.log(`Profil ${id} (${f.imie ?? ""} ${f.nazwisko}): hidden=${f.hidden} → false`);
    await db.fdkForeigner.update({ where: { id }, data: { hidden: false } });
    await db.fdkChangeLog.create({
      data: { foreignerId: id, changedBy: "fix-final-kz", field: "hidden", oldValue: "true", newValue: "false (odkryty na żądanie)" },
    });
  }
  console.log("Gotowe.");
  await db.$disconnect();
}
main().catch(console.error);
