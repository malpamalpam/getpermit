/**
 * Batch fixes from GP notes 27.08.2026:
 * 1. Remove false DOSTEP_DYPLOM_PL (foreign universities)
 * 2. Fix Regan ghost OSWIADCZENIE
 * 3. Fix Abramova: OSWIADCZENIE → ZGLOSZENIE_UA where applicable
 * 4. Deduplicate UA notifications: only newest AKTYWNE per person
 *
 * node scripts/fix-batch-aug27.mjs          # dry run
 * node scripts/fix-batch-aug27.mjs --apply  # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const DO_APPLY = process.argv.includes("--apply");
const CHANGED_BY = "fix-batch-aug27";

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DRY RUN"}\n`);

  // ========== 1. Remove false DOSTEP_DYPLOM_PL ==========
  console.log("=== 1. Usuwam fałszywe DOSTEP_DYPLOM_PL ===");

  // Keep only these (verified Polish institutions)
  const KEEP_IDS = [1313, 1314, 1315, 1316, 1317, 1318]; // Jasi, Marange, Koroleva, Kanavaliuk, Nampasa, Ruth

  const allDiplomaBases = await db.fdkEmploymentBase.findMany({
    where: { typ: "DOSTEP_DYPLOM_PL" },
    include: { foreigner: { select: { imie: true, nazwisko: true } } },
  });

  const toDelete = allDiplomaBases.filter((b) => !KEEP_IDS.includes(b.id));
  console.log(`Zachowuję: ${KEEP_IDS.length}, usuwam: ${toDelete.length}`);

  for (const b of toDelete) {
    console.log(`  Usuwam #${b.id} id=${b.foreignerId} ${b.foreigner.imie} ${b.foreigner.nazwisko} firma="${b.firma}"`);
    if (DO_APPLY) {
      await db.fdkEmploymentBase.delete({ where: { id: b.id } });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: b.foreignerId,
          changedBy: CHANGED_BY,
          field: "employment_base_auto",
          oldValue: `DOSTEP_DYPLOM_PL #${b.id}`,
          newValue: `Usunięto fałszywą podstawę DOSTEP_DYPLOM_PL — dyplom zagranicznej uczelni`,
        },
      });
    }
  }

  // ========== 2. Fix Regan ghost OSWIADCZENIE ==========
  console.log("\n=== 2. Regan — usuwam ghost OSWIADCZENIE #226 ===");
  const regan226 = await db.fdkEmploymentBase.findUnique({ where: { id: 226 } });
  if (regan226 && regan226.typ === "OSWIADCZENIE") {
    console.log(`  #226 typ=${regan226.typ} nr=${regan226.nrOswiadczenia} → USUWAM`);
    if (DO_APPLY) {
      await db.fdkEmploymentBase.delete({ where: { id: 226 } });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: regan226.foreignerId,
          changedBy: CHANGED_BY,
          field: "employment_base_auto",
          oldValue: `OSWIADCZENIE #226 nr=${regan226.nrOswiadczenia}`,
          newValue: `Usunięto fałszywe oświadczenie — duplikat numeru zezwolenia`,
        },
      });
    }
  } else {
    console.log("  #226 nie znaleziono lub inny typ — pomijam");
  }

  // ========== 3. Abramova — fix OSWIADCZENIE → ZGLOSZENIE_UA ==========
  console.log("\n=== 3. Abramova (id=223) — OSWIADCZENIE → ZGLOSZENIE_UA ===");
  const abramovaOsw = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 223, typ: "OSWIADCZENIE" },
  });
  for (const b of abramovaOsw) {
    // #300 (2021-2031) is a legitimate old OSWIADCZENIE — keep as is but mark WYGASLE if absorbed
    // #306 and #436 look like powiadomienia misclassified as OSWIADCZENIE
    if (b.id === 300) {
      console.log(`  #${b.id} OSWIADCZENIE (2021-2031) — zostawiam jako historyczne, zmieniam status na WYGASLE`);
      if (DO_APPLY) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { status: "WYGASLE" } });
      }
    } else {
      console.log(`  #${b.id} OSWIADCZENIE → ZGLOSZENIE_UA (stanowisko="${b.stanowisko?.substring(0, 60)}...")`);
      if (DO_APPLY) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { typ: "ZGLOSZENIE_UA" } });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: 223,
            changedBy: CHANGED_BY,
            field: "employment_base_auto",
            oldValue: `OSWIADCZENIE #${b.id}`,
            newValue: `Zmieniono typ na ZGLOSZENIE_UA — dokument PSZ-PPWPU/powiadomienie, nie oświadczenie`,
          },
        });
      }
    }
  }

  // ========== 4. UA notifications: only newest AKTYWNE ==========
  console.log("\n=== 4. Powiadomienia UA — tylko najnowsze AKTYWNE ===");

  const allForeigners = await db.fdkForeigner.findMany({
    include: { employmentBases: { orderBy: { dataOd: "desc" } } },
  });

  let totalDeactivated = 0;

  for (const f of allForeigners) {
    const activeUA = f.employmentBases.filter(
      (b) => b.typ === "ZGLOSZENIE_UA" && (b.status === "AKTYWNE" || b.status === "BRAK_DANYCH")
    );
    if (activeUA.length <= 1) continue;

    // Sort by dataOd desc — keep first (newest), deactivate rest
    activeUA.sort((a, b) => {
      const aDate = a.dataOd?.getTime() ?? 0;
      const bDate = b.dataOd?.getTime() ?? 0;
      return bDate - aDate;
    });

    const newest = activeUA[0];
    const older = activeUA.slice(1);

    console.log(`  id=${f.id} ${f.imie} ${f.nazwisko}: zachowuję #${newest.id} (${newest.dataOd?.toISOString().slice(0, 10)}), deaktywuję ${older.length}`);

    for (const b of older) {
      if (DO_APPLY) {
        await db.fdkEmploymentBase.update({
          where: { id: b.id },
          data: { status: "NIEAKTYWNE" },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: f.id,
            changedBy: CHANGED_BY,
            field: "employment_base_auto",
            oldValue: b.status,
            newValue: `ZGLOSZENIE_UA #${b.id} → NIEAKTYWNE (zastąpione przez nowsze #${newest.id})`,
          },
        });
      }
      totalDeactivated++;
    }
  }

  console.log(`\nŁącznie deaktywowanych UA: ${totalDeactivated}`);

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
