import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // 1. Read base before deleting (for log)
  const base = await db.fdkEmploymentBase.findUnique({ where: { id: 2111 } });
  if (!base) { console.log("Podstawa #2111: NIE ISTNIEJE (już usunięta?)"); await db.$disconnect(); return; }
  console.log(`PRZED: #2111 foreignerId=${base.foreignerId} typ=${base.typ} status=${base.status} nr=${base.nrDecyzji}`);

  // 2. Delete the base
  await db.fdkEmploymentBase.delete({ where: { id: 2111 } });
  console.log("USUNIĘTO podstawę #2111");

  // 3. Log the deletion
  await db.fdkChangeLog.create({
    data: {
      foreignerId: 986,
      changedBy: "fix-final-kz",
      field: "delete_cudzy_dokument",
      oldValue: `#2111 ${base.typ} ${base.status} nr=${base.nrDecyzji}`,
      newValue: "USUNIĘTO — dokument SOBOLEVA_YELENA należy do profilu 985, nie 986",
    },
  });
  console.log("Wpis w historii zmian dodany.");

  // 4. Verify
  const check = await db.fdkEmploymentBase.findUnique({ where: { id: 2111 } });
  console.log(`\nSELECT potwierdzający: podstawa #2111 = ${check ? "ISTNIEJE (BŁĄD!)" : "NIE ISTNIEJE ✓"}`);

  // 5. Show remaining bases for profile 986
  const remaining = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 986 },
    select: { id: true, typ: true, status: true, nrDecyzji: true },
  });
  console.log(`\nPozostałe podstawy profilu 986:`);
  for (const b of remaining) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} nr=${b.nrDecyzji ?? "-"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
