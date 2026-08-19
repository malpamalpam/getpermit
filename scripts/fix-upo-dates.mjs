/**
 * Fix UPO dates shifted by -1 day due to local timezone parsing.
 * Reads _zestawienie_UPO.csv and updates upoDoreczone with correct UTC date.
 *
 * Usage:
 *   node scripts/fix-upo-dates.mjs "C:\Users\gstep\Desktop\Cudzoziemcy ALl\UPO MOS" --dry-run
 *   node scripts/fix-upo-dates.mjs "C:\Users\gstep\Desktop\Cudzoziemcy ALl\UPO MOS" --run
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const args = process.argv.slice(2);
const sourceDir = args.find((a) => !a.startsWith("--"));
const DO_RUN = args.includes("--run");

function normalizeNameTokens(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-_]/g, " ").split(/\s+/).filter(Boolean).sort();
}

async function main() {
  console.log(`Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}\n`);

  const csvFile = fs.readdirSync(sourceDir).find((f) => f.endsWith(".csv"));
  const raw = fs.readFileSync(path.join(sourceDir, csvFile), "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  // Load foreigners with upoDoreczone set
  const foreigners = await db.fdkForeigner.findMany({
    where: { upoDoreczone: { not: null } },
    select: { id: true, imie: true, nazwisko: true, upoDoreczone: true },
  });

  const fMap = new Map();
  for (const f of foreigners) {
    const key = normalizeNameTokens(`${f.imie ?? ""} ${f.nazwisko}`).join("|");
    fMap.set(key, f);
  }

  let fixed = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";").map((c) => c.replace(/"/g, "").trim());
    if (cols.length < 5) continue;

    const nadawca = cols[1];
    const dateStr = cols[4];
    const m = dateStr.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (!m) continue;

    const correctDate = new Date(Date.UTC(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]), 12));
    const correctStr = correctDate.toISOString().slice(0, 10);

    // Match
    const key = normalizeNameTokens(nadawca).join("|");
    let foreigner = fMap.get(key);

    // Subset match if exact fails
    if (!foreigner) {
      const nadTokens = normalizeNameTokens(nadawca);
      for (const [k, f] of fMap.entries()) {
        const dbTokens = k.split("|");
        if (nadTokens.every((t) => dbTokens.includes(t)) || dbTokens.every((t) => nadTokens.includes(t))) {
          foreigner = f;
          break;
        }
      }
    }

    if (!foreigner) continue;

    const currentStr = foreigner.upoDoreczone?.toISOString().slice(0, 10);
    const currentDay = foreigner.upoDoreczone ? String(foreigner.upoDoreczone.getUTCDate()).padStart(2, "0") + "." + String(foreigner.upoDoreczone.getUTCMonth() + 1).padStart(2, "0") + "." + foreigner.upoDoreczone.getUTCFullYear() : "—";

    if (currentStr === correctStr) {
      console.log(`  [OK] ${nadawca} — ${currentDay} (poprawna)`);
      continue;
    }

    const correctDay = `${m[1].padStart(2, "0")}.${m[2].padStart(2, "0")}.${m[3]}`;
    console.log(`  [FIX] ${nadawca}: ${currentDay} → ${correctDay}`);

    if (DO_RUN) {
      const upoUwagi = `Przedłużenie TRC — wniosek doręczony ${correctDay}, ${cols[3]}`;
      await db.fdkForeigner.update({
        where: { id: foreigner.id },
        data: { upoDoreczone: correctDate, upoUwagi },
      });
      console.log(`    → zaktualizowano`);
    }

    fixed++;
  }

  console.log(`\nDo naprawienia: ${fixed}`);
  if (!DO_RUN && fixed > 0) console.log("Uruchom z --run aby zastosować.\n");

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
