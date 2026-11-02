import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("=== CONNECTION ===");
  const url = process.env.DATABASE_URL || "";
  console.log("DATABASE_URL:", url.replace(/:[^:@]*@/, ":***@"));

  console.log("\n=== PODSTAWY: Gimashev (id=44) ===");
  const bases44 = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 44 } });
  for (const b of bases44) {
    console.log(JSON.stringify({
      id: b.id, typ: b.typ, nrDecyzji: b.nrDecyzji, nrOswiadczenia: b.nrOswiadczenia,
      dataOd: b.dataOd?.toISOString().slice(0, 10),
      dataDo: b.dataDo?.toISOString().slice(0, 10),
      stawka: b.stawka != null ? Number(b.stawka) : null,
      stanowisko: b.stanowisko, firma: b.firma, rodzajUmowy: b.rodzajUmowy,
    }, null, 2));
  }
  if (bases44.length === 0) console.log("(brak podstaw)");

  console.log("\n=== PODSTAWY: Meral (id=581) ===");
  const bases581 = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 581 } });
  for (const b of bases581) {
    console.log(JSON.stringify({
      id: b.id, typ: b.typ, nrDecyzji: b.nrDecyzji, nrOswiadczenia: b.nrOswiadczenia,
      dataOd: b.dataOd?.toISOString().slice(0, 10),
      dataDo: b.dataDo?.toISOString().slice(0, 10),
      stawka: b.stawka != null ? Number(b.stawka) : null,
      stanowisko: b.stanowisko, firma: b.firma,
    }, null, 2));
  }
  if (bases581.length === 0) console.log("(brak podstaw)");

  console.log("\n=== LOGI SCRAPE: id=44 i id=581 (ostatnie 10) ===");
  const logs = await db.fdkChangeLog.findMany({
    where: { foreignerId: { in: [44, 581] }, field: "scrape" },
    orderBy: { changedAt: "desc" },
    take: 10,
  });
  for (const l of logs) {
    console.log(JSON.stringify({
      foreignerId: l.foreignerId,
      changedAt: l.changedAt?.toISOString(),
      newValue: l.newValue,
    }));
  }
  if (logs.length === 0) console.log("(brak logów scrape)");

  console.log("\n=== ZAŁĄCZNIKI decyzyjne: Gimashev (id=44) ===");
  const atts44 = await db.fdkAttachment.findMany({
    where: { foreignerId: 44, nazwaPliku: { contains: "decyzja" } },
  });
  for (const a of atts44) {
    console.log(JSON.stringify({ id: a.id, nazwaPliku: a.nazwaPliku, kategoria: a.kategoria, typPliku: a.typPliku, opis: a.opis }));
  }
  if (atts44.length === 0) console.log("(brak załączników z 'decyzja' w nazwie)");

  console.log("\n=== ZAŁĄCZNIKI decyzyjne: Meral (id=581) ===");
  const atts581 = await db.fdkAttachment.findMany({
    where: { foreignerId: 581, nazwaPliku: { contains: "ecyzj" } },
  });
  for (const a of atts581) {
    console.log(JSON.stringify({ id: a.id, nazwaPliku: a.nazwaPliku, kategoria: a.kategoria, typPliku: a.typPliku, opis: a.opis }));
  }
  if (atts581.length === 0) console.log("(brak załączników z 'ecyzj' w nazwie)");

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
