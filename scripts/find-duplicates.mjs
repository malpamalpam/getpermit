/**
 * Find duplicate attachments within each foreigner profile.
 *
 * Detects duplicates by exact filename match (nazwaPliku).
 * Shows which ones to keep (first uploaded) and which to remove.
 *
 * Usage:
 *   node scripts/find-duplicates.mjs                # report only
 *   node scripts/find-duplicates.mjs --apply        # delete duplicates
 *   node scripts/find-duplicates.mjs --id 142       # check only profile #142
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const idFlag = process.argv.indexOf("--id");
const onlyId = idFlag >= 0 ? parseInt(process.argv[idFlag + 1], 10) : null;

async function main() {
  console.log(`Mode: ${APPLY ? "DELETE DUPLICATES" : "REPORT ONLY"}\n`);

  const where = onlyId ? { id: onlyId } : {};
  const foreigners = await db.fdkForeigner.findMany({
    where,
    select: {
      id: true,
      imie: true,
      nazwisko: true,
      attachments: {
        select: { id: true, nazwaPliku: true, folder: true, uploadedAt: true },
        orderBy: { uploadedAt: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });

  let totalDups = 0;
  let totalProfiles = 0;

  for (const f of foreigners) {
    // Group by filename
    const byName = new Map();
    for (const a of f.attachments) {
      const key = a.nazwaPliku;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(a);
    }

    const dups = [...byName.entries()].filter(([, list]) => list.length >= 2);
    if (dups.length === 0) continue;

    totalProfiles++;
    const person = `${f.imie ?? ""} ${f.nazwisko}`.trim();
    console.log(`\n=== #${f.id} ${person} — ${dups.length} zdublowanych nazw ===`);

    for (const [filename, copies] of dups) {
      console.log(`  "${filename}" — ${copies.length} kopii`);
      const [keep, ...remove] = copies;
      console.log(`    [KEEP]   att#${keep.id}  folder=${keep.folder ?? "-"}  uploaded=${keep.uploadedAt.toISOString().slice(0, 16)}`);
      for (const dup of remove) {
        console.log(`    [DELETE] att#${dup.id}  folder=${dup.folder ?? "-"}  uploaded=${dup.uploadedAt.toISOString().slice(0, 16)}`);
        totalDups++;
        if (APPLY) {
          await db.fdkAttachment.delete({ where: { id: dup.id } });
          await db.fdkChangeLog.create({
            data: {
              foreignerId: f.id,
              changedBy: "find-duplicates",
              field: "attachment_deleted",
              oldValue: `att#${dup.id} ${filename} folder=${dup.folder ?? "-"}`,
              newValue: `Duplikat usunięty (zachowano att#${keep.id})`,
            },
          });
        }
      }
    }
  }

  console.log(`\n--- Podsumowanie ---`);
  console.log(`Profile z duplikatami: ${totalProfiles}`);
  console.log(`Duplikaty do usunięcia: ${totalDups}`);
  if (!APPLY && totalDups > 0) console.log("Uruchom z --apply żeby usunąć.");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
