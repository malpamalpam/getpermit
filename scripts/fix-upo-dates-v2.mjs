/**
 * Fix UPO dates stored as T22:00:00Z (local CET midnight) → T12:00:00Z (correct UTC noon).
 * Shifts each date forward by adding 14 hours so the UTC date matches the intended calendar date.
 *
 * Usage:
 *   node scripts/fix-upo-dates-v2.mjs --dry-run
 *   node scripts/fix-upo-dates-v2.mjs --run
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}\n`);

  const foreigners = await db.fdkForeigner.findMany({
    where: { upoDoreczone: { not: null } },
    select: { id: true, imie: true, nazwisko: true, upoDoreczone: true, upoUwagi: true },
  });

  let fixed = 0;
  for (const f of foreigners) {
    const d = f.upoDoreczone;
    const hours = d.getUTCHours();

    // Only fix dates at 22:00 UTC (= local CET midnight, shifted by -2h)
    if (hours !== 22) {
      console.log(`  [OK] id=${f.id} ${f.imie} ${f.nazwisko} — ${d.toISOString()} (hours=${hours}, nie wymaga fix)`);
      continue;
    }

    // Add 14 hours: 22:00 + 14h = 12:00 next day (correct UTC noon)
    const corrected = new Date(d.getTime() + 14 * 60 * 60 * 1000);
    const oldStr = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
    const newStr = `${String(corrected.getUTCDate()).padStart(2, "0")}.${String(corrected.getUTCMonth() + 1).padStart(2, "0")}.${corrected.getUTCFullYear()}`;

    console.log(`  [FIX] id=${f.id} ${f.imie} ${f.nazwisko}: ${oldStr} → ${newStr} (${d.toISOString()} → ${corrected.toISOString()})`);

    if (DO_RUN) {
      await db.fdkForeigner.update({
        where: { id: f.id },
        data: { upoDoreczone: corrected },
      });
    }
    fixed++;
  }

  console.log(`\nDo naprawienia: ${fixed}`);
  if (!DO_RUN && fixed > 0) console.log("Uruchom z --run aby zastosować.\n");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
