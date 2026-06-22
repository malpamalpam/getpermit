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
    const text = `
      Imię (imiona): Jan
      Nazwisko: Kowalski
    `;
    const result = parseOswiadczenieText(text);
    expect(result.imie).toBe("Jan");
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
    const text = "Numer wpisu: PZC.4390.9558.WK.2026";
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
    expect(result.detectedType).toBe("ZEZWOLENIE");
    expect(result.nrDecyzji).toBe("WUP/123/2026");
  });

  it("detects karta pobytu type", () => {
    const text = "DECYZJA o udzieleniu zezwolenia na pobyt czasowy ważne od 15.03.2025 do 15.03.2028";
    const result = parseOswiadczenieText(text);
    expect(result.detectedType).toBe("KARTA_POBYTU");
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
});
