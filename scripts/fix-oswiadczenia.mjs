/**
 * Skrypt naprawczy A1: reklasyfikacja oświadczeń wg obywatelstwa.
 *
 * Dla każdej podstawy typu OSWIADCZENIE sprawdza, czy obywatelstwo cudzoziemca
 * uprawnia do oświadczenia (tabela oswiadczenie_countries). Jeśli nie:
 * - oznacza podstawę jako "do weryfikacji" (uwagi)
 * - NIE usuwa (admin zdecyduje co z nią zrobić)
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-oswiadczenia.mjs               # dry-run — lista
 *   node --env-file=.env.local scripts/fix-oswiadczenia.mjs --run         # wykonaj
 *   node --env-file=.env.local scripts/fix-oswiadczenia.mjs --run --report raport-fix-osw.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "fix-oswiadczenia-script";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const csvRows = [["foreignerId", "nazwisko", "imie", "obywatelstwo", "baseId", "nrOswiadczenia", "action", "reason"]];

const ALIASES = {
  "georgia": "GE", "gruzja": "GE",
  "belarus": "BY", "bialorus": "BY",
  "moldova": "MD", "moldawia": "MD",
  "ukraine": "UA", "ukraina": "UA",
  "russia": "RU", "rosja": "RU",
  "armenia": "AM",
};

function stripDiacritics(s) {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function isAllowed(citizenship, documentDate) {
  const countries = await db.oswiadczenieCountry.findMany();
  const norm = stripDiacritics(citizenship || "");
  if (!norm) return true;

  const aliasCode = ALIASES[norm];

  const match = countries.find((c) => {
    const code = c.countryCode.toLowerCase();
    const name = stripDiacritics(c.countryName);
    if (aliasCode && code === aliasCode.toLowerCase()) return true;
    return norm === code || norm === name || name.includes(norm) || norm.includes(name);
  });

  if (!match) return false;

  const checkDate = documentDate ?? new Date();
  if (match.validFrom && checkDate < match.validFrom) return false;
  if (match.validTo && checkDate > match.validTo) return false;
  return true;
}

async function main() {
  console.log(`=== Fix oświadczeń wg obywatelstwa (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const bases = await db.fdkEmploymentBase.findMany({
    where: { typ: "OSWIADCZENIE" },
    include: { foreigner: true },
  });

  console.log(`Znaleziono ${bases.length} podstaw typu OSWIADCZENIE\n`);

  let flagged = 0;

  for (const base of bases) {
    const citizenship = base.foreigner.obywatelstwo;
    if (!citizenship) continue; // nie znamy obywatelstwa

    const allowed = await isAllowed(citizenship, base.dataOd);

    if (!allowed) {
      const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
      console.log(`  [FLAG] ${name} (${citizenship}): podstawa #${base.id} (${base.nrOswiadczenia ?? "brak nr"}) — obywatelstwo nie uprawnia do oświadczenia`);

      if (DO_RUN) {
        const note = `⚠ WERYFIKACJA: obywatelstwo "${citizenship}" nie uprawnia do oświadczenia o powierzeniu pracy. Sprawdź typ dokumentu (może to powiadomienie, zezwolenie lub załącznik).`;
        const existingUwagi = base.uwagi ? `${base.uwagi}\n${note}` : note;

        await db.fdkEmploymentBase.update({
          where: { id: base.id },
          data: { uwagi: existingUwagi },
        });

        await db.fdkChangeLog.create({
          data: {
            foreignerId: base.foreignerId,
            changedBy: CHANGED_BY,
            field: "employment_base_fix",
            oldValue: `Podstawa #${base.id} OSWIADCZENIE`,
            newValue: `Oflagowana do weryfikacji — obywatelstwo "${citizenship}" nie uprawnia do oświadczeń`,
          },
        });
      }

      flagged++;
      csvRows.push([
        String(base.foreignerId), base.foreigner.nazwisko, base.foreigner.imie ?? "",
        citizenship, String(base.id), base.nrOswiadczenia ?? "",
        "flagged", `citizenship_${citizenship}_not_eligible`,
      ]);
    }
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`Oflagowanych: ${flagged} / ${bases.length}`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
