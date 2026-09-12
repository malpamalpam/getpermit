/**
 * Skrypt: rescrape kartoteki ADEOSUN (foreignerId=382).
 *
 * Kroki:
 * 1. Usuń wszystkie błędne podstawy (Oświadczenie WERYFIKACJA + Karta pobytu z WP)
 * 2. Wywołaj endpoint scrape dla każdego załącznika
 *
 * Usage:
 *   node --env-file=.env.local scripts/rescrape-adeosun.mjs                    # dry-run
 *   node --env-file=.env.local scripts/rescrape-adeosun.mjs --run              # wykonaj
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "rescrape-adeosun-script";
const FOREIGNER_ID = 382;

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`=== Rescrape ADEOSUN id=${FOREIGNER_ID} (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: FOREIGNER_ID },
    include: {
      employmentBases: true,
      attachments: true,
    },
  });

  if (!foreigner) {
    console.error(`Foreigner id=${FOREIGNER_ID} nie znaleziony!`);
    process.exit(1);
  }

  console.log(`Osoba: ${foreigner.imie} ${foreigner.nazwisko} (${foreigner.obywatelstwo})`);
  console.log(`Załączników: ${foreigner.attachments.length}`);
  console.log(`Podstaw: ${foreigner.employmentBases.length}\n`);

  // 1. Identyfikuj błędne podstawy
  const badBases = foreigner.employmentBases.filter((b) => {
    // Oświadczenia z WERYFIKACJA
    if (b.typ === "OSWIADCZENIE" && b.uwagi?.includes("WERYFIKACJA")) return true;
    // Karta pobytu — do usunięcia jeśli nie ma dokumentu karty pobytu
    if (b.typ === "KARTA_POBYTU") return true;
    return false;
  });

  console.log(`Podstawy do usunięcia: ${badBases.length}`);
  for (const b of badBases) {
    console.log(`  [${b.id}] typ=${b.typ} status=${b.status} okres=${b.dataOd?.toISOString().slice(0,10) ?? "?"} – ${b.dataDo?.toISOString().slice(0,10) ?? "?"}`);
    if (b.uwagi) console.log(`        uwagi: ${b.uwagi.substring(0, 100)}`);
  }

  if (DO_RUN) {
    // Usuń błędne podstawy
    for (const b of badBases) {
      await db.fdkEmploymentBase.delete({ where: { id: b.id } });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: FOREIGNER_ID,
          changedBy: CHANGED_BY,
          field: "employment_base_cleanup",
          oldValue: `Podstawa #${b.id} ${b.typ} (${b.nrOswiadczenia ?? b.nrDecyzji ?? "brak nr"})`,
          newValue: `Usunięta — rescrape ADEOSUN: błędna klasyfikacja.`,
        },
      });
      console.log(`  -> Usunięto podstawę #${b.id}`);
    }

    // 2. Rescrapuj załączniki (wywołanie API)
    console.log(`\nRescrapowanie ${foreigner.attachments.length} załączników...`);
    console.log(`UWAGA: Rescrape wymaga uruchomienia serwera Next.js.`);
    console.log(`Aby rescrapować załączniki, użyj UI (przycisk "Zescrapuj dane") lub wywołaj API:`);
    for (const att of foreigner.attachments) {
      const scrapable = ["pdf", "jpeg", "jpg", "png"].includes(att.typPliku);
      console.log(`  [${att.id}] ${att.nazwaPliku} (${att.typPliku}) — ${scrapable ? "do scrapowania w UI" : "pominięty (nie-scrapable)"}`);
    }
    console.log(`\nPo rescrape oczekujemy:`);
    console.log(`  - WP → typ ZEZWOLENIE ze statusem UCHYLONE`);
    console.log(`  - ŻADNEJ karty pobytu (chyba że jest dokument karty)`);
    console.log(`  - ŻADNYCH oświadczeń (Nigeria nie uprawnia)`);
  }

  console.log(`\n=== Gotowe ===`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
