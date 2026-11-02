import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const bases = await db.fdkEmploymentBase.findMany({
  where: { foreignerId: 223, typ: "ZGLOSZENIE_UA" },
  orderBy: { dataOd: "desc" },
});

console.log(`Abramova (223) — ZGLOSZENIE_UA: ${bases.length}`);
for (const b of bases) {
  console.log(`  #${b.id} status_DB="${b.status}" dataOd=${b.dataOd?.toISOString().slice(0,10) ?? "?"} dataDo=${b.dataDo?.toISOString().slice(0,10) ?? "brak"}`);
}

// How many are AKTYWNE in DB right now?
const aktywne = bases.filter(b => b.status === "AKTYWNE");
const nieaktywne = bases.filter(b => b.status === "NIEAKTYWNE");
console.log(`\nAKTYWNE: ${aktywne.length}, NIEAKTYWNE: ${nieaktywne.length}`);

// The problem: withComputedStatuses recalculates status from dates.
// ZGLOSZENIE_UA with dataOd in past and no dataDo → computeStatus returns AKTYWNE
// even if we set status=NIEAKTYWNE in DB.
// Fix: computeStatus must preserve NIEAKTYWNE when it was explicitly set.

await db.$disconnect();
