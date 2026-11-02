import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const f = await db.fdkForeigner.findUnique({
    where: { id: 412 },
    select: { id: true, imie: true, nazwisko: true, decyzjaPobytowaDo: true, typDokumentuPobytowego: true },
  });
  console.log(`Profil 412: ${f.imie} ${f.nazwisko}`);
  console.log(`  decyzjaPobytowaDo: ${f.decyzjaPobytowaDo?.toISOString().slice(0,10) ?? "null"}`);
  console.log(`  typDokumentuPobytowego: "${f.typDokumentuPobytowego ?? "null"}"`);

  const bases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 412, status: "AKTYWNE" },
    select: { id: true, typ: true, status: true, dataOd: true, dataDo: true, nrDecyzji: true },
  });
  console.log(`\nAktywne podstawy:`);
  for (const b of bases) {
    console.log(`  #${b.id} ${b.typ} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? "-"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
