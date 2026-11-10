/**
 * Pkt 6: Cleanup empty/false records — delete employment bases and residence bases
 * that have NO document number AND NO validity period AND NO linked source file.
 *
 * Rule: rekord bez numeru LUB bez okresu, a także rekord, którego nie da się
 * powiązać z konkretnym plikiem źródłowym, jest usuwany fizycznie.
 * Wyjątek: rekord z plikiem źródłowym, w którym brakuje danych — wtedy dane
 * uzupełnij ze źródła (pkt 4 — handled separately).
 *
 * Usage:
 *   node scripts/cleanup-empty-bases.mjs --dry-run   → raport CSV, nic nie kasuje
 *   node scripts/cleanup-empty-bases.mjs --apply      → kasowanie + raport
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const dryRun = !process.argv.includes("--apply");

async function main() {
  console.log(`=== Cleanup empty bases — ${dryRun ? "DRY RUN" : "APPLY"} ===\n`);

  // --- Employment bases ---
  const emptyEmployment = await prisma.fdkEmploymentBase.findMany({
    where: {
      // No document number
      nrDecyzji: null,
      nrOswiadczenia: null,
      // No period
      dataOd: null,
      dataDo: null,
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  // Split: has source file (keep but flag) vs no source file (delete)
  const empToDelete = emptyEmployment.filter((b) => !b.sourceAttachmentId);
  const empWithSource = emptyEmployment.filter((b) => !!b.sourceAttachmentId);

  // Also find records with no number AND no source file (even if they have dates)
  const noNumberNoSource = await prisma.fdkEmploymentBase.findMany({
    where: {
      nrDecyzji: null,
      nrOswiadczenia: null,
      sourceAttachmentId: null,
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });
  // Add those that are not already in empToDelete (they might have dates)
  const empToDeleteIds = new Set(empToDelete.map((b) => b.id));
  for (const b of noNumberNoSource) {
    if (!empToDeleteIds.has(b.id)) {
      empToDelete.push(b);
      empToDeleteIds.add(b.id);
    }
  }

  // --- Residence bases ---
  const emptyResidence = await prisma.fdkResidenceBasis.findMany({
    where: {
      nrDecyzji: null,
      nrWizy: null,
      nrKartyPobytu: null,
      dataOd: null,
      dataDo: null,
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });

  const restoDelete = emptyResidence.filter((b) => !b.sourceAttachmentId);
  const resWithSource = emptyResidence.filter((b) => !!b.sourceAttachmentId);

  // Also residence bases with no number AND no source
  const resNoNumberNoSource = await prisma.fdkResidenceBasis.findMany({
    where: {
      nrDecyzji: null,
      nrWizy: null,
      nrKartyPobytu: null,
      sourceAttachmentId: null,
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true } },
    },
  });
  const resToDeleteIds = new Set(restoDelete.map((b) => b.id));
  for (const b of resNoNumberNoSource) {
    if (!resToDeleteIds.has(b.id)) {
      restoDelete.push(b);
      resToDeleteIds.add(b.id);
    }
  }

  // --- Report ---
  const csvRows = ["table,id,foreignerId,foreigner,typ,status,dataOd,dataDo,nrDecyzji,sourceAttachmentId,action"];

  for (const b of empToDelete) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    csvRows.push([
      "employment_bases", b.id, b.foreignerId, `"${name}"`, b.typ, b.status,
      b.dataOd?.toISOString().slice(0, 10) ?? "", b.dataDo?.toISOString().slice(0, 10) ?? "",
      b.nrDecyzji ?? b.nrOswiadczenia ?? "", b.sourceAttachmentId ?? "",
      "DELETE",
    ].join(","));
  }

  for (const b of empWithSource) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    csvRows.push([
      "employment_bases", b.id, b.foreignerId, `"${name}"`, b.typ, b.status,
      b.dataOd?.toISOString().slice(0, 10) ?? "", b.dataDo?.toISOString().slice(0, 10) ?? "",
      b.nrDecyzji ?? b.nrOswiadczenia ?? "", b.sourceAttachmentId ?? "",
      "KEEP_HAS_SOURCE",
    ].join(","));
  }

  for (const b of restoDelete) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    csvRows.push([
      "residence_bases", b.id, b.foreignerId, `"${name}"`, b.typ, b.status,
      b.dataOd?.toISOString().slice(0, 10) ?? "", b.dataDo?.toISOString().slice(0, 10) ?? "",
      b.nrDecyzji ?? b.nrWizy ?? b.nrKartyPobytu ?? "", b.sourceAttachmentId ?? "",
      "DELETE",
    ].join(","));
  }

  for (const b of resWithSource) {
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    csvRows.push([
      "residence_bases", b.id, b.foreignerId, `"${name}"`, b.typ, b.status,
      b.dataOd?.toISOString().slice(0, 10) ?? "", b.dataDo?.toISOString().slice(0, 10) ?? "",
      b.nrDecyzji ?? b.nrWizy ?? b.nrKartyPobytu ?? "", b.sourceAttachmentId ?? "",
      "KEEP_HAS_SOURCE",
    ].join(","));
  }

  const csvFile = `raport-cleanup-empty-bases.csv`;
  writeFileSync(csvFile, csvRows.join("\n"), "utf-8");
  console.log(`Raport: ${csvFile}`);
  console.log(`Employment bases: ${empToDelete.length} do usunięcia, ${empWithSource.length} z plikiem źródłowym (do uzupełnienia)`);
  console.log(`Residence bases: ${restoDelete.length} do usunięcia, ${resWithSource.length} z plikiem źródłowym (do uzupełnienia)`);

  if (!dryRun) {
    // Delete employment bases
    if (empToDelete.length > 0) {
      const ids = empToDelete.map((b) => b.id);
      const result = await prisma.fdkEmploymentBase.deleteMany({ where: { id: { in: ids } } });
      console.log(`\nUsunięto ${result.count} pustych employment bases`);
    }
    // Delete residence bases
    if (restoDelete.length > 0) {
      const ids = restoDelete.map((b) => b.id);
      const result = await prisma.fdkResidenceBasis.deleteMany({ where: { id: { in: ids } } });
      console.log(`Usunięto ${result.count} pustych residence bases`);
    }
  } else {
    console.log("\n--- DRY RUN — nic nie usunięto. Uruchom z --apply żeby usunąć. ---");
  }

  // --- Final COUNT verification ---
  const countEmpEmpty = await prisma.fdkEmploymentBase.count({
    where: {
      nrDecyzji: null, nrOswiadczenia: null,
      dataOd: null, dataDo: null,
    },
  });
  const countResEmpty = await prisma.fdkResidenceBasis.count({
    where: {
      nrDecyzji: null, nrWizy: null, nrKartyPobytu: null,
      dataOd: null, dataDo: null,
    },
  });
  console.log(`\nCOUNT employment bases (no number AND no period): ${countEmpEmpty}`);
  console.log(`COUNT residence bases (no number AND no period): ${countResEmpty}`);

  // Count records without source file (excluding manually added)
  const countEmpNoSource = await prisma.fdkEmploymentBase.count({
    where: { sourceAttachmentId: null },
  });
  const countResNoSource = await prisma.fdkResidenceBasis.count({
    where: { sourceAttachmentId: null },
  });
  console.log(`COUNT employment bases without source file: ${countEmpNoSource}`);
  console.log(`COUNT residence bases without source file: ${countResNoSource}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
