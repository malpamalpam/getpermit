/**
 * Pkt 2: Reclassify employment bases with WRP-... nrDecyzji from TRC/TRC-FDK to ZEZWOLENIE_A.
 *
 * Rule: Dokument z sygnaturą WRP-… to ZAWSZE zezwolenie na pracę (typ A/B/…), nigdy TRC.
 * Also reclassifies residence bases with same pattern.
 *
 * Usage:
 *   node scripts/reclassify-wrp-to-zezwolenie.mjs --dry-run
 *   node scripts/reclassify-wrp-to-zezwolenie.mjs --apply
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const dryRun = !process.argv.includes("--apply");

async function main() {
  console.log(`=== Reclassify WRP → ZEZWOLENIE_A — ${dryRun ? "DRY RUN" : "APPLY"} ===\n`);

  // Employment bases: TRC/TRC-FDK/KARTA_POBYTU with nrDecyzji starting with WRP
  const empWrp = await prisma.fdkEmploymentBase.findMany({
    where: {
      nrDecyzji: { startsWith: "WRP" },
      typ: { notIn: ["ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "ZEZWOLENIE"] },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  // Residence bases with WRP
  const resWrp = await prisma.fdkResidenceBasis.findMany({
    where: {
      nrDecyzji: { startsWith: "WRP" },
      typ: { notIn: ["ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT", "ZEZWOLENIE"] },
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  const csvRows = ["table,id,foreignerId,foreigner,oldTyp,newTyp,nrDecyzji,dataOd,dataDo"];

  for (const b of empWrp) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    csvRows.push([
      "employment_bases", b.id, b.foreignerId, `"${name}"`, b.typ, "ZEZWOLENIE_A",
      b.nrDecyzji ?? "", b.dataOd?.toISOString().slice(0, 10) ?? "",
      b.dataDo?.toISOString().slice(0, 10) ?? "",
    ].join(","));
  }

  for (const b of resWrp) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    csvRows.push([
      "residence_bases", b.id, b.foreignerId, `"${name}"`, b.typ, "ZEZWOLENIE_A",
      b.nrDecyzji ?? "", b.dataOd?.toISOString().slice(0, 10) ?? "",
      b.dataDo?.toISOString().slice(0, 10) ?? "",
    ].join(","));
  }

  const csvFile = "raport-reclassify-wrp.csv";
  writeFileSync(csvFile, csvRows.join("\n"), "utf-8");
  console.log(`Raport: ${csvFile}`);
  console.log(`Employment bases z WRP: ${empWrp.length}`);
  console.log(`Residence bases z WRP: ${resWrp.length}`);

  if (!dryRun) {
    for (const b of empWrp) {
      await prisma.fdkEmploymentBase.update({
        where: { id: b.id },
        data: { typ: "ZEZWOLENIE_A" },
      });
    }
    console.log(`Przeklasyfikowano ${empWrp.length} employment bases`);

    for (const b of resWrp) {
      await prisma.fdkResidenceBasis.update({
        where: { id: b.id },
        data: { typ: "ZEZWOLENIE_A" },
      });
    }
    console.log(`Przeklasyfikowano ${resWrp.length} residence bases`);
  } else {
    console.log("\n--- DRY RUN — nic nie zmieniono. Uruchom z --apply żeby zmienić. ---");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
