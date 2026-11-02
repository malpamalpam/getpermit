import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function showBases(id, name) {
  const f = await db.fdkForeigner.findUnique({
    where: { id },
    include: { employmentBases: { orderBy: { dataOd: "desc" } } },
  });
  console.log(`\n=== ${name} (id=${id}) ===`);
  for (const b of f.employmentBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} stawka=${b.stawka != null ? Number(b.stawka) : "-"} rodzajUmowy="${b.rodzajUmowy ?? ""}" stanowisko="${(b.stanowisko ?? "").substring(0, 60)}" dataOd=${b.dataOd?.toISOString().slice(0, 10) ?? "?"} firma="${(b.firma ?? "").substring(0, 40)}"`);
  }
}

// Check DOSTEP_DYPLOM_PL for Burak and Morozov
console.log("=== DOSTEP_DYPLOM_PL: Burak (174) i Morozov (28) ===");
const burak = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 174, typ: "DOSTEP_DYPLOM_PL" } });
const morozov = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 28, typ: "DOSTEP_DYPLOM_PL" } });
console.log(`Burak (174): ${burak.length} DOSTEP_DYPLOM_PL ${burak.map(b => `#${b.id} ${b.status}`).join(", ") || "BRAK"}`);
console.log(`Morozov (28): ${morozov.length} DOSTEP_DYPLOM_PL ${morozov.map(b => `#${b.id} ${b.status}`).join(", ") || "BRAK"}`);

// All DOSTEP_DYPLOM_PL
const allDyplom = await db.fdkEmploymentBase.findMany({ where: { typ: "DOSTEP_DYPLOM_PL" } });
console.log(`\nŁącznie DOSTEP_DYPLOM_PL w bazie: ${allDyplom.length}`);
for (const b of allDyplom) {
  const f = await db.fdkForeigner.findUnique({ where: { id: b.foreignerId }, select: { imie: true, nazwisko: true } });
  console.log(`  #${b.id} id=${b.foreignerId} ${f.imie} ${f.nazwisko} status=${b.status} firma="${b.firma}"`);
}

await showBases(223, "Abramova");
await showBases(175, "Regan");
await showBases(183, "Crooks");

await db.$disconnect();
