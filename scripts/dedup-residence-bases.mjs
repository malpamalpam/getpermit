/**
 * Pkt 7: Deduplicate residence bases.
 *
 * Rules:
 * - One record per decision/permit. Key = (foreignerId, typ, nrDecyzji) or (foreignerId, typ, dataDo).
 * - Decision + card for the same permit = one record (merge nrKartyPobytu from card into decision row).
 * - "BRAK_DANYCH" with no useful data → delete.
 * - Keep row with most data, merge fields from duplicate.
 *
 * Usage:
 *   node scripts/dedup-residence-bases.mjs --dry-run
 *   node scripts/dedup-residence-bases.mjs --apply
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const dryRun = !process.argv.includes("--apply");

function score(r) {
  let s = 0;
  if (r.dataOd) s++;
  if (r.dataDo) s++;
  if (r.nrDecyzji) s += 2;
  if (r.nrKartyPobytu) s += 2;
  if (r.urzad) s++;
  if (r.nrWizy) s++;
  if (r.sourceAttachmentId) s++;
  if (r.status !== "BRAK_DANYCH") s++;
  return s;
}

async function main() {
  console.log(`=== Dedup residence bases — ${dryRun ? "DRY RUN" : "APPLY"} ===\n`);

  const all = await prisma.fdkResidenceBasis.findMany({
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
    orderBy: [{ foreignerId: "asc" }, { typ: "asc" }, { dataDo: "desc" }],
  });

  // Group by foreignerId + typ + dedup key
  const groups = new Map();
  for (const r of all) {
    // Key: prefer nrDecyzji, then dataDo
    const dedupKey = r.nrDecyzji
      ? `${r.foreignerId}|${r.typ}|nr:${r.nrDecyzji}`
      : r.dataDo
        ? `${r.foreignerId}|${r.typ}|do:${r.dataDo.toISOString().slice(0, 10)}`
        : `${r.foreignerId}|${r.typ}|id:${r.id}`; // unique → no dedup
    const group = groups.get(dedupKey) ?? [];
    group.push(r);
    groups.set(dedupKey, group);
  }

  const csvRows = ["action,keepId,deleteId,foreignerId,foreigner,typ,nrDecyzji,dataDo,mergedFields"];
  let deleteCount = 0;
  let mergeCount = 0;

  for (const [, group] of groups) {
    if (group.length <= 1) continue;

    // Sort by score desc — keep the best record
    group.sort((a, b) => score(b) - score(a));
    const keep = group[0];
    const dupes = group.slice(1);
    const name = `${keep.foreigner.imie ?? ""} ${keep.foreigner.nazwisko}`.trim();

    for (const dupe of dupes) {
      // Merge useful fields from dupe into keep
      const mergedFields = [];
      if (!keep.nrKartyPobytu && dupe.nrKartyPobytu) { keep.nrKartyPobytu = dupe.nrKartyPobytu; mergedFields.push("nrKartyPobytu"); }
      if (!keep.kartaPobytuWaznaDo && dupe.kartaPobytuWaznaDo) { keep.kartaPobytuWaznaDo = dupe.kartaPobytuWaznaDo; mergedFields.push("kartaPobytuWaznaDo"); }
      if (!keep.nrWizy && dupe.nrWizy) { keep.nrWizy = dupe.nrWizy; mergedFields.push("nrWizy"); }
      if (!keep.urzad && dupe.urzad) { keep.urzad = dupe.urzad; mergedFields.push("urzad"); }
      if (!keep.dataOd && dupe.dataOd) { keep.dataOd = dupe.dataOd; mergedFields.push("dataOd"); }
      if (!keep.dataDo && dupe.dataDo) { keep.dataDo = dupe.dataDo; mergedFields.push("dataDo"); }
      if (!keep.nrDecyzji && dupe.nrDecyzji) { keep.nrDecyzji = dupe.nrDecyzji; mergedFields.push("nrDecyzji"); }

      csvRows.push([
        "DELETE_DUPE", keep.id, dupe.id, keep.foreignerId, `"${name}"`, keep.typ,
        keep.nrDecyzji ?? "", keep.dataDo?.toISOString().slice(0, 10) ?? "",
        mergedFields.join("+") || "none",
      ].join(","));
      deleteCount++;

      if (mergedFields.length > 0) mergeCount++;
    }

    // Update keep with merged fields
    if (!dryRun) {
      const updateData = {};
      if (keep.nrKartyPobytu) updateData.nrKartyPobytu = keep.nrKartyPobytu;
      if (keep.kartaPobytuWaznaDo) updateData.kartaPobytuWaznaDo = keep.kartaPobytuWaznaDo;
      if (keep.nrWizy) updateData.nrWizy = keep.nrWizy;
      if (keep.urzad) updateData.urzad = keep.urzad;
      if (keep.dataOd) updateData.dataOd = keep.dataOd;
      if (keep.dataDo) updateData.dataDo = keep.dataDo;
      if (keep.nrDecyzji) updateData.nrDecyzji = keep.nrDecyzji;
      if (Object.keys(updateData).length > 0) {
        await prisma.fdkResidenceBasis.update({ where: { id: keep.id }, data: updateData });
      }
      // Delete duplicates
      for (const dupe of dupes) {
        await prisma.fdkResidenceBasis.delete({ where: { id: dupe.id } });
      }
    }
  }

  // Also find and delete "BRAK_DANYCH" records with no useful data
  const emptyBrak = all.filter(
    (r) => r.status === "BRAK_DANYCH" && !r.nrDecyzji && !r.nrKartyPobytu && !r.nrWizy && !r.dataOd && !r.dataDo
  );
  for (const r of emptyBrak) {
    const name = `${r.foreigner.imie ?? ""} ${r.foreigner.nazwisko}`.trim();
    csvRows.push([
      "DELETE_EMPTY", "", r.id, r.foreignerId, `"${name}"`, r.typ, "", "", "",
    ].join(","));
    deleteCount++;
    if (!dryRun) {
      await prisma.fdkResidenceBasis.delete({ where: { id: r.id } }).catch(() => {}); // may already be deleted as dupe
    }
  }

  const csvFile = "raport-dedup-residence.csv";
  writeFileSync(csvFile, csvRows.join("\n"), "utf-8");
  console.log(`Raport: ${csvFile}`);
  console.log(`Duplikaty do usunięcia: ${deleteCount}`);
  console.log(`Rekordy z połączonymi polami: ${mergeCount}`);
  console.log(`Puste BRAK_DANYCH: ${emptyBrak.length}`);

  if (dryRun) {
    console.log("\n--- DRY RUN. Uruchom z --apply żeby zastosować. ---");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
