/**
 * Pkt 1: Fix work permit numbers — separate nrDecyzji (permit number) from sygnatura (WRP-...).
 *
 * For ZEZWOLENIE_A / ZEZWOLENIE_A_KONT records where nrDecyzji starts with "WRP":
 *   - Move WRP value to sygnatura field
 *   - Clear nrDecyzji (permit number unknown — needs re-scrape)
 *
 * Usage:
 *   node scripts/fix-permit-numbers.mjs --dry-run
 *   node scripts/fix-permit-numbers.mjs --apply
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const dryRun = !process.argv.includes("--apply");

async function main() {
  console.log(`=== Fix permit numbers — ${dryRun ? "DRY RUN" : "APPLY"} ===\n`);

  // Employment bases where nrDecyzji looks like a WRP sygnatura
  const wrpInNr = await prisma.fdkEmploymentBase.findMany({
    where: {
      nrDecyzji: { startsWith: "WRP" },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  const csvRows = ["id,foreignerId,foreigner,typ,nrDecyzji_old,sygnatura_new,nrDecyzji_new"];
  let fixCount = 0;

  for (const b of wrpInNr) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    // WRP is sygnatura — move it there
    // nrDecyzji should be the permit number (digits/YYYY) — we don't have it, so set to null
    // If sygnatura field already has a value, keep the existing one
    const newSygnatura = b.sygnatura || b.nrDecyzji;
    csvRows.push([
      b.id, b.foreignerId, `"${name}"`, b.typ,
      b.nrDecyzji ?? "", newSygnatura ?? "", "null",
    ].join(","));

    if (!dryRun) {
      await prisma.fdkEmploymentBase.update({
        where: { id: b.id },
        data: {
          sygnatura: newSygnatura,
          nrDecyzji: null, // Clear — needs re-scrape to get actual permit number
        },
      });
      fixCount++;
    }
  }

  const csvFile = "raport-fix-permit-numbers.csv";
  writeFileSync(csvFile, csvRows.join("\n"), "utf-8");
  console.log(`Raport: ${csvFile}`);
  console.log(`Rekordy z WRP w nrDecyzji: ${wrpInNr.length}`);
  if (!dryRun) {
    console.log(`Poprawiono: ${fixCount}`);
  } else {
    console.log("\n--- DRY RUN — nic nie zmieniono. Uruchom z --apply żeby poprawić. ---");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
