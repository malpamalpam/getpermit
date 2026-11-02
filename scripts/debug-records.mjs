import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Abraham bases
  const abraham = await db.fdkForeigner.findUnique({
    where: { id: 47 },
    include: { employmentBases: { orderBy: { id: "asc" } } },
  });
  console.log("=== Abraham (47) ===");
  for (const b of abraham.employmentBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} dataOd=${b.dataOd?.toISOString().slice(0,10)??'null'} dataDo=${b.dataDo?.toISOString().slice(0,10)??'null'} nr=${b.nrDecyzji??b.nrOswiadczenia??'-'} stan="${b.stanowisko?.substring(0,80)??'-'}" wyn="${b.wynagrodzenie??'-'}"`);
  }

  // Hanson bases
  const hanson = await db.fdkForeigner.findUnique({
    where: { id: 280 },
    include: { employmentBases: { orderBy: { id: "asc" } } },
  });
  console.log("\n=== Hanson (280) ===");
  for (const b of hanson.employmentBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} dataOd=${b.dataOd?.toISOString().slice(0,10)??'null'} dataDo=${b.dataDo?.toISOString().slice(0,10)??'null'} nr="${b.nrDecyzji??b.nrOswiadczenia??'-'}" firma="${b.firma?.substring(0,80)??'-'}" wyn="${b.wynagrodzenie??'-'}"`);
  }

  // du Toit bases
  const dutoit = await db.fdkForeigner.findUnique({
    where: { id: 198 },
    include: { employmentBases: { orderBy: { id: "asc" } } },
  });
  console.log("\n=== du Toit (198) ===");
  for (const b of dutoit.employmentBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} dataOd=${b.dataOd?.toISOString().slice(0,10)??'null'} dataDo=${b.dataDo?.toISOString().slice(0,10)??'null'} nr="${b.nrDecyzji??'-'}"`);
  }

  // Adeosun
  const adeosun = await db.fdkForeigner.findUnique({
    where: { id: 382 },
    include: { employmentBases: { orderBy: { id: "asc" } } },
  });
  console.log("\n=== Adeosun (382) ===");
  for (const b of adeosun.employmentBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} dataOd=${b.dataOd?.toISOString().slice(0,10)??'null'} dataDo=${b.dataDo?.toISOString().slice(0,10)??'null'} wyn="${b.wynagrodzenie??'-'}"`);
  }

  // T7: salaries without unit
  const allWyn = await db.fdkEmploymentBase.findMany({ where: { wynagrodzenie: { not: null } }, include: { foreigner: true } });
  const noUnit = allWyn.filter(b => !/\/ mies\.|PLN\/h|brutto|netto|do uzupełnienia/i.test(b.wynagrodzenie));
  console.log(`\n=== Salaries without unit: ${noUnit.length} ===`);
  for (const b of noUnit) {
    console.log(`  #${b.id} ${b.foreigner.imie} ${b.foreigner.nazwisko}: "${b.wynagrodzenie}"`);
  }

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
