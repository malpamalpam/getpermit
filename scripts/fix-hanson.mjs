/**
 * Skrypt: uzupełnienie brakujących danych w decyzji Hanson.
 *
 * Hanson: decyzja zaciągnięta, ale bez rodzaju umowy/dzieła.
 * Skrypt identyfikuje takie podstawy i oznacza je do ręcznego uzupełnienia
 * (lub rescrapowania z aktualnym parserem, który teraz wyciąga przedmiotDziela).
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-hanson.mjs
 *   node --env-file=.env.local scripts/fix-hanson.mjs --run
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-hanson-script";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`=== Fix Hanson — uzupełnienie rodzajUmowy/przedmiotDziela (${DO_RUN ? "RUN" : "DRY-RUN"}) ===\n`);

  // Szukamy Hanson po nazwisku
  const foreigners = await db.fdkForeigner.findMany({
    where: { nazwisko: { contains: "Hanson", mode: "insensitive" } },
    include: { employmentBases: true },
  });

  if (foreigners.length === 0) {
    console.log(`Nie znaleziono osoby o nazwisku Hanson.`);
    // Spróbuj Jacqueline
    const alt = await db.fdkForeigner.findMany({
      where: { imie: { contains: "Jacqueline", mode: "insensitive" } },
      include: { employmentBases: true },
    });
    if (alt.length > 0) {
      console.log(`Znaleziono po imieniu Jacqueline: ${alt.map(f => `#${f.id} ${f.imie} ${f.nazwisko}`).join(", ")}`);
    }
    await db.$disconnect();
    return;
  }

  for (const foreigner of foreigners) {
    console.log(`\n${foreigner.imie} ${foreigner.nazwisko} (id=${foreigner.id}):`);

    // Szukamy decyzji/zezwoleń bez rodzajUmowy
    const basesWithoutUmowa = foreigner.employmentBases.filter(
      (b) => (b.typ === "ZEZWOLENIE" || b.typ === "KARTA_POBYTU" || b.typ === "BLUE_CARD") && !b.rodzajUmowy
    );

    if (basesWithoutUmowa.length === 0) {
      console.log(`  Wszystkie decyzje mają rodzajUmowy — OK.`);
      continue;
    }

    for (const base of basesWithoutUmowa) {
      console.log(`  [${base.id}] typ=${base.typ} status=${base.status} rodzajUmowy=BRAK`);
      console.log(`        nrDecyzji: ${base.nrDecyzji ?? "brak"}`);
      console.log(`        stanowisko: ${base.stanowisko ?? "brak"}`);
      console.log(`        sourceAttachmentId: ${base.sourceAttachmentId ?? "brak"}`);

      if (base.sourceAttachmentId) {
        console.log(`        -> Rescrapuj załącznik #${base.sourceAttachmentId} w UI — nowy parser wyciągnie rodzajUmowy i przedmiotDziela.`);
      } else {
        console.log(`        -> Brak załącznika źródłowego — uzupełnij ręcznie.`);
      }

      if (DO_RUN) {
        const note = `[auto] Brak rodzajUmowy — do uzupełnienia z dokumentu (rescrapuj lub ręcznie).`;
        const existing = base.uwagi ?? "";
        if (!existing.includes("Brak rodzajUmowy")) {
          await db.fdkEmploymentBase.update({
            where: { id: base.id },
            data: { uwagi: existing ? `${existing}\n${note}` : note },
          });
          await db.fdkChangeLog.create({
            data: {
              foreignerId: foreigner.id,
              changedBy: CHANGED_BY,
              field: "employment_base_fix",
              oldValue: `Podstawa #${base.id} rodzajUmowy=null`,
              newValue: `Oznaczona do uzupełnienia rodzaju umowy/przedmiotu dzieła.`,
            },
          });
          console.log(`        -> Oznaczono do uzupełnienia.`);
        }
      }
    }
  }

  console.log(`\n=== Gotowe ===`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
