/**
 * Pkt 5: Remove employment bases where the employer is NOT FDK.
 *
 * Rule: Zakładka "Podstawy zatrudnienia" pokazuje wyłącznie podstawy, w których
 * pracodawcą/podmiotem jest Fundacja Firma Dla Każdego.
 * Dokumenty innych pracodawców nie tworzą podstaw zatrudnienia.
 * Plik zostaje w załącznikach. TRC innego pracodawcy pozostaje w Podstawach POBYTU.
 *
 * FDK identifiers: NIP 7010962890, names "Firma Dla Każdego" / "Fundacja Firma",
 * addresses "Lwowska 5/15", "Lwowska 17/4".
 *
 * Usage:
 *   node scripts/remove-non-fdk-employment.mjs --dry-run
 *   node scripts/remove-non-fdk-employment.mjs --apply
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const dryRun = !process.argv.includes("--apply");

function isFdkEmployer(text) {
  if (!text) return true; // No firma = unknown, keep it
  const lower = text.toLowerCase();
  const names = ["firma dla każdego", "firma dla kazdego", "fundacja firma", "fdk"];
  const addresses = ["lwowska 5/15", "lwowska 17/4", "lwowska 5"];
  const nip = "7010962890";
  for (const name of names) if (lower.includes(name)) return true;
  for (const addr of addresses) if (lower.includes(addr)) return true;
  if (lower.includes(nip)) return true;
  return false;
}

async function main() {
  console.log(`=== Remove non-FDK employment bases — ${dryRun ? "DRY RUN" : "APPLY"} ===\n`);

  // Find employment bases with a firma that is NOT FDK
  const allWithFirma = await prisma.fdkEmploymentBase.findMany({
    where: {
      firma: { not: null },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  const nonFdk = allWithFirma.filter((b) => !isFdkEmployer(b.firma));

  // Also find TRC_INNY_PRACODAWCA type (regardless of firma field)
  const trcInny = await prisma.fdkEmploymentBase.findMany({
    where: { typ: "TRC_INNY_PRACODAWCA" },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  // Merge (avoid duplicates)
  const toDeleteMap = new Map();
  for (const b of [...nonFdk, ...trcInny]) {
    toDeleteMap.set(b.id, b);
  }
  const toDelete = [...toDeleteMap.values()];

  const csvRows = ["id,foreignerId,foreigner,typ,firma,nrDecyzji,dataOd,dataDo,action"];

  for (const b of toDelete) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    csvRows.push([
      b.id, b.foreignerId, `"${name}"`, b.typ,
      `"${(b.firma ?? "").replace(/"/g, '""')}"`,
      b.nrDecyzji ?? "", b.dataOd?.toISOString().slice(0, 10) ?? "",
      b.dataDo?.toISOString().slice(0, 10) ?? "",
      "DELETE",
    ].join(","));
  }

  const csvFile = "raport-non-fdk-employment.csv";
  writeFileSync(csvFile, csvRows.join("\n"), "utf-8");
  console.log(`Raport: ${csvFile}`);
  console.log(`Podstawy zatrudnienia innych pracodawców: ${toDelete.length}`);

  if (!dryRun && toDelete.length > 0) {
    const ids = toDelete.map((b) => b.id);
    const result = await prisma.fdkEmploymentBase.deleteMany({ where: { id: { in: ids } } });
    console.log(`Usunięto: ${result.count}`);
  } else if (dryRun) {
    console.log("\n--- DRY RUN — nic nie usunięto. Uruchom z --apply żeby usunąć. ---");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
