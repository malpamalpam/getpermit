/**
 * Pkt 9b: Scan for false "w procedurze" records.
 *
 * Lists all foreigners with upoDoreczone set, checking if they have
 * evidence of application submission (UPO, stempel, zaświadczenie).
 *
 * Usage:
 *   node scripts/scan-false-w-procedurze.mjs --dry-run   → raport
 *   node scripts/scan-false-w-procedurze.mjs --apply      → clear false records
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const dryRun = !process.argv.includes("--apply");

async function main() {
  console.log(`=== Scan false "w procedurze" — ${dryRun ? "DRY RUN" : "APPLY"} ===\n`);

  const withUpo = await prisma.fdkForeigner.findMany({
    where: { upoDoreczone: { not: null } },
    select: {
      id: true, imie: true, nazwisko: true,
      upoDoreczone: true, upoUwagi: true,
      attachments: { select: { nazwaPliku: true, detectedType: true } },
    },
  });

  const evidenceTypes = ["POBYT_NA_PRZEDLUZENIU", "ZASWIADCZENIE_POSTEPOWANIE"];
  const evidencePatterns = ["upo", "stempel", "potwierdzenie_zlozenia", "potwierdzenie zlozenia"];

  const csvRows = ["foreignerId,foreigner,upoDoreczone,upoUwagi,hasEvidence,evidenceFile"];
  const falseRecords = [];

  for (const f of withUpo) {
    const name = `${f.imie ?? ""} ${f.nazwisko}`.trim();
    const evidenceAttachment = f.attachments.find(
      (a) =>
        (a.detectedType && evidenceTypes.includes(a.detectedType)) ||
        evidencePatterns.some((p) => a.nazwaPliku.toLowerCase().includes(p))
    );
    const hasEvidence = !!evidenceAttachment;

    csvRows.push([
      f.id, `"${name}"`, f.upoDoreczone?.toISOString().slice(0, 10) ?? "",
      `"${(f.upoUwagi ?? "").replace(/"/g, '""')}"`,
      hasEvidence ? "TAK" : "NIE",
      evidenceAttachment ? `"${evidenceAttachment.nazwaPliku}"` : "",
    ].join(","));

    if (!hasEvidence) falseRecords.push(f);
  }

  const csvFile = "raport-false-w-procedurze.csv";
  writeFileSync(csvFile, csvRows.join("\n"), "utf-8");
  console.log(`Raport: ${csvFile}`);
  console.log(`Cudzoziemcy "w procedurze": ${withUpo.length}`);
  console.log(`Bez dowodu złożenia wniosku: ${falseRecords.length}`);

  if (!dryRun && falseRecords.length > 0) {
    for (const f of falseRecords) {
      await prisma.fdkForeigner.update({
        where: { id: f.id },
        data: { upoDoreczone: null, upoUwagi: null },
      });
    }
    console.log(`\nWyczyszczono ${falseRecords.length} fałszywych "w procedurze"`);
  } else if (dryRun) {
    console.log("\n--- DRY RUN — nic nie zmieniono. Uruchom z --apply po akceptacji. ---");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
