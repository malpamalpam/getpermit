import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Seed script dla modułu FDK v2 (kartoteka cudzoziemców).
 *
 * 1. Migruje istniejące rekordy z fdk_permits → fdk_foreigners + fdk_employment_bases
 * 2. Dodaje pełne dane testowe dla Joseph Saul Regan
 */
async function main() {
  console.log("=== Seeding FDK v2 module ===\n");

  // -----------------------------------------------------------------------
  // KROK 1: Wyczyść i zmigruj dane
  // -----------------------------------------------------------------------
  console.log("Step 1: Cleaning existing FDK v2 data...");
  await db.fdkAttachment.deleteMany();
  await db.fdkDetailedDocument.deleteMany();
  await db.fdkHrMonthlyEntry.deleteMany();
  await db.fdkHrContract.deleteMany();
  await db.fdkEmploymentBase.deleteMany();
  await db.fdkForeigner.deleteMany();
  console.log("  Done.\n");

  // -----------------------------------------------------------------------
  // KROK 1b: Migracja z fdk_permits (stara tabela) → nowe tabele
  // -----------------------------------------------------------------------
  console.log("Step 1b: Migrating from fdk_permits...");
  let migratedCount = 0;
  try {
    const existingPermits = await db.fdkPermit.findMany();
    const foreignerMap = new Map<string, number>();

    for (const p of existingPermits) {
      const key = `${p.nazwisko.trim().toUpperCase()}|${(p.imie ?? "").trim().toUpperCase()}`;

      if (!foreignerMap.has(key)) {
        const foreigner = await db.fdkForeigner.create({
          data: {
            nazwisko: p.nazwisko.trim(),
            imie: p.imie?.trim() || null,
          },
        });
        foreignerMap.set(key, foreigner.id);
      }

      const foreignerId = foreignerMap.get(key)!;
      const typMap: Record<string, "ZEZWOLENIE" | "OSWIADCZENIE" | "BLUE_CARD"> = {
        ZEZWOLENIE: "ZEZWOLENIE",
        OSWIADCZENIE: "OSWIADCZENIE",
        BLUE_CARD: "BLUE_CARD",
      };
      const typ = typMap[p.typDokumentu] ?? "ZEZWOLENIE";
      const now = new Date();
      const isExpired = p.dataDo && p.dataDo < now;

      await db.fdkEmploymentBase.create({
        data: {
          foreignerId,
          typ,
          status: isExpired ? "WYGASLE" : "AKTYWNE",
          dataOd: p.dataOd,
          dataDo: p.dataDo,
          decyzjaOdebrana: p.decyzjaOdebrana,
        },
      });
    }
    migratedCount = foreignerMap.size;
    console.log(`  Migrated ${existingPermits.length} permits → ${migratedCount} foreigners\n`);
  } catch {
    console.log("  fdk_permits table not found, skipping migration.\n");
  }

  // -----------------------------------------------------------------------
  // KROK 2: Dane testowe — Joseph Saul Regan
  // -----------------------------------------------------------------------
  console.log("Step 2: Seeding Joseph Saul Regan test data...");

  const regan = await db.fdkForeigner.create({
    data: {
      nazwisko: "Regan",
      imie: "Joseph Saul",
      dataUrodzenia: new Date("1990-01-03"),
      miejsceUrodzenia: "Kingston Upon Thames, Wielka Brytania",
      obywatelstwo: "Wielka Brytania (GBR)",
      plec: "Mężczyzna",
      pesel: "90010321697",
      nrPaszportu: "133560633",
      paszportWaznyOd: new Date("2023-03-31"),
      paszportWaznyDo: new Date("2033-03-31"),
      adresPl: "ul. Dobra 11/36, 00-384 Warszawa",
      telefon: "+48 791 643 000",
      email: "joeregansaul231@gmail.com",
      nrKonta: "PL 46 1020 1156 0000 7602 0151 8208",
    },
  });

  console.log(`  Created foreigner: ${regan.imie} ${regan.nazwisko} (id: ${regan.id})`);

  // --- Zezwolenia na pracę ---
  await db.fdkEmploymentBase.createMany({
    data: [
      {
        foreignerId: regan.id,
        typ: "ZEZWOLENIE",
        status: "BRAK_DANYCH",
        firma: "Classical School",
        startInfo: "Wstępny wniosek 2023-09-15",
      },
      {
        foreignerId: regan.id,
        typ: "ZEZWOLENIE",
        status: "WYGASLE",
        rodzajUmowy: "UD",
        firma: "Classical School",
        dataOd: new Date("2024-01-25"),
        dataDo: new Date("2025-01-24"),
        nrDecyzji: "6641/2024",
        wezwanieBraki: "uzupełniono - 06.12.23 MV",
        powiadomienieDo: new Date("2024-04-24"),
      },
      {
        foreignerId: regan.id,
        typ: "ZEZWOLENIE",
        status: "AKTYWNE",
        rodzajUmowy: "UD",
        firma: "Classical School",
        dataOd: new Date("2025-01-26"),
        dataDo: new Date("2026-01-25"),
        nrDecyzji: "109128/2024",
        wezwanieBraki: "wszystko jest",
        powiadomienieDo: new Date("2025-04-26"),
        startInfo: "podjął pracę, teraz na TRC",
      },
    ],
  });
  console.log("  3 employment bases (zezwolenia)");

  // --- Karta pobytu ---
  await db.fdkEmploymentBase.create({
    data: {
      foreignerId: regan.id,
      typ: "KARTA_POBYTU",
      status: "ZAKONCZONE",
      urzad: "Mazowiecki",
      rodzajSprawy: "Praca i pobyt",
      dataZlozenia: new Date("2024-05-28"),
      sposobWysylki: "Poczta",
      sygnatura: "WSC-II-P.6151.66116.2024",
    },
  });
  console.log("  1 employment base (karta pobytu)");

  // --- Dokumenty szczegółowe ---
  // Decyzje zezwoleń na pracę
  await db.fdkDetailedDocument.createMany({
    data: [
      {
        foreignerId: regan.id,
        typDokumentu: "zezwolenie_na_prace",
        dane: {
          nrDecyzji: "6641/2024",
          nrSprawy: "WRP-II.8671.92924.2023",
          dataWydania: "2024-01-23",
          wazneOd: "2024-01-25",
          wazneDo: "2025-01-24",
          typ: "Typ A",
          stanowisko: "Twórca materiałów edukacyjnych z j. angielskiego",
          umowa: "Umowa o dzieło",
          godziny: "100 h",
          wynagrodzenie: "3 890,00 PLN/mies.",
          pracodawca: "Fundacja Firma Dla Każdego, ul. Lwowska 5/15, 00-660 Warszawa",
          organ: "Wojewoda Mazowiecki",
        },
      },
      {
        foreignerId: regan.id,
        typDokumentu: "zezwolenie_na_prace",
        dane: {
          nrDecyzji: "109128/2024",
          nrSprawy: "WRP-II.8671.97623.2024",
          dataWydania: "2024-12-30",
          wazneOd: "2025-01-26",
          wazneDo: "2026-01-25",
          typ: "Typ A",
          stanowisko: "Twórca materiałów edukacyjnych z j. angielskiego",
          umowa: "Umowa o dzieło",
          godziny: "100 h",
          wynagrodzenie: "4 590,00 PLN/mies.",
          pracodawca: "Fundacja Firma Dla Każdego, ul. Lwowska 5/15, 00-660 Warszawa",
          organ: "Wojewoda Mazowiecki",
        },
      },
    ],
  });

  // Informacje starosty
  await db.fdkDetailedDocument.createMany({
    data: [
      {
        foreignerId: regan.id,
        typDokumentu: "informacja_starosty",
        dane: {
          nr: "14650/StPr/23/14356/1",
          data: "2023-11-23",
          wazneOd: "2023-11-27",
          wazneDo: "2026-11-26",
          stanowisko: "Twórca mat. eduk. z j. ang.",
          wynagrodzenie: "140 040 PLN / 3 890 PLN/mies.",
          temat: "Fonetyka — poprawna wymowa, 360 str. skryptu (36×10), materiały audio-wideo, poziomy A1-B2",
        },
      },
      {
        foreignerId: regan.id,
        typDokumentu: "informacja_starosty",
        dane: {
          nr: "14650/StPr/24/08423/1",
          data: "2024-07-17",
          wazneOd: "2024-07-17",
          wazneDo: "2027-07-16",
          stanowisko: "Twórca mat. eduk. z j. ang.",
          wynagrodzenie: "165 240 PLN / 4 590 PLN/mies.",
          temat: "Pisanie i umiejętności pisarskie (listy, opisy, krótkie opowiadania), 360 str. skryptu, A1-B1",
        },
      },
    ],
  });

  // TRC
  await db.fdkDetailedDocument.create({
    data: {
      foreignerId: regan.id,
      typDokumentu: "trc",
      dane: {
        nrSprawy: "WSC-II-P.6151.66116.2024",
        dataZlozenia: "2024-05-28",
        organ: "Wojewoda Mazowiecki",
        typ: "Zezwolenie na pobyt czasowy",
        dataDecyzji: "2025-04-17",
        wazneDo: "2028-04-17",
        nrKarty: "RS7516145",
        uwagi: "DOSTĘP DO RYNKU PRACY",
        stanowisko: "Twórca materiałów edukacyjnych z j. angielskiego",
        minWynagrodzenie: "21 000 PLN brutto/mies.",
        chronologia: [
          { data: "2024-05-28", opis: "Złożenie wniosku TRC przez ePUAP (Mariana Frolova)" },
          { data: "2024-08-23", opis: "Złożenie pisma uzupełniającego (Michalina Glapińska)" },
          { data: "2024-08-30", opis: "Wysyłka dodatkowej dokumentacji" },
          { data: "2024-12-12", opis: "Wezwanie z MUW — uzupełnienie braków formalnych" },
          { data: "2024-12-18", opis: "Osobiste stawiennictwo, złożenie dokumentów" },
          { data: "2025-01-21", opis: "Uzupełnienie dokumentacji" },
          { data: "2025-02-27", opis: "Pismo do US — zaświadczenie o niezaleganiu" },
          { data: "2025-03-18", opis: "Uzupełnienie dokumentacji (rachunek luty 2025)" },
          { data: "2025-04-17", opis: "Wydanie decyzji pozytywnej" },
        ],
      },
    },
  });

  // PIT
  await db.fdkDetailedDocument.create({
    data: {
      foreignerId: regan.id,
      typDokumentu: "pit",
      dane: {
        typ: "PIT-37",
        rok: 2024,
        dataZlozenia: "2025-04-04",
        urzad: "I US Warszawa-Śródmieście, ul. Lindleya 14",
        przychod: "262 000,00 PLN",
        koszty: "124 400,00 PLN",
        dochod: "137 600,00 PLN",
        podatekNalezny: "16 432,00 PLN",
        ulgaNaDziecko: "3 600,00 PLN",
        podatekPoUldze: "12 832,00 PLN",
      },
    },
  });

  // Wykształcenie
  await db.fdkDetailedDocument.createMany({
    data: [
      {
        foreignerId: regan.id,
        typDokumentu: "wyksztalcenie",
        dane: {
          uczelnia: "King's College London",
          tytul: "MA",
          kierunek: "English: 1850 to the Present",
          wynik: "Pass with Merit",
          rok: 2016,
        },
      },
      {
        foreignerId: regan.id,
        typDokumentu: "wyksztalcenie",
        dane: {
          uczelnia: "University of Manchester",
          tytul: "Bachelor's Degree in Humanities",
          kierunek: "Literature (English)",
          rok: 2012,
        },
      },
    ],
  });

  // Pełnomocnicy
  await db.fdkDetailedDocument.createMany({
    data: [
      {
        foreignerId: regan.id,
        typDokumentu: "pelnomocnictwo",
        dane: { imieNazwisko: "Kamila Mamiedow-Stępień", data: "2024-05-27", rola: "Pełnomocnik początkowy" },
      },
      {
        foreignerId: regan.id,
        typDokumentu: "pelnomocnictwo",
        dane: { imieNazwisko: "Mariana Frolova", pesel: "96110410688", data: "2024-05-27", rola: "Złożyła wniosek ePUAP" },
      },
      {
        foreignerId: regan.id,
        typDokumentu: "pelnomocnictwo",
        dane: {
          imieNazwisko: "Michalina Glapińska",
          pesel: "95090201086",
          data: "2024-05-27",
          rola: "Główny aktywny pełnomocnik",
          telefon: "+48 791 643 000",
          email: "m.glapinska@firmadlakazdego.pl",
        },
      },
    ],
  });

  // Opłaty
  await db.fdkDetailedDocument.createMany({
    data: [
      { foreignerId: regan.id, typDokumentu: "oplata", dane: { data: "2023-11-24", kwota: "100,00 PLN", tytul: "Opłata za zezwolenie na pracę (WP 2023)" } },
      { foreignerId: regan.id, typDokumentu: "oplata", dane: { data: "2024-05-29", kwota: "100,00 PLN", tytul: "Opłata za pobyt czasowy (TRC)" } },
      { foreignerId: regan.id, typDokumentu: "oplata", dane: { data: "2024-05-29", kwota: "51,00 PLN", tytul: "Opłata za zezwolenie na pracę" } },
      { foreignerId: regan.id, typDokumentu: "oplata", dane: { data: "2024-05-29", kwota: "440,00 PLN", tytul: "Opłata za kartę pobytu" } },
      { foreignerId: regan.id, typDokumentu: "oplata", dane: { data: "2024-06-06", kwota: "17,00 PLN", tytul: "Opłata za pełnomocnictwo" } },
      { foreignerId: regan.id, typDokumentu: "oplata", dane: { data: "2024-11-12", kwota: "100,00 PLN", tytul: "Opłata za zezwolenie na pracę (WP 2024)" } },
      { foreignerId: regan.id, typDokumentu: "oplata", dane: { data: "2025-02-24", kwota: "21,00 PLN", tytul: "Opłata skarbowa (zaświadczenie US)" } },
    ],
  });

  // --- HR Contract ---
  const contract = await db.fdkHrContract.create({
    data: {
      foreignerId: regan.id,
      rok: 2025,
      dataOd: new Date("2025-01-26"),
      dataDo: new Date("2026-01-25"),
      rodzajUmowy: "UD",
      kup: 0.5,
      kwotaBruttoMin: 21000,
      kwotaCalosciowa: 273000,
      stanowisko: "Twórca materiałów edukacyjnych z języka angielskiego",
    },
  });
  console.log(`  HR contract id: ${contract.id}`);

  // --- Załączniki (metadane, bez plików) ---
  const attachments = [
    // Główne
    { kategoria: "glowne", nazwaWyswietlana: "Paszport (skan JPEG)", nazwaPliku: "Joseph_Saul_Regan_paszport_2023-2033.jpeg", typPliku: "jpeg", opis: "Skan paszportu brytyjskiego, ważny do 31.03.2033" },
    { kategoria: "glowne", nazwaWyswietlana: "Karta Pobytu (PDF)", nazwaPliku: "Joseph_Saul_Regan_KP_2025-2028.pdf", typPliku: "pdf", opis: "Karta pobytu czasowego RS7516145, ważna do 17.04.2028" },
    { kategoria: "glowne", nazwaWyswietlana: "Decyzja TRC 2025-2028", nazwaPliku: "Joseph_Saul_Regan_decyzja_2025-2028.pdf", typPliku: "pdf", opis: "Decyzja o udzieleniu zezwolenia na pobyt czasowy" },
    // WP 2023
    { kategoria: "wp_2023", nazwaWyswietlana: "Informacja starosty", nazwaPliku: "14650StPr23143561-tworca_mate-srednie.pdf", typPliku: "pdf", opis: "Informacja starosty nr 14650/StPr/23/14356/1" },
    { kategoria: "wp_2023", nazwaWyswietlana: "Zezwolenie na pracę 2024", nazwaPliku: "zezwolenie_JOSEPH_SAUL_REGAN_25.01.2024_do_24.01.2025.pdf", typPliku: "pdf", opis: "Zezwolenie nr 6641/2024" },
    { kategoria: "wp_2023", nazwaWyswietlana: "Umowa o dzieło", nazwaPliku: "UMOWA_O_DZIELO_Regan.pdf", typPliku: "pdf", opis: "Umowa o dzieło z FDK" },
    { kategoria: "wp_2023", nazwaWyswietlana: "Dyplom MA King's College", nazwaPliku: "Joe_Regan_Master_of_Arts_Degree_Certificate.pdf", typPliku: "pdf", opis: "Certyfikat Master of Arts z King's College London" },
    // WP 2024
    { kategoria: "wp_2024", nazwaWyswietlana: "Informacja starosty 2024", nazwaPliku: "14650StPr24084231-tworca_materialow.pdf", typPliku: "pdf", opis: "Info starosty nr 14650/StPr/24/08423/1" },
    { kategoria: "wp_2024", nazwaWyswietlana: "Zezwolenie 2025-2026", nazwaPliku: "zezwolenie_JOSEPH_SAUL_REGAN_od_26.01.2025_do_25.01.2026.pdf", typPliku: "pdf", opis: "Zezwolenie nr 109128/2024" },
    // TRC 2024
    { kategoria: "trc_2024", nazwaWyswietlana: "Wniosek TRC (ePUAP)", nazwaPliku: "potwierdzenie_epuap_wniosek_28.05.2024.pdf", typPliku: "pdf", opis: "Potwierdzenie złożenia wniosku TRC przez ePUAP" },
    { kategoria: "trc_2024", nazwaWyswietlana: "Wezwanie MUW 12.12.24", nazwaPliku: "Wezwanie_Joe_Regan_skan_MUW_otr_12.12.24.pdf", typPliku: "pdf", opis: "Wezwanie z Mazowieckiego UW" },
    { kategoria: "trc_2024", nazwaWyswietlana: "Decyzja TRC", nazwaPliku: "Joseph_Regan_zezwolenie_na_pobyt_czasowy_Mazowiecki_UW.pdf", typPliku: "pdf", opis: "Decyzja o zezwoleniu na pobyt" },
    { kategoria: "trc_2024", nazwaWyswietlana: "PIT-37 Deklaracja 2024", nazwaPliku: "Deklaracja_PIT_37_REGAN_wysylka_04.04.25.pdf", typPliku: "pdf", opis: "Deklaracja PIT-37 za rok 2024" },
    { kategoria: "trc_2024", nazwaWyswietlana: "Zaświadczenie ZUS", nazwaPliku: "Joseph_Regan_ZUS_certificate.pdf", typPliku: "pdf", opis: "Zaświadczenie ZUS" },
    { kategoria: "trc_2024", nazwaWyswietlana: "Karta pobytu", nazwaPliku: "Joseph_Saul_Regan_KP_2025-2028.pdf", typPliku: "pdf", opis: "Karta pobytu czasowego RS7516145" },
  ];

  await db.fdkAttachment.createMany({
    data: attachments.map((a) => ({
      foreignerId: regan.id,
      kategoria: a.kategoria,
      nazwaWyswietlana: a.nazwaWyswietlana,
      nazwaPliku: a.nazwaPliku,
      opis: a.opis,
      typPliku: a.typPliku,
      storagePath: `fdk/${regan.id}/${a.nazwaPliku}`,
    })),
  });
  console.log(`  ${attachments.length} attachments`);

  console.log("\n=== FDK v2 seed complete! ===");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
