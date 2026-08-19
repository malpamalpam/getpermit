/**
 * One-time fixes for specific foreigners.
 *
 * Usage:
 *   node scripts/fix-individual.mjs --dry-run
 *   node scripts/fix-individual.mjs --run
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-individual";
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}\n`);

  // === Abramova 223: Ochrona czasowa UKR ===
  {
    const f = await db.fdkForeigner.findUnique({ where: { id: 223 } });
    if (f) {
      console.log(`[Abramova 223] ${f.imie} ${f.nazwisko} — ochronaCzasowaUkr: ${f.ochronaCzasowaUkr}`);
      if (!f.ochronaCzasowaUkr) {
        if (DO_RUN) {
          await db.fdkForeigner.update({ where: { id: 223 }, data: { ochronaCzasowaUkr: true } });
          await db.fdkChangeLog.create({
            data: { foreignerId: 223, changedBy: CHANGED_BY, field: "ochronaCzasowaUkr", oldValue: "false", newValue: "Ustawiono Ochrona czasowa (UKR) — PESEL UKR / status ochrony." },
          });
          console.log("  → ustawiono ochronaCzasowaUkr = true");
        } else {
          console.log("  → DO USTAWIENIA");
        }
      } else {
        console.log("  → już ustawione");
      }
    }
  }

  // === Akagawa 190: DOSTEP_STUDENT ===
  {
    const f = await db.fdkForeigner.findUnique({ where: { id: 190 }, include: { employmentBases: true } });
    if (f) {
      console.log(`\n[Akagawa 190] ${f.imie} ${f.nazwisko}`);
      const hasStudent = f.employmentBases.some((b) => b.typ === "DOSTEP_STUDENT");
      if (!hasStudent) {
        if (DO_RUN) {
          await db.fdkEmploymentBase.create({
            data: { foreignerId: 190, typ: "DOSTEP_STUDENT", status: "AKTYWNE" },
          });
          await db.fdkChangeLog.create({
            data: { foreignerId: 190, changedBy: CHANGED_BY, field: "employment_base_create", oldValue: null, newValue: "Dodano DOSTEP_STUDENT — status studenta, otwarty dostęp do rynku pracy (okresowy)." },
          });
          console.log("  → dodano DOSTEP_STUDENT AKTYWNE");
        } else {
          console.log("  → DO DODANIA DOSTEP_STUDENT");
        }
      } else {
        console.log("  → już ma DOSTEP_STUDENT");
      }
    }
  }

  // === Adewoyin 7: Uchyl Blue Card z datą 2026-03-09 ===
  {
    const f = await db.fdkForeigner.findUnique({ where: { id: 7 }, include: { employmentBases: true } });
    if (f) {
      console.log(`\n[Adewoyin 7] ${f.imie} ${f.nazwisko}`);
      const blueCard = f.employmentBases.find((b) => b.typ === "BLUE_CARD" && b.status !== "UCHYLONE");
      if (blueCard) {
        console.log(`  Blue Card #${blueCard.id}: ${blueCard.status} ${blueCard.dataOd?.toISOString().slice(0, 10)} – ${blueCard.dataDo?.toISOString().slice(0, 10)}`);
        if (DO_RUN) {
          await db.fdkEmploymentBase.update({
            where: { id: blueCard.id },
            data: { status: "UCHYLONE", uchylenie: "Uchylenie WP 09.03.2026 (plik: Adewoyin uchylenie WP 09.03.26)" },
          });
          await db.fdkChangeLog.create({
            data: { foreignerId: 7, changedBy: CHANGED_BY, field: "employment_base_update", oldValue: blueCard.status, newValue: `Blue Card #${blueCard.id} → UCHYLONE (uchylenie WP 09.03.2026)` },
          });
          console.log("  → status zmieniony na UCHYLONE");
        } else {
          console.log("  → DO UCHYLENIA");
        }
      } else {
        console.log("  → brak aktywnej Blue Card (już uchylona?)");
      }
    }
  }

  if (!DO_RUN) console.log("\nUruchom z --run aby zastosować.\n");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
