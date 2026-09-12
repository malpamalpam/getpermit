/**
 * Skrypt: uzupełnienie brakujących dat dataOd w zezwoleniach Abraham (foreignerId=47).
 *
 * Dwie podstawy "Zezwolenie WYGASLE" mają okres "— – 01.10.2024" i "— – 18.08.2025"
 * (brak dataOd). Skrypt próbuje odczytać dataOd z załącznika źródłowego.
 * Jeśli nie da się ustalić — oznacza "do ręcznego uzupełnienia".
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-abraham-dates.mjs
 *   node --env-file=.env.local scripts/fix-abraham-dates.mjs --run
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-abraham-dates-script";
const FOREIGNER_ID = 47;

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`=== Fix Abraham dates id=${FOREIGNER_ID} (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: FOREIGNER_ID },
    include: { employmentBases: true },
  });

  if (!foreigner) {
    console.error(`Foreigner id=${FOREIGNER_ID} nie znaleziony!`);
    process.exit(1);
  }

  console.log(`Osoba: ${foreigner.imie} ${foreigner.nazwisko}\n`);

  // Szukamy zezwoleń bez dataOd
  const basesWithoutDataOd = foreigner.employmentBases.filter(
    (b) => b.typ === "ZEZWOLENIE" && !b.dataOd && b.dataDo
  );

  console.log(`Zezwolenia bez dataOd: ${basesWithoutDataOd.length}\n`);

  for (const base of basesWithoutDataOd) {
    const dataDo = base.dataDo?.toISOString().slice(0, 10) ?? "?";
    console.log(`  [${base.id}] typ=${base.typ} status=${base.status} dataOd=BRAK dataDo=${dataDo}`);
    console.log(`        nrDecyzji: ${base.nrDecyzji ?? "brak"}`);
    console.log(`        sourceAttachmentId: ${base.sourceAttachmentId ?? "brak"}`);

    if (base.sourceAttachmentId) {
      console.log(`        -> Załącznik źródłowy istnieje — rescrapuj go w UI, aby uzupełnić dataOd.`);
    } else {
      console.log(`        -> Brak załącznika źródłowego — wymagane ręczne uzupełnienie.`);
    }

    if (DO_RUN) {
      // Oznacz w uwagach do ręcznego uzupełnienia
      const note = `[auto] Brak dataOd — do ręcznego uzupełnienia z dokumentu źródłowego.`;
      const existing = base.uwagi ?? "";
      if (!existing.includes("Brak dataOd")) {
        await db.fdkEmploymentBase.update({
          where: { id: base.id },
          data: { uwagi: existing ? `${existing}\n${note}` : note },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: FOREIGNER_ID,
            changedBy: CHANGED_BY,
            field: "employment_base_fix",
            oldValue: `Podstawa #${base.id} dataOd=null`,
            newValue: `Oznaczona do ręcznego uzupełnienia — brak daty początkowej.`,
          },
        });
        console.log(`        -> Oznaczono do ręcznego uzupełnienia.`);
      }
    }
  }

  if (basesWithoutDataOd.length === 0) {
    console.log(`  Wszystkie zezwolenia mają dataOd — OK.`);
  }

  console.log(`\n=== Gotowe ===`);
  console.log(`NASTĘPNY KROK: Rescrapuj załączniki źródłowe w UI lub uzupełnij daty ręcznie.`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
