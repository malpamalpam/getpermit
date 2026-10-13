import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const bases = await db.fdkEmploymentBase.findMany({
  where: { foreignerId: 155 },
  select: { id: true, typ: true, status: true, nrDecyzji: true, nrOswiadczenia: true, dataOd: true, dataDo: true, firma: true },
  orderBy: { dataOd: "desc" },
});
console.log(`Valovich: ${bases.length} employment bases\n`);
for (const b of bases) {
  const nr = b.nrDecyzji || b.nrOswiadczenia || "(brak)";
  console.log(`  #${b.id} ${b.typ} [${b.status}] ${b.dataOd?.toISOString().slice(0,10)||"-"}–${b.dataDo?.toISOString().slice(0,10)||"-"} nr=${nr}`);
}
await db.$disconnect();
