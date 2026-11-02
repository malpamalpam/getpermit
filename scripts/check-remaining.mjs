import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function show(id, name) {
  const f = await db.fdkForeigner.findUnique({
    where: { id },
    include: { employmentBases: { orderBy: { dataOd: "desc" } } },
  });
  console.log(`\n=== ${name} (id=${id}) ===`);
  for (const b of f.employmentBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} stawka=${b.stawka != null ? Number(b.stawka) : "-"} rodzaj="${b.rodzajUmowy ?? ""}" stan="${(b.stanowisko ?? "").substring(0, 50)}" od=${b.dataOd?.toISOString().slice(0, 10) ?? "?"} do=${b.dataDo?.toISOString().slice(0, 10) ?? "?"}`);
  }
}

// Afrasiyabov
await show(211, "Afrasiyabov");
// Abrahimovich
const abr = await db.fdkForeigner.findMany({ where: { nazwisko: { contains: "Abrahimovich", mode: "insensitive" } } });
for (const a of abr) await show(a.id, `Abrahimovich ${a.imie}`);
// Abramchuk
const abc = await db.fdkForeigner.findMany({ where: { nazwisko: { contains: "Abramchuk", mode: "insensitive" } } });
for (const a of abc) await show(a.id, `Abramchuk ${a.imie}`);
// Abramova #300 still exists?
const osw300 = await db.fdkEmploymentBase.findUnique({ where: { id: 300 } });
console.log(`\n#300 Abramova OŚW paszportowe: ${osw300 ? `EXISTS ${osw300.typ} ${osw300.status}` : "USUNIĘTE"}`);

// Nr paszportu w polach
const bases314 = await db.fdkEmploymentBase.findUnique({ where: { id: 314 } });
const bases1211 = await db.fdkEmploymentBase.findUnique({ where: { id: 1211 } });
console.log(`\n#314 Abubakarov paszport w polach: ${bases314 ? `${bases314.typ} ${bases314.status} nrOsw="${bases314.nrOswiadczenia}"` : "USUNIĘTE"}`);
console.log(`#1211 Habyshava paszport w polach: ${bases1211 ? `${bases1211.typ} ${bases1211.status} nrDecyzji="${bases1211.nrDecyzji}"` : "USUNIĘTE"}`);

await db.$disconnect();
