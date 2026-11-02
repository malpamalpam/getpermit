/**
 * Batch fixes: Afrasiyabov, Abrahimovich, Abramchuk, Habyshava
 *
 * node scripts/fix-remaining-batch.mjs          # dry run
 * node scripts/fix-remaining-batch.mjs --apply  # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DO_APPLY = process.argv.includes("--apply");
const CHANGED_BY = "fix-remaining-batch";

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DRY RUN"}\n`);

  // === 1. Afrasiyabov #424 — deactivate (duplicate with wrong data) ===
  console.log("=== 1. Afrasiyabov #424 → UCHYLONE ===");
  const b424 = await db.fdkEmploymentBase.findUnique({ where: { id: 424 } });
  if (b424 && b424.status === "AKTYWNE") {
    console.log(`  #424 ${b424.typ} ${b424.status} stawka=${Number(b424.stawka)} → UCHYLONE`);
    if (DO_APPLY) {
      await db.fdkEmploymentBase.update({ where: { id: 424 }, data: { status: "UCHYLONE" } });
      await db.fdkChangeLog.create({
        data: { foreignerId: 211, changedBy: CHANGED_BY, field: "employment_base_fix",
          oldValue: "AKTYWNE", newValue: "#424 → UCHYLONE — duplikat z błędnymi danymi (stawka 4300, usługi programistyczne)" },
      });
    }
  }

  // === 2. Abrahimovich — diagnoza ===
  console.log("\n=== 2. Abrahimovich (id=378) — diagnoza załączników ===");
  const abrAtts = await db.fdkAttachment.findMany({
    where: { foreignerId: 378, kategoria: { in: ["glowne", "trc"] } },
    orderBy: { id: "asc" },
  });
  console.log(`  Załączników (glowne/trc): ${abrAtts.length}`);
  for (const a of abrAtts) {
    console.log(`  att=${a.id} "${a.nazwaPliku}" (${a.typPliku}) opis="${a.opis ?? ""}"`);
  }
  // Check scrape logs
  const abrLogs = await db.fdkChangeLog.findMany({
    where: { foreignerId: 378, field: "scrape" },
    orderBy: { changedAt: "desc" },
    take: 10,
  });
  console.log(`  Logi scrape:`);
  for (const l of abrLogs) {
    console.log(`    ${l.changedAt?.toISOString().slice(0, 19)} [${l.changedBy}]: ${l.newValue?.substring(0, 120)}`);
  }

  // === 2b. Abrahimovich — Karta Polaka, nie karta pobytu ===
  console.log("\n=== 2b. Abrahimovich — #289, #291 KARTA_POBYTU → DOSTEP_KARTA_POLAKA ===");
  for (const baseId of [289, 291]) {
    const b = await db.fdkEmploymentBase.findUnique({ where: { id: baseId } });
    if (b && b.typ === "KARTA_POBYTU") {
      console.log(`  #${baseId} KARTA_POBYTU → DOSTEP_KARTA_POLAKA`);
      if (DO_APPLY) {
        await db.fdkEmploymentBase.update({ where: { id: baseId }, data: { typ: "DOSTEP_KARTA_POLAKA" } });
        await db.fdkChangeLog.create({
          data: { foreignerId: 378, changedBy: CHANGED_BY, field: "employment_base_fix",
            oldValue: "KARTA_POBYTU", newValue: `#${baseId} → DOSTEP_KARTA_POLAKA — plik to Karta Polaka, nie karta pobytu` },
        });
      }
    }
  }
  // Keep only one — deactivate older #289
  console.log("  #289 → NIEAKTYWNE (duplikat #291)");
  if (DO_APPLY) {
    await db.fdkEmploymentBase.update({ where: { id: 289 }, data: { status: "NIEAKTYWNE" } });
  }

  // === 3. Abramchuk — add ochrona uzupełniająca ===
  console.log("\n=== 3. Abramchuk (id=379) — ochrona uzupełniająca ===");
  const abcExisting = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 379, typ: "DOSTEP_OCHRONA_MIEDZ" },
  });
  if (abcExisting.length > 0) {
    console.log(`  Już ma DOSTEP_OCHRONA_MIEDZ (#${abcExisting[0].id}) — pomijam`);
  } else {
    console.log(`  Dodaję DOSTEP_OCHRONA_MIEDZ (ochrona uzupełniająca) → swobodny dostęp do pracy`);
    if (DO_APPLY) {
      const base = await db.fdkEmploymentBase.create({
        data: { foreignerId: 379, typ: "DOSTEP_OCHRONA_MIEDZ", status: "AKTYWNE",
          firma: "Ochrona uzupełniająca" },
      });
      await db.fdkChangeLog.create({
        data: { foreignerId: 379, changedBy: CHANGED_BY, field: "employment_base_create",
          oldValue: null, newValue: `Utworzono #${base.id} DOSTEP_OCHRONA_MIEDZ — ochrona uzupełniająca, swobodny dostęp do rynku pracy` },
      });
      console.log(`  → Utworzono #${base.id}`);
    }
  }

  // === 4. Habyshava #1211 — wyczyść nr paszportu z nrDecyzji ===
  console.log("\n=== 4. Habyshava #1211 — nr paszportu w nrDecyzji ===");
  const b1211 = await db.fdkEmploymentBase.findUnique({ where: { id: 1211 } });
  if (b1211 && b1211.nrDecyzji && /^[A-Z]{2}\d{6,}$/i.test(b1211.nrDecyzji)) {
    console.log(`  #1211 nrDecyzji="${b1211.nrDecyzji}" → null (nr paszportu, nie decyzji)`);
    if (DO_APPLY) {
      await db.fdkEmploymentBase.update({ where: { id: 1211 }, data: { nrDecyzji: null } });
      await db.fdkChangeLog.create({
        data: { foreignerId: b1211.foreignerId, changedBy: CHANGED_BY, field: "employment_base_fix",
          oldValue: `nrDecyzji=${b1211.nrDecyzji}`, newValue: "Wyczyszczono nrDecyzji — zawierał nr paszportu" },
      });
    }
  }

  // === 5. Abubakarov #314 — check if nr paszportu is in nrOswiadczenia ===
  console.log("\n=== 5. Abubakarov #314 ===");
  const b314 = await db.fdkEmploymentBase.findUnique({ where: { id: 314 } });
  if (b314) {
    console.log(`  #314 typ=${b314.typ} nrOsw="${b314.nrOswiadczenia}" nrDec="${b314.nrDecyzji}"`);
    // Check which field has passport number
    const f336 = await db.fdkForeigner.findUnique({ where: { id: 336 }, select: { nrPaszportu: true } });
    if (f336?.nrPaszportu) {
      if (b314.nrOswiadczenia?.includes(f336.nrPaszportu)) {
        console.log(`  nrOswiadczenia zawiera nr paszportu "${f336.nrPaszportu}" → czyść`);
        if (DO_APPLY) {
          await db.fdkEmploymentBase.update({ where: { id: 314 }, data: { nrOswiadczenia: null } });
        }
      }
      if (b314.nrDecyzji?.includes(f336.nrPaszportu)) {
        console.log(`  nrDecyzji zawiera nr paszportu "${f336.nrPaszportu}" → czyść`);
        if (DO_APPLY) {
          await db.fdkEmploymentBase.update({ where: { id: 314 }, data: { nrDecyzji: null } });
        }
      }
    }
  }

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
