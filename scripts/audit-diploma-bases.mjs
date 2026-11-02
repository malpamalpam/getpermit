/**
 * Audit: list all DOSTEP_DYPLOM_PL bases with foreigner name and firma (= institution name).
 * Also diagnose Regan's ghost OSWIADCZENIE and find Crooks/Afrasiyabov IDs.
 *
 * node scripts/audit-diploma-bases.mjs
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // === 1. All DOSTEP_DYPLOM_PL ===
  console.log("=== DOSTEP_DYPLOM_PL w bazie ===");
  const bases = await db.fdkEmploymentBase.findMany({
    where: { typ: "DOSTEP_DYPLOM_PL" },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true, obywatelstwo: true } } },
  });
  console.log(`Łącznie: ${bases.length}\n`);
  for (const b of bases) {
    console.log(`  #${b.id} id=${b.foreigner.id} ${b.foreigner.imie} ${b.foreigner.nazwisko} [${b.foreigner.obywatelstwo}] firma="${b.firma}" status=${b.status}`);
  }

  // === 2. Regan — find ghost OSWIADCZENIE ===
  console.log("\n=== Regan (Joseph Saul) — podstawy ===");
  const regans = await db.fdkForeigner.findMany({
    where: { nazwisko: { contains: "Regan", mode: "insensitive" } },
    include: { employmentBases: true },
  });
  for (const r of regans) {
    console.log(`\nid=${r.id} ${r.imie} ${r.nazwisko}:`);
    for (const b of r.employmentBases) {
      console.log(`  #${b.id} ${b.typ} ${b.status} ${b.dataOd?.toISOString().slice(0, 10) ?? "?"}-${b.dataDo?.toISOString().slice(0, 10) ?? "?"} nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"} stanowisko="${b.stanowisko ?? ""}" firma="${b.firma ?? ""}"`);
    }
  }

  // Check changelog for Regan's OSWIADCZENIE
  if (regans.length > 0) {
    const reganId = regans[0].id;
    const logs = await db.fdkChangeLog.findMany({
      where: { foreignerId: reganId, newValue: { contains: "wiadczeni" } },
      orderBy: { changedAt: "desc" },
      take: 5,
    });
    console.log(`\nLogi scrape z "oświadczenie" (id=${reganId}):`);
    for (const l of logs) {
      console.log(`  ${l.changedAt?.toISOString().slice(0, 19)} [${l.changedBy}] ${l.newValue?.substring(0, 150)}`);
    }
  }

  // === 3. Find Crooks and Afrasiyabov ===
  console.log("\n=== Crooks ===");
  const crooks = await db.fdkForeigner.findMany({
    where: { nazwisko: { contains: "Crooks", mode: "insensitive" } },
    include: { employmentBases: true },
  });
  for (const c of crooks) {
    console.log(`id=${c.id} ${c.imie} ${c.nazwisko}:`);
    for (const b of c.employmentBases) {
      console.log(`  #${b.id} ${b.typ} ${b.status} stawka=${b.stawka != null ? Number(b.stawka) : "-"} rodzajUmowy="${b.rodzajUmowy ?? ""}" stanowisko="${b.stanowisko ?? ""}"`);
    }
  }

  console.log("\n=== Afrasiyabov ===");
  const afras = await db.fdkForeigner.findMany({
    where: { nazwisko: { contains: "Afrasiyabov", mode: "insensitive" } },
    include: { employmentBases: true },
  });
  for (const a of afras) {
    console.log(`id=${a.id} ${a.imie} ${a.nazwisko}:`);
    for (const b of a.employmentBases) {
      console.log(`  #${b.id} ${b.typ} ${b.status} stawka=${b.stawka != null ? Number(b.stawka) : "-"} rodzajUmowy="${b.rodzajUmowy ?? ""}" stanowisko="${b.stanowisko ?? ""}"`);
    }
  }

  // === 4. Abramova ===
  console.log("\n=== Abramova (id=223) ===");
  const abr = await db.fdkForeigner.findUnique({
    where: { id: 223 },
    include: { employmentBases: { orderBy: { dataOd: "desc" } } },
  });
  if (abr) {
    console.log(`${abr.imie} ${abr.nazwisko}:`);
    for (const b of abr.employmentBases) {
      console.log(`  #${b.id} ${b.typ} ${b.status} ${b.dataOd?.toISOString().slice(0, 10) ?? "?"}-${b.dataDo?.toISOString().slice(0, 10) ?? "?"} stanowisko="${b.stanowisko ?? ""}" firma="${b.firma ?? ""}"`);
    }
  }

  // === 5. Count ZGLOSZENIE_UA with multiple AKTYWNE per person ===
  console.log("\n=== Osoby z >1 AKTYWNE ZGLOSZENIE_UA ===");
  const allF = await db.fdkForeigner.findMany({
    include: { employmentBases: true },
  });
  let multiUA = 0;
  for (const f of allF) {
    const activeUA = f.employmentBases.filter((b) => b.typ === "ZGLOSZENIE_UA" && (b.status === "AKTYWNE" || b.status === "BRAK_DANYCH"));
    if (activeUA.length > 1) {
      multiUA++;
      if (multiUA <= 10) {
        console.log(`  id=${f.id} ${f.imie} ${f.nazwisko}: ${activeUA.length} aktywnych UA`);
      }
    }
  }
  console.log(`Łącznie osób z >1 aktywne ZGLOSZENIE_UA: ${multiUA}`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
