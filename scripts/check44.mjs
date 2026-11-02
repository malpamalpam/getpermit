import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const bases = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 44 } });
console.log(`Gimashev (id=44) — ${bases.length} podstaw:\n`);
for (const b of bases) {
  console.log(JSON.stringify({
    id: b.id, typ: b.typ, nrDecyzji: b.nrDecyzji,
    dataOd: b.dataOd?.toISOString().slice(0, 10),
    dataDo: b.dataDo?.toISOString().slice(0, 10),
    stawka: b.stawka != null ? Number(b.stawka) : null,
    stanowisko: b.stanowisko, firma: b.firma, rodzajUmowy: b.rodzajUmowy,
  }, null, 2));
}

const logs = await db.fdkChangeLog.findMany({
  where: { foreignerId: 44, field: "scrape", newValue: { contains: "fix-gimashev" } },
  orderBy: { changedAt: "desc" }, take: 5,
});
console.log(`\nLogi fix-gimashev (${logs.length}):`);
for (const l of logs) console.log(l.newValue);

await db.$disconnect();
