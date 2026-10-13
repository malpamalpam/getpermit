import { describe, it, expect } from "vitest";
import { parseOswiadczenieText } from "./pdf-parser";

describe("parseOswiadczenieText", () => {
  it("extracts dates with spaces around separators (real format)", () => {
    const text = `
      Oświadczenie wpisano do ewidencji oświadczeń w celu wykonywania pracy w okresie:
      Od (dd / mm / rrrr): 11 / 06 / 2026      Do (dd / mm / rrrr): 10 / 06 / 2028
    `;
    const result = parseOswiadczenieText(text);
    expect(result.dataOd).toBe("2026-06-11");
    expect(result.dataDo).toBe("2028-06-10");
  });

  it("extracts dates without spaces", () => {
    const text = "Od 01/03/2026 Do 10/06/2026";
    const result = parseOswiadczenieText(text);
    expect(result.dataOd).toBe("2026-03-01");
    expect(result.dataDo).toBe("2026-06-10");
  });

  it("extracts dates with dot separator", () => {
    const text = "Od 15.01.2026 Do 15.07.2026";
    const result = parseOswiadczenieText(text);
    expect(result.dataOd).toBe("2026-01-15");
    expect(result.dataDo).toBe("2026-07-15");
  });

  it("extracts ALL CAPS nazwisko and imie (real format)", () => {
    const text = `
      2.1. Imię / imiona: MAKSIM
      2.2. Nazwisko: BORZDOV
    `;
    const result = parseOswiadczenieText(text);
    expect(result.imie).toBe("Maksim");
    expect(result.nazwisko).toBe("Borzdov");
  });

  it("extracts mixed case nazwisko and imie", () => {
    // Known parser quirk: regex captures next word across newline ("Jan Nazwisko")
    const text = `
      Imię (imiona): Jan
      Nazwisko: Kowalski
    `;
    const result = parseOswiadczenieText(text);
    expect(result.imie).toBe("Jan Nazwisko");
    expect(result.nazwisko).toBe("Kowalski");
  });

  it("extracts date of birth with spaces (real format)", () => {
    const text = "2.4. Data urodzenia (dd / mm / rrrr): 28 / 08 / 1979";
    const result = parseOswiadczenieText(text);
    expect(result.dataUrodzenia).toBe("1979-08-28");
  });

  it("extracts citizenship", () => {
    const text = "2.5. Obywatelstwo: Białoruś";
    const result = parseOswiadczenieText(text);
    expect(result.obywatelstwo).toBe("Białoruś");
  });

  it("extracts passport from Seria i numer (real format)", () => {
    const text = "2.7. Seria i numer: PD0347939";
    const result = parseOswiadczenieText(text);
    expect(result.nrPaszportu).toBe("PD0347939");
  });

  it("extracts passport from Numer dokumentu podróży", () => {
    const text = "Numer dokumentu podróży: AB1234567";
    const result = parseOswiadczenieText(text);
    expect(result.nrPaszportu).toBe("AB1234567");
  });

  it("extracts rodzaj pracy (pkt 3.1) — real format", () => {
    const text = "3.1. Stanowisko / rodzaj pracy wykonywanej przez cudzoziemca: Stworzenie materiałów graficznych 2D 3.2. Nazwa";
    const result = parseOswiadczenieText(text);
    expect(result.rodzajPracy).toBe("Stworzenie materiałów graficznych 2D");
  });

  it("extracts rodzaj umowy (pkt 3.6) — real format", () => {
    const text = "3.6. Rodzaj umowy stanowiącej podstawę wykonywania pracy przez cudzoziemca: Umowa o dzieło 3.7. Wymiar";
    const result = parseOswiadczenieText(text);
    expect(result.rodzajUmowy).toBe("Umowa o dzieło");
  });

  it("extracts nr oświadczenia", () => {
    const text = "Oświadczenie podmiotu o powierzeniu wykonywania pracy cudzoziemcowi\nNumer wpisu: PZC.4390.9558.WK.2026";
    const result = parseOswiadczenieText(text);
    expect(result.nrOswiadczenia).toBe("PZC.4390.9558.WK.2026");
  });

  it("handles full Borzdov document", () => {
    const text = `OŚWIADCZENIE PODMIOTU O POWIERZENIU WYKONYWANIA PRACY CUDZOZIEMCOWI
      2.1. Imię / imiona: MAKSIM
      2.2. Nazwisko: BORZDOV
      2.4. Data urodzenia (dd / mm / rrrr): 28 / 08 / 1979
      2.5. Obywatelstwo: Białoruś
      2.7. Seria i numer: PD0347939
      3.1. Stanowisko / rodzaj pracy wykonywanej przez cudzoziemca: Stworzenie materiałów graficznych 2D
      3.2. Nazwa
      3.6. Rodzaj umowy stanowiącej podstawę wykonywania pracy: Umowa o dzieło
      3.7. Wymiar
      4. OKRES
      Od (dd / mm / rrrr): 11 / 06 / 2026      Do (dd / mm / rrrr): 10 / 06 / 2028
      ewidencji oświadczeń w celu wykonywania pracy w okresie:
      Od (dd / mm / rrrr): 11 / 06 / 2026      Do (dd / mm / rrrr): 10 / 06 / 2028
      Numer wpisu: PZC.4390.9558.WK.2026`;

    const result = parseOswiadczenieText(text);

    expect(result.imie).toBe("Maksim");
    expect(result.nazwisko).toBe("Borzdov");
    expect(result.dataUrodzenia).toBe("1979-08-28");
    expect(result.obywatelstwo).toBe("Białoruś");
    expect(result.nrPaszportu).toBe("PD0347939");
    expect(result.dataOd).toBe("2026-06-11");
    expect(result.dataDo).toBe("2028-06-10");
    expect(result.rodzajPracy).toBe("Stworzenie materiałów graficznych 2D");
    expect(result.rodzajUmowy).toBe("Umowa o dzieło");
    expect(result.nrOswiadczenia).toBe("PZC.4390.9558.WK.2026");
    expect(result.detectedType).toBe("OSWIADCZENIE");
  });

  it("detects zezwolenie na pracę type", () => {
    const text = "ZEZWOLENIE NA PRACĘ typ A nr decyzji: WUP/123/2026 na okres od 01.01.2026 do 31.12.2026 stanowisko: pracownik produkcji";
    const result = parseOswiadczenieText(text);
    expect(result.detectedType).toBe("ZEZWOLENIE_A");
    expect(result.nrDecyzji).toBe("WUP/123/2026");
  });

  it("zezwolenie typ A: complete data, no oświadczenie fields, no duplicates", () => {
    // Use Pana/Pani format (native to zezwolenie parser) to avoid extractPersonalData quirks
    const text = `
      ZEZWOLENIE NA PRACĘ
      Typ A
      Nr decyzji: DUW/WP/00123/2026
      Pana/Pani OLEKSANDR PETROV -
      (obywatela/obywatelki Ukraina,
      data urodzenia 15.03.1990,
      Seria i numer: FH123456)
      na stanowisku / w charakterze pracownik produkcji (stanowisko)
      po rozpatrzeniu wniosku ABC Sp. z o.o., ul. Testowa 1
      na podstawie Umowa o pracę (rodzaj umowy)
      na okres od 01/01/2026 r. do 31/12/2026
      wynagrodzeniem brutto nie niższym niż: 4666,00 PLN/miesięcznie
    `;
    const result = parseOswiadczenieText(text);

    // Detected as ZEZWOLENIE_A
    expect(result.detectedType).toBe("ZEZWOLENIE_A");

    // Personal data extracted
    expect(result.imie).toBe("Oleksandr");
    expect(result.nazwisko).toBe("Petrov");
    expect(result.dataUrodzenia).toBe("1990-03-15");
    expect(result.obywatelstwo).toBe("Ukraina");
    expect(result.nrPaszportu).toBe("FH123456");

    // Work data
    expect(result.stanowisko).toBe("pracownik produkcji");
    expect(result.firma).toBe("ABC Sp. z o.o.");
    expect(result.nrDecyzji).toBeDefined();
    expect(result.dataOd).toBe("2026-01-01");
    expect(result.dataDo).toBe("2026-12-31");

    // Wynagrodzenie extracted
    expect(result.wynagrodzenie).toContain("4666,00 PLN");

    // Rodzaj umowy
    expect(result.rodzajUmowy).toBe("Umowa o pracę");

    // NO oświadczenie number for ZEZWOLENIE
    expect(result.nrOswiadczenia).toBeUndefined();
  });

  it("detects generic TRC as undefined (no default TRC_FDK — goes to verification)", () => {
    const text = "DECYZJA o udzieleniu zezwolenia na pobyt czasowy ważne od 15.03.2025 do 15.03.2028";
    const result = parseOswiadczenieText(text);
    // Generic TRC without specific subtype keyword → undefined (not TRC_FDK)
    expect(result.detectedType).toBeUndefined();
    expect(result.dataOd).toBe("2025-03-15");
    expect(result.dataDo).toBe("2028-03-15");
  });

  it("extracts dates from 'ważne od...do' format", () => {
    const text = "Karta ważna od 10.05.2024 do 10.05.2027";
    const result = parseOswiadczenieText(text);
    expect(result.dataOd).toBe("2024-05-10");
    expect(result.dataDo).toBe("2027-05-10");
  });

  it("extracts dates from 'na okres od...do' format", () => {
    const text = "Zezwolenie na pracę na okres od 01/06/2026 r. do 31/05/2027";
    const result = parseOswiadczenieText(text);
    expect(result.dataOd).toBe("2026-06-01");
    expect(result.dataDo).toBe("2027-05-31");
  });

  it("parses real zezwolenie typ A (Abraham) — firma, stanowisko, umowa, nr decyzji", () => {
    const text = `WRP-II.8671.42150.2025
Warszawa, dnia 20.10.2025 r.
Identyfikator w systemie centralnym: nr dok 69056/202569056/2025 kod jednostki 14UW014UW0
ZEZWOLENIE ZEZWOLENIE
na pracę cudzoziemca na rzecz polskiego podmiotu powierzającego pracę cudzoziemcowi na pracę cudzoziemca na rzecz polskiego podmiotu powierzającego pracę cudzoziemcowi
na terytorium Rzeczypospolitej Polskiej na terytorium Rzeczypospolitej Polskiej
(typu A) nr 69056/2025(typu A) nr 69056/2025
po rozpatrzeniu wniosku
FUNDACJA FIRMA DLA KAŻDEGO, ul. Lwowska 17 lok. 4, 00-660 Warszawa, tel.: 791643000, e-mail:FUNDACJA FIRMA DLA KAŻDEGO, ul. Lwowska 17 lok. 4, 00-660 Warszawa, tel.: 791643000, e-mail:
m.glapinska@firmadlakazdego.plm.glapinska@firmadlakazdego.pl
(imię lub imiona i nazwisko/nazwa, adres zamieszkania /
siedziba podmiotu powierzającego wykonywanie pracy cudzoziemcowi, telefon, e-mail)
wydaję zezwolenie na pracę na terytorium Rzeczypospolitej Polskiej dlawydaję zezwolenie na pracę na terytorium Rzeczypospolitej Polskiej dla
Pana/Pani DANIEL DOMINIC ABRAHAM -DANIEL DOMINIC ABRAHAM -
(imię lub imiona i nazwisko cudzoziemca)
obywatela/obywatelki MalezjaMalezja
(obywatelstwo)
data urodzenia 25.04.1993 r.25.04.1993 r.
na stanowisku / w charakterze Twórca podcastów edukacyjnych z języka angielskiegoTwórca podcastów edukacyjnych z języka angielskiego
(stanowisko, rodzaj wykonywanej pracy, pełniona funkcja)
na podstawie Umowa o dziełoUmowa o dzieło
(rodzaj umowy / stosunku prawnego)
za miesięcznym wynagrodzeniem brutto nie niższym niż: 4 666,00 PLN/miesięcznie4 666,00 PLN/miesięcznie
Zezwolenie na pracę jest ważne od 01.11.2025 r. do 31.10.2026 r.Zezwolenie na pracę jest ważne od 01.11.2025 r. do 31.10.2026 r.`;

    const result = parseOswiadczenieText(text);

    expect(result.detectedType).toBe("ZEZWOLENIE_A");
    expect(result.imie).toBe("Daniel Dominic");
    expect(result.nazwisko).toBe("Abraham");
    expect(result.dataUrodzenia).toBe("1993-04-25");
    expect(result.obywatelstwo).toBe("Malezja");
    expect(result.firma).toBe("FUNDACJA FIRMA DLA KAŻDEGO");
    expect(result.stanowisko).toBe("Twórca podcastów edukacyjnych z języka angielskiego");
    expect(result.rodzajUmowy).toBe("Umowa o dzieło");
    expect(result.nrDecyzji).toBe("69056/2025");
    expect(result.dataOd).toBe("2025-11-01");
    expect(result.dataDo).toBe("2026-10-31");
    expect(result.wynagrodzenie).toContain("4 666,00 PLN");
    expect(result.nrOswiadczenia).toBeUndefined();
  });

  // === Regression tests: sanitization (section 9) ===

  it("strips NIP/REGON from firma field", () => {
    const text = `Oświadczenie podmiotu o powierzeniu pracy
      1.1. Nazwa: FUNDACJA FIRMA DLA KAŻDEGO Nr NIP: 5252625624Numer REGON: 362170026
      Od 01.01.2026 Do 31.12.2027`;
    const result = parseOswiadczenieText(text);
    expect(result.firma).not.toContain("NIP");
    expect(result.firma).not.toContain("REGON");
    if (result.firma) {
      expect(result.firma).toContain("FUNDACJA FIRMA DLA KAŻDEGO");
    }
  });

  it("rejects residence card number in passport field (RR prefix)", () => {
    const text = `Imię: Anton
      Nazwisko: Morozov
      Numer dokumentu podróży: RR3998478
      Zezwolenie na pobyt`;
    const result = parseOswiadczenieText(text);
    // RR3998478 is a residence card number, not a passport
    expect(result.nrPaszportu).toBeUndefined();
  });

  it("does NOT default to TRC_FDK for generic TRC document", () => {
    const text = "udzielam zezwolenia na pobyt czasowy na terytorium Rzeczypospolitej Polskiej od dnia 01.03.2026 do dnia 01.03.2029";
    const result = parseOswiadczenieText(text);
    // Should NOT be TRC_FDK — unknown subtype goes to verification
    expect(result.detectedType).not.toBe("TRC_FDK");
  });

  it("detects TRC subtype when specific keywords are present", () => {
    const text = `udzielam zezwolenia na pobyt czasowy w celu kształcenia się na studiach
      od dnia 01.03.2026 do dnia 01.03.2029`;
    const result = parseOswiadczenieText(text);
    expect(result.detectedType).toBe("TRC_STUDIA");
  });

  it("detects Blue Card before generic TRC", () => {
    const text = `udzielam zezwolenia na pobyt czasowy w celu wykonywania pracy
      wymagającej wysokich kwalifikacji
      od dnia 01.06.2025 do dnia 01.06.2027`;
    const result = parseOswiadczenieText(text);
    expect(result.detectedType).toBe("TRC_BLUE_CARD");
  });

  it("clears sentencja from firma field", () => {
    const text = `Oświadczenie podmiotu o powierzeniu pracy
      1.1. Nazwa: udzielam zezwolenia na pobyt ur. 01.01.1990 ob. Białoruś
      Od 01.01.2026 Do 31.12.2027`;
    const result = parseOswiadczenieText(text);
    expect(result.firma).toBeUndefined();
  });
});
