/**
 * Diagnoza: Abramova (223) — oświadczenie z danych paszportowych
 * + audit wszystkich OSWIADCZENIE w bazie pod kątem anomalii
 *
 * node scripts/diagnose-abramova-osw.mjs
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // === 1. Abramova — wszystkie podstawy z logami ===
  console.log("=== ABRAMOVA (id=223) — wszystkie podstawy ===\n");
  const abr = await db.fdkForeigner.findUnique({
    where: { id: 223 },
    select: { imie: true, nazwisko: true, dataUrodzenia: true, obywatelstwo: true, nrPaszportu: true },
  });
  console.log(`Profil: ${abr.imie} ${abr.nazwisko}, ur. ${abr.dataUrodzenia?.toISOString().slice(0, 10)}, obyw: ${abr.obywatelstwo}, paszport: ${abr.nrPaszportu}\n`);

  const bases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 223 },
    orderBy: { dataOd: "desc" },
  });

  for (const b of bases) {
    console.log(`#${b.id} ${b.typ} ${b.status}`);
    console.log(`  dataOd=${b.dataOd?.toISOString().slice(0, 10) ?? "?"} dataDo=${b.dataDo?.toISOString().slice(0, 10) ?? "?"}`);
    console.log(`  nrDecyzji="${b.nrDecyzji ?? ""}" nrOswiadczenia="${b.nrOswiadczenia ?? ""}"`);
    console.log(`  stanowisko="${(b.stanowisko ?? "").substring(0, 80)}"`);
    console.log(`  firma="${(b.firma ?? "").substring(0, 60)}"`);
    console.log(`  stawka=${b.stawka != null ? Number(b.stawka) : "-"} rodzajUmowy="${b.rodzajUmowy ?? ""}"`);
    console.log();
  }

  // Logi scrape dla Abramovej — skąd wzięło się oświadczenie
  console.log("=== LOGI SCRAPE Abramova ===\n");
  const logs = await db.fdkChangeLog.findMany({
    where: { foreignerId: 223, field: "scrape" },
    orderBy: { changedAt: "desc" },
    take: 20,
  });
  for (const l of logs) {
    console.log(`${l.changedAt?.toISOString().slice(0, 19)} [${l.changedBy}]: ${l.newValue?.substring(0, 150)}`);
  }

  // === 2. Audit: OSWIADCZENIE z podejrzanymi danymi ===
  console.log("\n=== AUDIT: OSWIADCZENIE z anomaliami ===\n");

  const allOsw = await db.fdkEmploymentBase.findMany({
    where: { typ: "OSWIADCZENIE" },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true, dataUrodzenia: true } } },
  });

  const anomalies = [];

  for (const b of allOsw) {
    const issues = [];

    // 1. dataOd wygląda jak data urodzenia
    if (b.foreigner.dataUrodzenia && b.dataOd) {
      const birthStr = b.foreigner.dataUrodzenia.toISOString().slice(0, 10);
      const odStr = b.dataOd.toISOString().slice(0, 10);
      if (birthStr === odStr) {
        issues.push("dataOd = data urodzenia");
      }
    }

    // 2. dataOd przed 2010 (podejrzane dla oświadczenia)
    if (b.dataOd && b.dataOd.getFullYear() < 2010) {
      issues.push(`dataOd=${b.dataOd.toISOString().slice(0, 10)} (przed 2010)`);
    }

    // 3. Okres > 24 miesiące (OŚW max 24 mies.)
    if (b.dataOd && b.dataDo) {
      const months = (b.dataDo.getTime() - b.dataOd.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (months > 26) {
        issues.push(`okres ${Math.round(months)} mies. (>24)`);
      }
    }

    // 4. Stanowisko wygląda jak dane paszportowe/osobowe
    if (b.stanowisko) {
      const s = b.stanowisko.toLowerCase();
      if (/paszport|passport|visa|wiza|pesel|urodzeni|birth|obywatel|citizen|nationality/i.test(s)) {
        issues.push(`stanowisko wygląda jak dane osobowe: "${b.stanowisko.substring(0, 60)}"`);
      }
    }

    // 5. Firma pusta + nrOswiadczenia puste + brak dat
    if (!b.firma && !b.nrOswiadczenia && !b.dataOd && !b.dataDo) {
      issues.push("pusta podstawa (brak firmy, nr, dat)");
    }

    // 6. nrOswiadczenia wygląda jak nr paszportu
    if (b.nrOswiadczenia && /^[A-Z]{2}\d{6,}$/i.test(b.nrOswiadczenia)) {
      issues.push(`nrOswiadczenia wygląda jak nr paszportu: "${b.nrOswiadczenia}"`);
    }

    if (issues.length > 0) {
      anomalies.push({
        baseId: b.id,
        foreignerId: b.foreigner.id,
        name: `${b.foreigner.imie} ${b.foreigner.nazwisko}`,
        status: b.status,
        issues,
      });
    }
  }

  console.log(`Łącznie OSWIADCZENIE: ${allOsw.length}`);
  console.log(`Z anomaliami: ${anomalies.length}\n`);

  for (const a of anomalies) {
    console.log(`#${a.baseId} id=${a.foreignerId} ${a.name} [${a.status}]:`);
    for (const issue of a.issues) {
      console.log(`  - ${issue}`);
    }
  }

  // === 3. Sprawdź czy są podstawy z danymi paszportowymi w stanowisku/firmie ===
  console.log("\n=== AUDIT: Podstawy z danymi paszportowymi w polach tekstowych ===\n");

  const allBases = await db.fdkEmploymentBase.findMany({
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true, nrPaszportu: true } } },
  });

  let paszportMatches = 0;
  for (const b of allBases) {
    if (!b.foreigner.nrPaszportu) continue;
    const passport = b.foreigner.nrPaszportu;
    const fields = [b.stanowisko, b.firma, b.nrDecyzji, b.nrOswiadczenia].filter(Boolean);
    for (const field of fields) {
      if (field.includes(passport)) {
        console.log(`  #${b.id} id=${b.foreigner.id} ${b.foreigner.imie} ${b.foreigner.nazwisko}: nr paszportu "${passport}" znaleziony w polu`);
        paszportMatches++;
      }
    }
  }
  if (paszportMatches === 0) console.log("  Brak dopasowań nr paszportu w polach podstaw.");

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
