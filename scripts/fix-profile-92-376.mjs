/**
 * Skrypt: naprawa profili 92 i 376.
 *
 * Pkt 1: Profil 92 — usunięcie duplikatu TRC_FDK BRAK_DANYCH z nr SC-XII.6151.4020.2025
 * Pkt 2: Profil 376 — uzupełnienie dataOd na OD_REZYDENT_UE
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-profile-92-376.mjs
 *   node --env-file=.env.local scripts/fix-profile-92-376.mjs --run
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-profile-92-376";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`=== Fix profil 92 + 376 (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  // === Pkt 1: Profil 92 — dedupe TRC_FDK ===
  console.log("--- Profil 92: dedupe TRC_FDK ---");
  const bases92 = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 92, nrDecyzji: "SC-XII.6151.4020.2025" },
    orderBy: { createdAt: "asc" },
  });

  console.log(`  Znaleziono ${bases92.length} podstaw z nr SC-XII.6151.4020.2025:`);
  for (const b of bases92) {
    console.log(`    [${b.id}] typ=${b.typ} status=${b.status} dataOd=${b.dataOd?.toISOString().slice(0,10) ?? "BRAK"} dataDo=${b.dataDo?.toISOString().slice(0,10) ?? "BRAK"}`);
  }

  // Znajdź duplikat BRAK_DANYCH bez dat
  const dup = bases92.find(b => b.status === "BRAK_DANYCH" && !b.dataOd && !b.dataDo);
  const good = bases92.find(b => b.dataOd || b.dataDo);

  if (dup && good) {
    console.log(`  Duplikat: #${dup.id} (BRAK_DANYCH, bez dat) → USUŃ`);
    console.log(`  Zachowuję: #${good.id} (${good.status}, ${good.dataOd?.toISOString().slice(0,10)} – ${good.dataDo?.toISOString().slice(0,10)})`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.delete({ where: { id: dup.id } });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: 92,
          changedBy: CHANGED_BY,
          field: "employment_base_dedup",
          oldValue: `#${dup.id} ${dup.typ} BRAK_DANYCH`,
          newValue: `Usunięty duplikat — zachowano #${good.id}`,
        },
      });
      console.log(`  → Usunięto.`);
    }
  } else if (!dup) {
    console.log(`  Brak duplikatu BRAK_DANYCH — OK.`);
  } else {
    console.log(`  Nie znaleziono aktywnej wersji — ręczna weryfikacja.`);
  }

  // === Pkt 2: Profil 376 — OD_REZYDENT_UE dataOd ===
  console.log("\n--- Profil 376: OD_REZYDENT_UE dataOd ---");
  const bases376 = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: 376, typ: { in: ["OD_REZYDENT_UE", "DOSTEP_REZYDENT_UE"] } },
  });

  console.log(`  Znaleziono ${bases376.length} podstaw OD_REZYDENT_UE:`);
  for (const b of bases376) {
    console.log(`    [${b.id}] status=${b.status} dataOd=${b.dataOd?.toISOString().slice(0,10) ?? "BRAK"} dataDo=${b.dataDo?.toISOString().slice(0,10) ?? "BRAK"}`);
  }

  // Szukamy załącznika 145 żeby wyciągnąć datę
  const att145 = await db.fdkAttachment.findUnique({ where: { id: 145 } });
  const dataOdSource = att145?.uploadedAt ?? new Date();
  console.log(`  Załącznik 145: uploadedAt=${att145?.uploadedAt?.toISOString().slice(0,10) ?? "BRAK"}`);

  for (const b of bases376) {
    if (!b.dataOd) {
      console.log(`  [${b.id}] dataOd=BRAK → ustawiam ${dataOdSource.toISOString().slice(0,10)}, status=AKTYWNE`);
      if (DO_RUN) {
        await db.$executeRawUnsafe(
          `UPDATE fdk_employment_bases SET data_od = $1, status = 'AKTYWNE'::"FdkStatus" WHERE id = $2`,
          dataOdSource, b.id
        );
        await db.fdkChangeLog.create({
          data: {
            foreignerId: 376,
            changedBy: CHANGED_BY,
            field: "employment_base_fix",
            oldValue: `#${b.id} dataOd=null, status=${b.status}`,
            newValue: `dataOd=${dataOdSource.toISOString().slice(0,10)}, status=AKTYWNE`,
          },
        });
        console.log(`  → Zaktualizowano.`);
      }
    } else {
      console.log(`  [${b.id}] dataOd=${b.dataOd.toISOString().slice(0,10)} — OK.`);
      // Upewnij się że status = AKTYWNE
      if (b.status !== "AKTYWNE") {
        console.log(`  [${b.id}] status=${b.status} → AKTYWNE`);
        if (DO_RUN) {
          await db.$executeRawUnsafe(
            `UPDATE fdk_employment_bases SET status = 'AKTYWNE'::"FdkStatus" WHERE id = $1`,
            b.id
          );
        }
      }
    }
  }

  console.log(`\n=== Gotowe ===`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
