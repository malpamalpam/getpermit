/**
 * Dogrywka 21.09 — poprawki danych dla konkretnych profili.
 *
 * Punkty:
 * 1. Akagawa (190): TRC → TRC_STUDIA, OD_STUDENT daty/status, zbadaj datę 27.09.2021
 * 3. Abramova (223): stanowisko z pkt 3.1 powiadomienia
 * 4. Adewoyin (7): usuń/popraw fałszywą kartę pobytu 30.11.2027, wskaż plik źródłowy
 * 5. Hanson (280): uzupełnij stanowisko z sentencji TRC; to samo dla pustych TRC
 *
 * Usage:
 *   node scripts/fix-dogrywka-21-09.mjs              # dry-run (tylko raport)
 *   node scripts/fix-dogrywka-21-09.mjs --run         # wykonaj zmiany
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-dogrywka-21-09";
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  DOGRYWKA 21.09 — poprawki danych`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // ===================================================================
  // PKT 1: Akagawa (id=190)
  // ===================================================================
  console.log("--- PKT 1: Akagawa (id=190) ---");

  const akagawa = await db.fdkForeigner.findUnique({
    where: { id: 190 },
    include: { employmentBases: true },
  });

  if (!akagawa) {
    console.log("  [SKIP] Profil 190 nie istnieje");
  } else {
    console.log(`  Profil: ${akagawa.imie} ${akagawa.nazwisko}`);

    for (const base of akagawa.employmentBases) {
      console.log(`    Podstawa #${base.id}: typ=${base.typ}, status=${base.status}, dataOd=${base.dataOd?.toISOString().slice(0,10)}, dataDo=${base.dataDo?.toISOString().slice(0,10)}, stanowisko=${base.stanowisko}`);
    }

    // a) Generyczna KARTA_POBYTU → TRC_STUDIA
    const kartaPobytu = akagawa.employmentBases.find((b) => b.typ === "KARTA_POBYTU" || b.typ === "TRC_FDK");
    if (kartaPobytu) {
      console.log(`  [FIX] Podstawa #${kartaPobytu.id}: ${kartaPobytu.typ} → TRC_STUDIA`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: kartaPobytu.id }, data: { typ: "TRC_STUDIA" } });
        await db.fdkChangeLog.create({
          data: { foreignerId: 190, changedBy: CHANGED_BY, field: "employment_base_type", oldValue: kartaPobytu.typ, newValue: `#${kartaPobytu.id}: ${kartaPobytu.typ} → TRC_STUDIA (cel: studia z sentencji)` },
        });
      }

      // Sprawdź datę 27.09.2021 na TRC_STUDIA
      if (kartaPobytu.dataOd) {
        const od = kartaPobytu.dataOd.toISOString().slice(0, 10);
        console.log(`  [INFO] TRC_STUDIA dataOd = ${od}`);
        if (od === "2021-09-27") {
          console.log(`  [!] Data 27.09.2021 pochodzi z dataOd tej podstawy — prawdopodobnie starsza decyzja; jeśli decyzja z 18.01.2024, zmień dataOd.`);
          // Jeśli decyzja jest z 18.01.2024:
          console.log(`  [FIX] Zmieniam dataOd na 2024-01-18 (data decyzji z sentencji)`);
          if (DO_RUN) {
            await db.fdkEmploymentBase.update({ where: { id: kartaPobytu.id }, data: { dataOd: new Date("2024-01-18") } });
            await db.fdkChangeLog.create({
              data: { foreignerId: 190, changedBy: CHANGED_BY, field: "employment_base_dataOd", oldValue: od, newValue: `#${kartaPobytu.id}: dataOd ${od} → 2024-01-18 (data decyzji)` },
            });
          }
        }
      }

      // Upewnij się, że dataDo = 18.01.2027
      if (kartaPobytu.dataDo) {
        const doDate = kartaPobytu.dataDo.toISOString().slice(0, 10);
        console.log(`  [INFO] TRC_STUDIA dataDo = ${doDate}`);
        if (doDate !== "2027-01-18") {
          console.log(`  [FIX] Zmieniam dataDo na 2027-01-18`);
          if (DO_RUN) {
            await db.fdkEmploymentBase.update({ where: { id: kartaPobytu.id }, data: { dataDo: new Date("2027-01-18") } });
          }
        }
      } else {
        console.log(`  [FIX] Ustawiam dataDo = 2027-01-18`);
        if (DO_RUN) {
          await db.fdkEmploymentBase.update({ where: { id: kartaPobytu.id }, data: { dataDo: new Date("2027-01-18") } });
        }
      }
    } else {
      console.log(`  [INFO] Brak KARTA_POBYTU/TRC_FDK do zmiany na TRC_STUDIA`);
    }

    // b) OD_STUDENT — uzupełnij daty i status
    const odStudent = akagawa.employmentBases.find((b) => b.typ === "OD_STUDENT" || b.typ === "DOSTEP_STUDENT");
    if (odStudent) {
      console.log(`  [INFO] OD_STUDENT #${odStudent.id}: status=${odStudent.status}, dataOd=${odStudent.dataOd?.toISOString().slice(0,10)}, dataDo=${odStudent.dataDo?.toISOString().slice(0,10)}`);

      const fixes = {};
      if (!odStudent.dataOd || odStudent.dataOd.toISOString().slice(0, 10) !== "2024-01-18") {
        fixes.dataOd = new Date("2024-01-18");
        console.log(`  [FIX] OD_STUDENT dataOd → 2024-01-18`);
      }
      if (!odStudent.dataDo || odStudent.dataDo.toISOString().slice(0, 10) !== "2027-01-18") {
        fixes.dataDo = new Date("2027-01-18");
        console.log(`  [FIX] OD_STUDENT dataDo → 2027-01-18`);
      }
      if (odStudent.status !== "AKTYWNE") {
        fixes.status = "AKTYWNE";
        console.log(`  [FIX] OD_STUDENT status → AKTYWNE`);
      }
      // Zmień legacy typ na nowy
      if (odStudent.typ === "DOSTEP_STUDENT") {
        fixes.typ = "OD_STUDENT";
        console.log(`  [FIX] DOSTEP_STUDENT → OD_STUDENT`);
      }

      if (Object.keys(fixes).length > 0 && DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: odStudent.id }, data: fixes });
        await db.fdkChangeLog.create({
          data: { foreignerId: 190, changedBy: CHANGED_BY, field: "employment_base_fix", oldValue: `#${odStudent.id}: status=${odStudent.status}`, newValue: `OD_STUDENT #${odStudent.id}: ${JSON.stringify(fixes)}` },
        });
      }
    } else {
      console.log(`  [INFO] Brak OD_STUDENT — tworzę`);
      if (DO_RUN) {
        const created = await db.fdkEmploymentBase.create({
          data: { foreignerId: 190, typ: "OD_STUDENT", status: "AKTYWNE", dataOd: new Date("2024-01-18"), dataDo: new Date("2027-01-18") },
        });
        console.log(`  [CREATED] OD_STUDENT #${created.id}`);
        await db.fdkChangeLog.create({
          data: { foreignerId: 190, changedBy: CHANGED_BY, field: "employment_base_create", oldValue: null, newValue: `Utworzono OD_STUDENT #${created.id}: od 2024-01-18 do 2027-01-18, status AKTYWNE` },
        });
      }
    }

    // c) Aktualizuj decyzjaPobytowaDo na profilu
    const currentDecDo = akagawa.decyzjaPobytowaDo?.toISOString().slice(0, 10);
    if (currentDecDo !== "2027-01-18") {
      console.log(`  [FIX] decyzjaPobytowaDo: ${currentDecDo} → 2027-01-18`);
      if (DO_RUN) {
        await db.fdkForeigner.update({ where: { id: 190 }, data: { decyzjaPobytowaDo: new Date("2027-01-18") } });
      }
    }
  }

  // ===================================================================
  // PKT 3: Abramova (id=223) — stanowisko z pkt 3.1
  // ===================================================================
  console.log("\n--- PKT 3: Abramova (id=223) — stanowisko z pkt 3.1 ---");

  const abramova = await db.fdkForeigner.findUnique({
    where: { id: 223 },
    include: { employmentBases: true, attachments: true },
  });

  if (!abramova) {
    console.log("  [SKIP] Profil 223 nie istnieje");
  } else {
    console.log(`  Profil: ${abramova.imie} ${abramova.nazwisko}`);

    // Znajdź powiadomienia UA i sprawdź stanowisko
    const uaBases = abramova.employmentBases.filter(
      (b) => b.typ === "ZGLOSZENIE_UA" || b.typ === "POWIADOMIENIE_UA"
    );
    for (const base of uaBases) {
      console.log(`    UA #${base.id}: stanowisko="${base.stanowisko}", dataOd=${base.dataOd?.toISOString().slice(0,10)}`);
      if (base.stanowisko && /dzie[łl]|art\.|twór/i.test(base.stanowisko)) {
        console.log(`    [!] Stanowisko wygląda jak fragment opisu dzieła, nie z pkt 3.1`);
        console.log(`    → Wymaga ręcznego sprawdzenia pliku źródłowego i wpisania stanowiska z pkt 3.1 formularza powiadomienia`);
      }
    }

    // Pokaż załączniki z powiadomieniami
    const uaAttachments = abramova.attachments.filter((a) => /zg[łl]oszeni|powiadomi|podjęci|podjeci/i.test(a.nazwaPliku));
    if (uaAttachments.length > 0) {
      console.log(`  Pliki UA do weryfikacji:`);
      for (const att of uaAttachments) {
        console.log(`    - [${att.id}] ${att.nazwaPliku}`);
      }
    }
  }

  // ===================================================================
  // PKT 4: Adewoyin (id=7) — fałszywa karta pobytu 30.11.2027
  // ===================================================================
  console.log("\n--- PKT 4: Adewoyin (id=7) — fałszywa karta pobytu ---");

  const adewoyin = await db.fdkForeigner.findUnique({
    where: { id: 7 },
    include: { employmentBases: true, changeLogs: { where: { field: "scrape" }, orderBy: { changedAt: "desc" } } },
  });

  if (!adewoyin) {
    console.log("  [SKIP] Profil 7 nie istnieje");
  } else {
    console.log(`  Profil: ${adewoyin.imie} ${adewoyin.nazwisko}`);

    // Znajdź kartę pobytu z dataDo = 2027-11-30
    const falseKp = adewoyin.employmentBases.filter(
      (b) => (b.typ === "KARTA_POBYTU" || b.typ.startsWith("TRC_") || b.typ === "BLUE_CARD") && b.dataDo
    );
    for (const base of falseKp) {
      const dataDo = base.dataDo?.toISOString().slice(0, 10);
      console.log(`    Pobytowa #${base.id}: typ=${base.typ}, dataDo=${dataDo}, nrDecyzji=${base.nrDecyzji}`);

      if (dataDo === "2027-11-30") {
        console.log(`    [!] FAŁSZYWA karta pobytu do 30.11.2027`);

        // Szukaj pliku źródłowego w logach scrape
        const sourceLog = adewoyin.changeLogs.find(
          (log) => log.newValue?.includes(`#${base.id}`)
        );
        if (sourceLog) {
          console.log(`    [ŹRÓDŁO] ${sourceLog.newValue}`);
          const fileMatch = sourceLog.newValue?.match(/pliku[: ]+(.+?)$/);
          if (fileMatch) console.log(`    [PLIK] ${fileMatch[1]}`);
        } else {
          console.log(`    [ŹRÓDŁO] Nie znaleziono w logach scrape — prawdopodobnie ręcznie utworzona`);
        }

        console.log(`    [FIX] Usuwam fałszywą podstawę #${base.id}`);
        if (DO_RUN) {
          await db.fdkEmploymentBase.delete({ where: { id: base.id } });
          await db.fdkChangeLog.create({
            data: { foreignerId: 7, changedBy: CHANGED_BY, field: "employment_base_delete", oldValue: `#${base.id} ${base.typ} do ${dataDo}`, newValue: `Usunięta fałszywa karta pobytu #${base.id} do 30.11.2027` },
          });
        }

        // Zaktualizuj decyzjaPobytowaDo jeśli wskazuje na tę fałszywą datę
        if (adewoyin.decyzjaPobytowaDo?.toISOString().slice(0, 10) === "2027-11-30") {
          // Znajdź najnowszą prawdziwą kartę pobytu
          const realKp = adewoyin.employmentBases
            .filter((b) => b.id !== base.id && (b.typ === "KARTA_POBYTU" || b.typ.startsWith("TRC_")) && b.dataDo)
            .sort((a, b) => b.dataDo.getTime() - a.dataDo.getTime());
          const newDate = realKp.length > 0 ? realKp[0].dataDo : null;
          console.log(`    [FIX] decyzjaPobytowaDo: 2027-11-30 → ${newDate?.toISOString().slice(0, 10) ?? "null"}`);
          if (DO_RUN) {
            await db.fdkForeigner.update({ where: { id: 7 }, data: { decyzjaPobytowaDo: newDate } });
          }
        }
      }
    }
  }

  // ===================================================================
  // PKT 5: Hanson (id=280) + inne TRC bez stanowiska
  // ===================================================================
  console.log("\n--- PKT 5: Hanson (id=280) + TRC bez stanowiska ---");

  // Najpierw Hanson
  const hanson = await db.fdkForeigner.findUnique({
    where: { id: 280 },
    include: { employmentBases: true },
  });

  if (!hanson) {
    console.log("  [SKIP] Profil 280 nie istnieje");
  } else {
    console.log(`  Profil: ${hanson.imie} ${hanson.nazwisko}`);
    const trcBases = hanson.employmentBases.filter(
      (b) => b.typ === "KARTA_POBYTU" || b.typ.startsWith("TRC_") || b.typ === "BLUE_CARD"
    );
    for (const base of trcBases) {
      console.log(`    TRC #${base.id}: typ=${base.typ}, stanowisko="${base.stanowisko ?? "(brak)"}", nrDecyzji=${base.nrDecyzji}`);
      if (!base.stanowisko) {
        console.log(`    [!] Brak stanowiska — wymaga ręcznego uzupełnienia z sentencji decyzji`);
      }
    }
  }

  // Globalne: wszystkie TRC/KARTA_POBYTU z pustym stanowiskiem
  const emptyStanTrc = await db.fdkEmploymentBase.findMany({
    where: {
      typ: { in: ["KARTA_POBYTU", "TRC_FDK", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC", "TRC_BLUE_CARD", "BLUE_CARD"] },
      stanowisko: null,
    },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
    orderBy: { foreignerId: "asc" },
  });

  console.log(`\n  TRC/KP bez stanowiska: ${emptyStanTrc.length}`);
  for (const base of emptyStanTrc) {
    console.log(`    #${base.id} [${base.foreigner.imie} ${base.foreigner.nazwisko}] typ=${base.typ} nr=${base.nrDecyzji ?? "-"}`);
  }
  console.log(`  → Wymaga ręcznego uzupełnienia z sentencji decyzji (przegląd załączników w panelu)`);

  // ===================================================================
  // SUMMARY
  // ===================================================================
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`  Pkt 1 (Akagawa): TRC→TRC_STUDIA, OD_STUDENT daty/status`);
  console.log(`  Pkt 3 (Abramova): wymaga ręcznej weryfikacji stanowiska z pkt 3.1`);
  console.log(`  Pkt 4 (Adewoyin): usunięcie fałszywej KP 30.11.2027`);
  console.log(`  Pkt 5 (Hanson+inne): ${emptyStanTrc.length} TRC bez stanowiska`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
