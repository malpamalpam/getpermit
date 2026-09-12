/**
 * Skrypt: audyt — czy są osoby z podstawą KARTA_POBYTU utworzoną z dokumentu WP.
 *
 * Szuka podstaw typu KARTA_POBYTU powiązanych z załącznikiem, którego nazwa
 * wskazuje na zezwolenie na pracę (WP), nie na kartę pobytu.
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-wp-kartapobytu.mjs
 *   node --env-file=.env.local scripts/audit-wp-kartapobytu.mjs --report raport-audit-wp-kp.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();

const args = process.argv.slice(2);
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

const csvRows = [["foreignerId", "nazwisko", "imie", "baseId", "baseTyp", "baseStatus", "attachmentId", "attachmentName", "suspectedType"]];

// Wzorce nazw plików wskazujące na WP (zezwolenie na pracę), NIE kartę pobytu
const WP_FILENAME_PATTERNS = [
  /zezwolenie[\s_]*na[\s_]*prac/i,
  /wp[\s_-]*\d/i,              // "WP-1", "wp 2024"
  /typ[\s_]*[a-e]/i,           // "typ A", "typ_B"
  /work[\s_]*permit/i,
];

// Wzorce nazw plików wskazujące na kartę pobytu (OK — nie flagujemy)
const KP_FILENAME_PATTERNS = [
  /karta[\s_]*pobytu/i,
  /kp[\s_-]/i,
  /trc[\s_-]/i,                // temporary residence card
  /pobyt[\s_]*(czasow|stal)/i,
  /residence/i,
  /decyzja[\s_]*pobyt/i,
];

async function main() {
  console.log(`=== Audyt: KARTA_POBYTU z dokumentu WP ===\n`);

  const bases = await db.fdkEmploymentBase.findMany({
    where: {
      typ: "KARTA_POBYTU",
      sourceAttachmentId: { not: null },
    },
    include: {
      foreigner: true,
    },
  });

  console.log(`Znaleziono ${bases.length} podstaw KARTA_POBYTU z załącznikiem źródłowym\n`);

  let flagged = 0;

  for (const base of bases) {
    if (!base.sourceAttachmentId) continue;

    const attachment = await db.fdkAttachment.findUnique({
      where: { id: base.sourceAttachmentId },
    });

    if (!attachment) continue;

    const filename = attachment.nazwaPliku;

    // Sprawdź czy nazwa pliku wygląda na WP
    const isWpFilename = WP_FILENAME_PATTERNS.some((p) => p.test(filename));
    const isKpFilename = KP_FILENAME_PATTERNS.some((p) => p.test(filename));

    // Flaguj jeśli wygląda na WP i NIE wygląda na KP
    if (isWpFilename && !isKpFilename) {
      const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
      console.log(`  [FLAG] ${name} (id=${base.foreignerId}): podstawa #${base.id} KARTA_POBYTU`);
      console.log(`         załącznik: "${filename}" — wygląda na zezwolenie na pracę!`);

      flagged++;
      csvRows.push([
        String(base.foreignerId), base.foreigner.nazwisko, base.foreigner.imie ?? "",
        String(base.id), base.typ, base.status,
        String(attachment.id), filename, "ZEZWOLENIE",
      ]);
    }
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`Podejrzanych (WP → KARTA_POBYTU): ${flagged} / ${bases.length}`);

  if (flagged === 0) {
    console.log(`Brak rozjazdów — OK.`);
  }

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
