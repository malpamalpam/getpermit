import { describe, it, expect } from "vitest";
import { parseOswiadczenieText } from "./pdf-parser";

describe("parseOswiadczenieText", () => {
  it("extracts dates from standard format", () => {
    const text = `
      Oświadczenie wpisano do ewidencji oświadczeń
      w celu wykonywania pracy w okresie:
      Od 01/03/2026 Do 10/06/2026
    `;
    const result = parseOswiadczenieText(text);
    expect(result.dataOd).toBe("2026-03-01");
    expect(result.dataDo).toBe("2026-06-10");
  });

  it("extracts dates with dot separator", () => {
    const text = "okres: Od 15.01.2026 Do 15.07.2026";
    const result = parseOswiadczenieText(text);
    expect(result.dataOd).toBe("2026-01-15");
    expect(result.dataDo).toBe("2026-07-15");
  });

  it("extracts nazwisko and imie", () => {
    const text = `
      Nazwisko: Borzdov
      Imię (imiona): Aliaksandr
    `;
    const result = parseOswiadczenieText(text);
    expect(result.nazwisko).toBe("Borzdov");
    expect(result.imie).toBe("Aliaksandr");
  });

  it("extracts date of birth", () => {
    const text = "Data urodzenia: 15/03/1990";
    const result = parseOswiadczenieText(text);
    expect(result.dataUrodzenia).toBe("1990-03-15");
  });

  it("extracts citizenship", () => {
    const text = "Obywatelstwo: białoruskie";
    const result = parseOswiadczenieText(text);
    expect(result.obywatelstwo).toBe("białoruskie");
  });

  it("extracts passport number", () => {
    const text = "Numer dokumentu podróży: AB1234567";
    const result = parseOswiadczenieText(text);
    expect(result.nrPaszportu).toBe("AB1234567");
  });

  it("extracts rodzaj pracy (pkt 3.1)", () => {
    const text = "3.1 Rodzaj pracy: pracownik budowlany 3.2 inne";
    const result = parseOswiadczenieText(text);
    expect(result.rodzajPracy).toBe("pracownik budowlany");
  });

  it("extracts rodzaj umowy (pkt 3.6)", () => {
    const text = "3.6 Rodzaj umowy: umowa o pracę 3.7 inne";
    const result = parseOswiadczenieText(text);
    expect(result.rodzajUmowy).toBe("umowa o pracę");
  });

  it("returns empty object for non-oświadczenie text", () => {
    const result = parseOswiadczenieText("random text without keywords");
    expect(result).toEqual({});
  });

  it("handles combined document", () => {
    const text = `
      OŚWIADCZENIE O POWIERZENIU WYKONYWANIA PRACY CUDZOZIEMCOWI
      2.1 Nazwisko: Borzdov
      Imię: Aliaksandr
      Data urodzenia: 05/08/1985
      Obywatelstwo: białoruskie
      Numer dokumentu podróży: MP3456789
      Oświadczenie wpisano do ewidencji oświadczeń
      w celu wykonywania pracy w okresie:
      Od 10/12/2025 Do 10/06/2026
      3.1 Rodzaj pracy: pracownik produkcji
      3.6 Rodzaj umowy: umowa zlecenie
    `;
    const result = parseOswiadczenieText(text);

    expect(result.nazwisko).toBe("Borzdov");
    expect(result.imie).toBe("Aliaksandr");
    expect(result.dataUrodzenia).toBe("1985-08-05");
    expect(result.obywatelstwo).toBe("białoruskie");
    expect(result.nrPaszportu).toBe("MP3456789");
    expect(result.dataOd).toBe("2025-12-10");
    expect(result.dataDo).toBe("2026-06-10");
    expect(result.rodzajPracy).toBe("pracownik produkcji");
    expect(result.rodzajUmowy).toBe("umowa zlecenie");
  });
});
