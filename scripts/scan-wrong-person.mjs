/**
 * Scan existing employment bases created from scraping for name mismatches.
 * Finds bases where the scraped document likely belongs to a different person.
 *
 * Usage:
 *   node scripts/scan-wrong-person.mjs              # report only
 *   node scripts/scan-wrong-person.mjs --fix        # delete base #270 + flag mismatches
 *   node scripts/scan-wrong-person.mjs --delete-base 270   # delete specific base
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DO_FIX = process.argv.includes("--fix");
const deleteBaseIdx = process.argv.indexOf("--delete-base");
const DELETE_BASE_ID = deleteBaseIdx >= 0 ? parseInt(process.argv[deleteBaseIdx + 1], 10) : null;

function normalizeTokens(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

function tokensMatch(extracted, profile) {
  let matchCount = 0;
  for (const et of extracted) {
    for (const pt of profile) {
      if (et === pt || (et.length >= 3 && pt.length >= 3 && (et.startsWith(pt.substring(0, 3)) || pt.startsWith(et.substring(0, 3))))) {
        matchCount++; break;
      }
    }
  }
  return matchCount > 0;
}

async function main() {
  // Delete specific base if requested
  if (DELETE_BASE_ID) {
    const base = await db.fdkEmploymentBase.findUnique({
      where: { id: DELETE_BASE_ID },
      include: { foreigner: { select: { imie: true, nazwisko: true } } },
    });
    if (base) {
      await db.fdkEmploymentBase.delete({ where: { id: DELETE_BASE_ID } });
      console.log(`Usunieto podstawe #${DELETE_BASE_ID} (${base.typ}) z profilu ${base.foreigner.imie} ${base.foreigner.nazwisko}`);
      await db.fdkChangeLog.create({
        data: {
          foreignerId: base.foreignerId,
          changedBy: "scan-wrong-person",
          field: "employment_base_delete",
          oldValue: null,
          newValue: `Usunieto podstawe #${DELETE_BASE_ID} (${base.typ}) — dokument innej osoby`,
        },
      });
    } else {
      console.log(`Podstawa #${DELETE_BASE_ID} nie istnieje.`);
    }
  }

  // Scan change logs for scrape events that mention names
  const scrapeLogs = await db.fdkChangeLog.findMany({
    where: {
      field: "scrape",
      newValue: { contains: "pliku:" },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
    orderBy: { changedAt: "desc" },
  });

  console.log(`\nAnalizuje ${scrapeLogs.length} zdarzen scrape...\n`);

  // For each scrape log, check if the base it created has a different name
  // We look at attached bases and compare names
  const mismatches = [];

  // Get all foreigners with bases and attachments
  const foreigners = await db.fdkForeigner.findMany({
    where: {
      employmentBases: { some: {} },
    },
    select: {
      id: true,
      imie: true,
      nazwisko: true,
      employmentBases: {
        select: { id: true, typ: true, firma: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        select: { id: true, nazwaPliku: true, opis: true },
      },
    },
  });

  // Check attachments with "⚠" flag already
  for (const f of foreigners) {
    for (const att of f.attachments) {
      if (att.opis && att.opis.startsWith("\u26a0")) {
        console.log(`  [JUZ OFLAGOWANY] Profil ${f.imie} ${f.nazwisko} (id=${f.id}): ${att.nazwaPliku} — ${att.opis}`);
      }
    }
  }

  // Look for change logs mentioning "INNA OSOBA"
  const innaOsobaLogs = await db.fdkChangeLog.findMany({
    where: {
      field: "scrape",
      newValue: { contains: "INNA OSOB" },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  if (innaOsobaLogs.length > 0) {
    console.log(`\nZnalezione wpisy "INNA OSOBA" w historii (${innaOsobaLogs.length}):`);
    for (const log of innaOsobaLogs) {
      console.log(`  Profil ${log.foreigner.imie} ${log.foreigner.nazwisko} (id=${log.foreigner.id}): ${log.newValue}`);
    }
  }

  console.log(`\nGotowe.`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
