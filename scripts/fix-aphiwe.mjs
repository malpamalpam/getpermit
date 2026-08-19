/**
 * Fix Aphiwe (411): update base #384 with data from zezwolenie text, delete duplicate #405.
 *
 * Usage:
 *   node scripts/fix-aphiwe.mjs --dry-run
 *   node scripts/fix-aphiwe.mjs --run
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-aphiwe";
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}\n`);

  // Update base #384 — incomplete ZEZWOLENIE
  const base384 = await db.fdkEmploymentBase.findUnique({ where: { id: 384 } });
  if (base384) {
    console.log(`[#384] ZEZWOLENIE ${base384.status} ${base384.dataOd?.toISOString().slice(0, 10)} – ${base384.dataDo?.toISOString().slice(0, 10) ?? "—"}`);
    console.log("  → uzupełniam: dataDo=2025-06-18, firma, stanowisko, nrDecyzji, rodzajUmowy, wynagrodzenie");

    if (DO_RUN) {
      await db.fdkEmploymentBase.update({
        where: { id: 384 },
        data: {
          dataDo: new Date("2025-06-18"),
          firma: "FUNDACJA FIRMA DLA KAŻDEGO",
          stanowisko: "twórca podcastów edukacyjnych z języka angielskiego",
          nrDecyzji: "WRP-II.8671.33901.2024",
          rodzajUmowy: "Umowa o dzieło",
          wynagrodzenie: "4 530,00 PLN/miesięcznie",
        },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: 411,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: "Uzupełniono zezwolenie #384 z tekstu dokumentu: dataDo=2025-06-18, firma=FUNDACJA FIRMA DLA KAŻDEGO, stanowisko=twórca podcastów, nrDecyzji=WRP-II.8671.33901.2024, rodzajUmowy=Umowa o dzieło, wynagrodzenie=4530 PLN/mies.",
        },
      });
      console.log("  → zaktualizowano");
    }
  }

  // Delete duplicate base #405
  const base405 = await db.fdkEmploymentBase.findUnique({ where: { id: 405 } });
  if (base405) {
    console.log(`\n[#405] ZEZWOLENIE ${base405.status} ${base405.dataOd?.toISOString().slice(0, 10)} – ${base405.dataDo?.toISOString().slice(0, 10)} — duplikat z junk stanowiskiem`);
    console.log("  → usuwam duplikat");

    if (DO_RUN) {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: 411,
          changedBy: CHANGED_BY,
          field: "employment_base_delete",
          oldValue: JSON.stringify({ typ: base405.typ, dataOd: base405.dataOd, dataDo: base405.dataDo, stanowisko: base405.stanowisko }),
          newValue: "Usunięto duplikat zezwolenia #405 (junk stanowisko, dane pokrywają się z #384).",
        },
      });
      await db.fdkEmploymentBase.delete({ where: { id: 405 } });
      console.log("  → usunięto");
    }
  }

  if (!DO_RUN) console.log("\nUruchom z --run aby zastosować.\n");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
