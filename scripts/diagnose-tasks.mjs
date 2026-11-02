/**
 * Diagnostyka dla 5 zadań panelowych.
 * node scripts/diagnose-tasks.mjs
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // === TASK 1: Antonava (id=277) — stan pobytowy ===
  console.log("=== TASK 1: Antonava (id=277) ===");
  const ant = await db.fdkForeigner.findUnique({
    where: { id: 277 },
    select: {
      imie: true, nazwisko: true,
      decyzjaPobytowaDo: true, wizaDo: true,
      upoDoreczone: true, upoUwagi: true,
      ochronaCzasowaUkr: true,
    },
  });
  if (ant) {
    console.log(JSON.stringify(ant, null, 2));
    const now = new Date();
    console.log(`decyzjaPobytowaDo wygasła: ${ant.decyzjaPobytowaDo ? ant.decyzjaPobytowaDo < now : "brak"}`);
    console.log(`upoDoreczone: ${ant.upoDoreczone ? ant.upoDoreczone.toISOString().slice(0, 10) : "brak"}`);
  }

  // === TASK 2: Czy ktokolwiek ma dane w FdkDetailedDocument? ===
  console.log("\n=== TASK 2: FdkDetailedDocument — ile rekordów? ===");
  const docCount = await db.fdkDetailedDocument.count();
  console.log(`Łącznie rekordów: ${docCount}`);
  if (docCount > 0) {
    const docs = await db.fdkDetailedDocument.findMany({
      take: 10,
      include: { foreigner: { select: { imie: true, nazwisko: true } } },
    });
    console.log("Przykładowe:");
    for (const d of docs) {
      console.log(`  id=${d.id} foreigner=${d.foreigner.imie} ${d.foreigner.nazwisko} typ=${d.typDokumentu} dane=${JSON.stringify(d.dane).substring(0, 100)}`);
    }
    // Count per foreigner
    const perForeigner = await db.fdkDetailedDocument.groupBy({
      by: ["foreignerId"],
      _count: true,
    });
    console.log(`Osoby z dokumentami: ${perForeigner.length}`);
  }

  // === TASK 4: Pliki z "dyplom/diploma" w nazwie ===
  console.log("\n=== TASK 4: Pliki dyplomowe w kartotekach ===");
  const diplomas = await db.fdkAttachment.findMany({
    where: {
      OR: [
        { nazwaPliku: { contains: "dyplom", mode: "insensitive" } },
        { nazwaPliku: { contains: "diploma", mode: "insensitive" } },
      ],
    },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });
  console.log(`Plików z "dyplom/diploma": ${diplomas.length}`);
  // Group by person
  const byPerson = {};
  for (const d of diplomas) {
    const key = `${d.foreigner.id}:${d.foreigner.imie} ${d.foreigner.nazwisko}`;
    if (!byPerson[key]) byPerson[key] = [];
    byPerson[key].push(d.nazwaPliku);
  }
  console.log(`Osób z dyplomami: ${Object.keys(byPerson).length}`);
  // Show first 10
  let shown = 0;
  for (const [key, files] of Object.entries(byPerson)) {
    if (shown++ >= 10) break;
    console.log(`  ${key}: ${files.join(", ").substring(0, 120)}`);
  }

  // === TASK 5: Abraham (id=47) — stan podstaw ===
  console.log("\n=== TASK 5: Abraham (id=47) ===");
  const abBases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 47 },
    orderBy: { dataDo: "desc" },
  });
  console.log(`Podstaw: ${abBases.length}`);
  for (const b of abBases) {
    console.log(`  #${b.id} ${b.typ} ${b.status} ${b.dataOd?.toISOString().slice(0, 10) ?? "?"}-${b.dataDo?.toISOString().slice(0, 10) ?? "?"} nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"}`);
  }

  // Global stats: how many foreigners have >3 AKTYWNE bases?
  console.log("\n=== TASK 5: Osoby z >3 AKTYWNE podstawami ===");
  const allForeigners = await db.fdkForeigner.findMany({
    include: { employmentBases: true },
  });
  let manyActive = 0;
  for (const f of allForeigners) {
    const active = f.employmentBases.filter((b) => b.status === "AKTYWNE" || b.status === "BRAK_DANYCH");
    if (active.length > 3) {
      manyActive++;
      if (manyActive <= 5) {
        console.log(`  ${f.imie} ${f.nazwisko} (id=${f.id}): ${active.length} aktywnych`);
      }
    }
  }
  console.log(`Łącznie osób z >3 aktywnych: ${manyActive}`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
