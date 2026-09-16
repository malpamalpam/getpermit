/**
 * Skrypt: naprawa profilu Abdrashitova (376).
 * - Podstawa pobytowa → Rezydent długoterminowy UE (z załącznika 145)
 * - Podstawa zatrudnienia OD_REZYDENT_UE z dataDo 22.04.2027, status AKTYWNE
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-abdrashitova.mjs
 *   node --env-file=.env.local scripts/fix-abdrashitova.mjs --run
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-abdrashitova-script";
const FOREIGNER_ID = 376;

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`=== Fix Abdrashitova id=${FOREIGNER_ID} (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: FOREIGNER_ID },
    include: { employmentBases: true },
  });

  if (!foreigner) {
    console.error(`Foreigner id=${FOREIGNER_ID} nie znaleziony!`);
    process.exit(1);
  }

  console.log(`Osoba: ${foreigner.imie} ${foreigner.nazwisko}`);
  console.log(`Pobyt do: ${foreigner.decyzjaPobytowaDo?.toISOString().slice(0, 10) ?? "BRAK"}`);
  console.log(`Typ dokumentu pobytowego: ${foreigner.typDokumentuPobytowego ?? "BRAK"}`);

  // 1. Aktualizuj dane pobytowe
  console.log(`\n--- Pkt 1: Aktualizacja danych pobytowych ---`);
  console.log(`  decyzjaPobytowaDo: ${foreigner.decyzjaPobytowaDo?.toISOString().slice(0, 10) ?? "BRAK"} → 2027-04-22`);
  console.log(`  typDokumentuPobytowego: "${foreigner.typDokumentuPobytowego ?? "BRAK"}" → "Rezydent długoterminowy UE"`);

  if (DO_RUN) {
    await db.fdkForeigner.update({
      where: { id: FOREIGNER_ID },
      data: {
        decyzjaPobytowaDo: new Date("2027-04-22"),
        typDokumentuPobytowego: "Rezydent długoterminowy UE",
      },
    });
    console.log(`  → Zaktualizowano.`);
  }

  // 2. Sprawdź czy istnieje podstawa OD_REZYDENT_UE
  const existingOd = foreigner.employmentBases.find(
    (b) => b.typ === "OD_REZYDENT_UE" || b.typ === "DOSTEP_REZYDENT_UE"
  );

  if (existingOd) {
    console.log(`\n--- Pkt 2: Podstawa OD_REZYDENT_UE już istnieje (#${existingOd.id}) ---`);
    console.log(`  status: ${existingOd.status}, dataDo: ${existingOd.dataDo?.toISOString().slice(0, 10) ?? "BRAK"}`);
    // Aktualizuj jeśli potrzebne
    if (existingOd.status !== "AKTYWNE" || !existingOd.dataDo) {
      console.log(`  → Aktualizuję status=AKTYWNE, dataDo=2027-04-22`);
      if (DO_RUN) {
        await db.$executeRawUnsafe(
          `UPDATE fdk_employment_bases SET status = 'AKTYWNE', data_do = '2027-04-22', typ = 'OD_REZYDENT_UE'::"FdkBaseType" WHERE id = $1`,
          existingOd.id
        );
      }
    }
  } else {
    console.log(`\n--- Pkt 2: Tworzenie podstawy OD_REZYDENT_UE ---`);
    if (DO_RUN) {
      await db.$executeRawUnsafe(
        `INSERT INTO fdk_employment_bases (foreigner_id, typ, status, data_do, created_at, updated_at)
         VALUES ($1, 'OD_REZYDENT_UE'::"FdkBaseType", 'AKTYWNE'::"FdkStatus", '2027-04-22', NOW(), NOW())`,
        FOREIGNER_ID
      );
      console.log(`  → Utworzono.`);
    } else {
      console.log(`  → Zostanie utworzona: OD_REZYDENT_UE, AKTYWNE, dataDo=2027-04-22`);
    }
  }

  // Log
  if (DO_RUN) {
    await db.fdkChangeLog.create({
      data: {
        foreignerId: FOREIGNER_ID,
        changedBy: CHANGED_BY,
        field: "residence_basis",
        oldValue: null,
        newValue: "Naprawa: Rezydent długoterminowy UE + OD_REZYDENT_UE AKTYWNE do 22.04.2027",
      },
    });
  }

  console.log(`\n=== Gotowe ===`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
