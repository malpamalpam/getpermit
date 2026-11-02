/**
 * Migracja: znajdź OSWIADCZENIE które powinny być ZGLOSZENIE_UA
 * + oświadczenia z danych paszportowych (do usunięcia)
 *
 * node scripts/fix-osw-to-ua.mjs          # dry run
 * node scripts/fix-osw-to-ua.mjs --apply  # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DO_APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DRY RUN"}\n`);

  // === 1. Znajdź OŚW z pliku "zgłoszenie_UA" / "zgloszenie_UA" ===
  console.log("=== 1. OŚW z pliku o nazwie zgłoszenie/powiadomienie UA ===\n");

  // Get all change logs that created OSWIADCZENIE from files
  const logs = await db.fdkChangeLog.findMany({
    where: {
      field: "scrape",
      newValue: { contains: "OSWIADCZENIE" },
    },
    orderBy: { changedAt: "desc" },
  });

  // Parse log entries: "Utworzono podstawę #ID (OSWIADCZENIE) z pliku: FILENAME"
  const toConvert = [];
  for (const log of logs) {
    const match = log.newValue?.match(/podstaw[ęe]\s+(?:zatrudnienia\s+)?#(\d+)\s+\(OSWIADCZENIE\).*?pliku:\s+(.+?)$/);
    if (!match) continue;
    const baseId = parseInt(match[1], 10);
    const fileName = match[2].trim();

    // Check if filename indicates UA notification
    const isUA = /zg[łl]oszeni.*ua|powiadomieni.*ua|ppwpu/i.test(fileName);
    // Check if filename indicates passport/PESEL
    const isPassport = /paszport|passport|pesel/i.test(fileName);

    if (isUA || isPassport) {
      // Verify base still exists and is OSWIADCZENIE
      const base = await db.fdkEmploymentBase.findUnique({ where: { id: baseId } });
      if (!base) continue;

      const foreigner = await db.fdkForeigner.findUnique({
        where: { id: log.foreignerId },
        select: { imie: true, nazwisko: true, obywatelstwo: true },
      });

      toConvert.push({
        baseId,
        foreignerId: log.foreignerId,
        name: `${foreigner?.imie} ${foreigner?.nazwisko}`,
        obywatelstwo: foreigner?.obywatelstwo,
        fileName,
        currentTyp: base.typ,
        currentStatus: base.status,
        action: isPassport ? "DELETE" : (base.typ === "OSWIADCZENIE" ? "CONVERT_TO_UA" : "ALREADY_CONVERTED"),
        dataOd: base.dataOd?.toISOString().slice(0, 10),
        dataDo: base.dataDo?.toISOString().slice(0, 10),
      });
    }
  }

  // === 2. Anomalie: OŚW z okresem > 24 mies. ===
  console.log("=== 2. OŚW z okresem > 24 mies. (podejrzane) ===\n");

  const longOsw = await db.fdkEmploymentBase.findMany({
    where: { typ: "OSWIADCZENIE" },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true, obywatelstwo: true, dataUrodzenia: true } } },
  });

  const longPeriod = [];
  for (const b of longOsw) {
    if (!b.dataOd || !b.dataDo) continue;
    const months = (b.dataDo.getTime() - b.dataOd.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (months > 26) {
      // Check if dataOd matches birth date
      const isBirthDate = b.foreigner.dataUrodzenia &&
        b.dataOd.toISOString().slice(0, 10) === b.foreigner.dataUrodzenia.toISOString().slice(0, 10);

      longPeriod.push({
        baseId: b.id,
        foreignerId: b.foreigner.id,
        name: `${b.foreigner.imie} ${b.foreigner.nazwisko}`,
        status: b.status,
        period: `${b.dataOd.toISOString().slice(0, 10)} - ${b.dataDo.toISOString().slice(0, 10)}`,
        months: Math.round(months),
        isBirthDate,
        action: isBirthDate ? "DELETE_PASSPORT_DATA" : "REVIEW",
      });
    }
  }

  // === RAPORT ===
  console.log("--- KONWERSJE OŚW → ZGŁOSZENIE UA ---");
  const convertList = toConvert.filter((c) => c.action === "CONVERT_TO_UA");
  console.log(`Do konwersji: ${convertList.length}`);
  for (const c of convertList) {
    console.log(`  #${c.baseId} id=${c.foreignerId} ${c.name} [${c.obywatelstwo}] ${c.currentStatus} "${c.fileName.substring(0, 60)}"`);
  }

  console.log("\n--- USUNIĘCIE (dane paszportowe jako OŚW) ---");
  const deleteList = toConvert.filter((c) => c.action === "DELETE");
  console.log(`Do usunięcia: ${deleteList.length}`);
  for (const c of deleteList) {
    console.log(`  #${c.baseId} id=${c.foreignerId} ${c.name} "${c.fileName.substring(0, 60)}" okres: ${c.dataOd}-${c.dataDo}`);
  }

  console.log("\n--- JUŻ SKONWERTOWANE ---");
  const alreadyList = toConvert.filter((c) => c.action === "ALREADY_CONVERTED");
  console.log(`Już poprawione: ${alreadyList.length}`);

  console.log("\n--- OŚW Z DŁUGIM OKRESEM (>24 mies.) ---");
  console.log(`Anomalii: ${longPeriod.length}`);
  for (const c of longPeriod) {
    console.log(`  #${c.baseId} id=${c.foreignerId} ${c.name} [${c.status}] ${c.period} (${c.months} mies.) → ${c.action}`);
  }

  // === APPLY ===
  if (DO_APPLY) {
    console.log("\n=== APPLYING ===\n");

    // Convert OŚW → ZGLOSZENIE_UA
    for (const c of convertList) {
      await db.fdkEmploymentBase.update({
        where: { id: c.baseId },
        data: { typ: "ZGLOSZENIE_UA", nrOswiadczenia: null },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: c.foreignerId,
          changedBy: "fix-osw-to-ua",
          field: "employment_base_auto",
          oldValue: "OSWIADCZENIE",
          newValue: `Przekwalifikowano #${c.baseId} OSWIADCZENIE → ZGLOSZENIE_UA (plik: ${c.fileName.substring(0, 60)})`,
        },
      });
      console.log(`  #${c.baseId} → ZGLOSZENIE_UA`);
    }

    // Delete passport-based OŚW
    for (const c of deleteList) {
      await db.fdkEmploymentBase.delete({ where: { id: c.baseId } });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: c.foreignerId,
          changedBy: "fix-osw-to-ua",
          field: "employment_base_auto",
          oldValue: `OSWIADCZENIE #${c.baseId}`,
          newValue: `Usunięto podstawę z danych paszportowych (plik: ${c.fileName.substring(0, 60)})`,
        },
      });
      console.log(`  #${c.baseId} → USUNIĘTO (dane paszportowe)`);
    }

    // Delete birth-date OŚW from long period list
    for (const c of longPeriod.filter((x) => x.action === "DELETE_PASSPORT_DATA")) {
      // Check if not already deleted above
      const exists = await db.fdkEmploymentBase.findUnique({ where: { id: c.baseId } });
      if (!exists) continue;
      await db.fdkEmploymentBase.delete({ where: { id: c.baseId } });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: c.foreignerId,
          changedBy: "fix-osw-to-ua",
          field: "employment_base_auto",
          oldValue: `OSWIADCZENIE #${c.baseId}`,
          newValue: `Usunięto podstawę z danych paszportowych (dataOd = data urodzenia, okres ${c.months} mies.)`,
        },
      });
      console.log(`  #${c.baseId} → USUNIĘTO (data urodzenia jako dataOd)`);
    }
  }

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
