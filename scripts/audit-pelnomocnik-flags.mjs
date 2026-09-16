/**
 * Skrypt: audyt załączników z flagą "Dokument innej osoby"
 * gdzie wykryte nazwisko to znany pełnomocnik FDK.
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-pelnomocnik-flags.mjs
 *   node --env-file=.env.local scripts/audit-pelnomocnik-flags.mjs --report raport-pelnomocnik-flags.csv
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();

const args = process.argv.slice(2);
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : null;

// Znani pełnomocnicy FDK
const KNOWN_AGENTS = ["stanko", "antoshka", "glapinska", "glapińska", "lytvynchuk"];

const csvRows = [["attachmentId", "foreignerId", "nazwisko", "imie", "nazwaPliku", "opis", "detectedName", "isPelnomocnik"]];

async function main() {
  console.log(`=== Audyt: załączniki z flagą "Dokument innej osoby" ===\n`);

  const attachments = await db.fdkAttachment.findMany({
    where: { opis: { contains: "Dokument innej osoby" } },
    include: { foreigner: true },
  });

  console.log(`Znaleziono ${attachments.length} załączników z flagą\n`);

  let pelnomocnikCount = 0;

  for (const att of attachments) {
    const nameMatch = att.opis?.match(/innej osoby:\s*(.+)/);
    const detectedName = nameMatch ? nameMatch[1].trim() : "?";
    const detectedLower = detectedName.toLowerCase();

    const isPelnomocnik = KNOWN_AGENTS.some((a) => detectedLower.includes(a));
    const foreignerName = `${att.foreigner.imie ?? ""} ${att.foreigner.nazwisko}`.trim();

    if (isPelnomocnik) pelnomocnikCount++;

    console.log(`  [${att.id}] ${att.nazwaPliku} — profil: ${foreignerName}`);
    console.log(`        wykryto: "${detectedName}" ${isPelnomocnik ? "→ PEŁNOMOCNIK (do rescrape)" : ""}`);

    csvRows.push([
      String(att.id), String(att.foreignerId), att.foreigner.nazwisko,
      att.foreigner.imie ?? "", att.nazwaPliku, (att.opis ?? "").substring(0, 100),
      detectedName, isPelnomocnik ? "TAK" : "NIE",
    ]);
  }

  console.log(`\n=== Podsumowanie ===`);
  console.log(`Załączników z flagą: ${attachments.length}`);
  console.log(`Z nich pełnomocnicy FDK: ${pelnomocnikCount} (do ponownego scrape)`);

  if (REPORT_FILE) {
    const csv = csvRows.map((r) => r.join(";")).join("\n");
    fs.writeFileSync(REPORT_FILE, csv, "utf-8");
    console.log(`Raport: ${REPORT_FILE}`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
