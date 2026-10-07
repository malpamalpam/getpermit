import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const CHANGED_BY = "fix-142-v2";

async function main() {
  console.log("=== Profil 142 — porządkowanie podstaw ===\n");

  // What should stay:
  // - #3410 TRC_FDK 2026-06-10 → 2029-06-10 = AKTYWNE (jedyne aktywne TRC)
  // - #2645 OSWIADCZENIE PZC.4390.15578.RM.2025 od=2025-10-01 = AKTYWNE (umowa zlecenie, ważne)
  // Everything else: set to proper status

  // 1. Fix #3410 TRC_FDK → AKTYWNE
  await db.fdkEmploymentBase.update({ where: { id: 3410 }, data: { status: "AKTYWNE" } });
  console.log("  #3410 TRC_FDK → AKTYWNE");

  // 2. #2645 OSWIADCZENIE already AKTYWNE — OK
  console.log("  #2645 OSWIADCZENIE — already AKTYWNE ✓");

  // 3. Deactivate/expire false aktywne bases
  const toDeactivate = [165, 182, 2647]; // empty oświadczenia marked AKTYWNE but no real data
  for (const id of toDeactivate) {
    const b = await db.fdkEmploymentBase.findUnique({ where: { id } });
    if (!b || b.foreignerId !== 142) continue;
    console.log(`  #${id} ${b.typ} status=${b.status} → NIEAKTYWNE (puste/historyczne)`);
    await db.fdkEmploymentBase.update({ where: { id }, data: { status: "NIEAKTYWNE" } });
  }

  // 4. #2404 OSWIADCZENIE BRAK_DANYCH — leave as is (historical, has PZC nr)
  console.log("  #2404 OSWIADCZENIE BRAK_DANYCH — zostawiam (historyczne z numerem PZC)");

  // 5. #2644 KARTA_POBYTU and #2646 KARTA_POBYTU already NIEAKTYWNE — OK
  console.log("  #2644, #2646 KARTA_POBYTU — already NIEAKTYWNE ✓");

  // 6. All WYGASLE bases — leave as is (historical)
  console.log("  WYGASLE bases (#2405, #2408, #2409, #2411, #2413, #2414, #3390) — zostawiam");

  // 7. Update decyzjaPobytowaDo to TRC end date
  await db.fdkForeigner.update({
    where: { id: 142 },
    data: { decyzjaPobytowaDo: new Date("2029-06-10") },
  });
  console.log("  decyzjaPobytowaDo → 2029-06-10");

  await db.fdkChangeLog.create({
    data: {
      foreignerId: 142, changedBy: CHANGED_BY, field: "cleanup_bases",
      oldValue: "#165,#182,#2647 AKTYWNE (puste)",
      newValue: "→ NIEAKTYWNE; #3410 TRC_FDK=AKTYWNE do 2029-06-10; #2645 OSW=AKTYWNE; decyzjaPobytowaDo=2029-06-10",
    },
  });

  // Show final
  console.log("\n=== Stan końcowy (tylko AKTYWNE) ===\n");
  const active = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 142, status: "AKTYWNE" },
    orderBy: { id: "asc" },
  });
  for (const b of active) {
    console.log(`  #${b.id} ${b.typ} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
