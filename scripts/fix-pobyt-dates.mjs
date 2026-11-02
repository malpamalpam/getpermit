/**
 * Przelicz decyzjaPobytowaDo na podstawie AKTYWNYCH KARTA_POBYTU / BLUE_CARD.
 * Jeśli podstawa ma dataDo nowszą niż decyzjaPobytowaDo w profilu — zaktualizuj.
 *
 * node scripts/fix-pobyt-dates.mjs          # dry run
 * node scripts/fix-pobyt-dates.mjs --apply  # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DO_APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DRY RUN"}\n`);

  const foreigners = await db.fdkForeigner.findMany({
    include: { employmentBases: true },
  });

  let updated = 0;
  const changes = [];

  for (const f of foreigners) {
    // Find the best (newest) KARTA_POBYTU or BLUE_CARD dataDo
    const residenceBases = f.employmentBases.filter(
      (b) => (b.typ === "KARTA_POBYTU" || b.typ === "BLUE_CARD") && b.dataDo
    );
    if (residenceBases.length === 0) continue;

    // Newest dataDo
    residenceBases.sort((a, b) => b.dataDo.getTime() - a.dataDo.getTime());
    const bestDate = residenceBases[0].dataDo;

    const currentDate = f.decyzjaPobytowaDo;

    // Update if:
    // 1. No current date, OR
    // 2. Best base date is NEWER than current (never go backwards)
    if (!currentDate || bestDate.getTime() > currentDate.getTime()) {
      changes.push({
        id: f.id,
        name: `${f.imie} ${f.nazwisko}`,
        old: currentDate?.toISOString().slice(0, 10) ?? "brak",
        new: bestDate.toISOString().slice(0, 10),
        baseId: residenceBases[0].id,
        nrDecyzji: residenceBases[0].nrDecyzji,
      });

      if (DO_APPLY) {
        await db.fdkForeigner.update({
          where: { id: f.id },
          data: { decyzjaPobytowaDo: bestDate },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: f.id,
            changedBy: "fix-pobyt-dates",
            field: "decyzjaPobytowaDo",
            oldValue: currentDate?.toISOString().slice(0, 10) ?? null,
            newValue: `${bestDate.toISOString().slice(0, 10)} (z podstawy #${residenceBases[0].id})`,
          },
        });
      }
      updated++;
    }
  }

  console.log(`Zmian: ${updated}\n`);
  for (const c of changes) {
    console.log(`  id=${c.id} ${c.name}: ${c.old} → ${c.new} (podstawa #${c.baseId} ${c.nrDecyzji ?? ""})`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
