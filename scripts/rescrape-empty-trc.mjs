/**
 * Pkt 4: Find TRC/TRC-FDK employment bases with empty stanowisko/rodzajUmowy
 * that have a source attachment, and queue them for re-scraping.
 *
 * Does NOT re-scrape automatically (that requires OCR API calls).
 * Instead, produces a list of attachment IDs to re-scrape via:
 *   curl -X POST /api/fdk/attachments/{id} -d '{"action":"scrape"}'
 *
 * Usage:
 *   node scripts/rescrape-empty-trc.mjs              → raport CSV
 *   node scripts/rescrape-empty-trc.mjs --rescrape   → actually call scrape API (needs BASE_URL)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const doRescrape = process.argv.includes("--rescrape");
const BASE_URL = process.env.NEXTAUTH_URL || process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log(`=== Find TRC bases with empty stanowisko — ${doRescrape ? "RESCRAPE" : "REPORT ONLY"} ===\n`);

  const trcTypes = [
    "TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ",
    "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC",
    "TRC_INNE_OKOLICZNOSCI", "TRC_BLUE_CARD", "KARTA_POBYTU", "BLUE_CARD",
  ];

  // Employment bases: TRC types with empty stanowisko AND a source attachment
  const emptyTrc = await prisma.fdkEmploymentBase.findMany({
    where: {
      typ: { in: trcTypes },
      OR: [
        { stanowisko: null },
        { stanowisko: "" },
      ],
      sourceAttachmentId: { not: null },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  // Also find ones with empty rodzajUmowy
  const emptyRodzaj = await prisma.fdkEmploymentBase.findMany({
    where: {
      typ: { in: trcTypes },
      OR: [
        { rodzajUmowy: null },
        { rodzajUmowy: "" },
      ],
      sourceAttachmentId: { not: null },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  // Merge unique attachment IDs
  const attIds = new Set();
  const allBases = [...emptyTrc, ...emptyRodzaj];
  const uniqueBases = new Map();
  for (const b of allBases) {
    uniqueBases.set(b.id, b);
    if (b.sourceAttachmentId) attIds.add(b.sourceAttachmentId);
  }

  const csvRows = ["baseId,foreignerId,foreigner,typ,stanowisko,rodzajUmowy,sourceAttachmentId"];
  for (const b of uniqueBases.values()) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    csvRows.push([
      b.id, b.foreignerId, `"${name}"`, b.typ,
      `"${b.stanowisko ?? ""}"`, `"${b.rodzajUmowy ?? ""}"`,
      b.sourceAttachmentId ?? "",
    ].join(","));
  }

  const csvFile = "raport-empty-trc-stanowisko.csv";
  writeFileSync(csvFile, csvRows.join("\n"), "utf-8");
  console.log(`Raport: ${csvFile}`);
  console.log(`TRC bases z pustym stanowiskiem: ${emptyTrc.length}`);
  console.log(`TRC bases z pustym rodzajUmowy: ${emptyRodzaj.length}`);
  console.log(`Unikalne bazy do przeliczenia: ${uniqueBases.size}`);
  console.log(`Załączniki do re-scrapowania: ${attIds.size}`);

  if (doRescrape) {
    console.log(`\nRe-scraping ${attIds.size} attachments via API...`);
    let ok = 0, fail = 0;
    for (const attId of attIds) {
      try {
        const res = await fetch(`${BASE_URL}/api/fdk/attachments/${attId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "scrape" }),
        });
        if (res.ok) {
          ok++;
          console.log(`  [OK] attachment #${attId}`);
        } else {
          fail++;
          console.log(`  [FAIL] attachment #${attId}: ${res.status}`);
        }
      } catch (e) {
        fail++;
        console.log(`  [ERROR] attachment #${attId}: ${e.message}`);
      }
    }
    console.log(`\nRe-scraped: ${ok} OK, ${fail} failed`);
  } else {
    console.log("\n--- REPORT ONLY. Uruchom z --rescrape żeby przelicczyć (wymaga działającego serwera). ---");
    console.log(`Attachment IDs do re-scrape: [${[...attIds].join(", ")}]`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
