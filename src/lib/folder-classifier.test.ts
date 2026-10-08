import { describe, it, expect } from "vitest";
import { classifyToFolder, isDifferentPersonFromOpis } from "./folder-classifier";

describe("classifyToFolder", () => {
  // Ważne — by detected type
  it("classifies ZEZWOLENIE_A as wazne", () => {
    expect(classifyToFolder("ZEZWOLENIE_A", false, "doc.pdf")).toBe("wazne");
  });

  it("classifies TRC_FDK as wazne", () => {
    expect(classifyToFolder("TRC_FDK", false, "decyzja_123.pdf")).toBe("wazne");
  });

  it("classifies OSWIADCZENIE as wazne", () => {
    expect(classifyToFolder("OSWIADCZENIE", false, "file.pdf")).toBe("wazne");
  });

  it("classifies KARTA_POBYTU as wazne", () => {
    expect(classifyToFolder("KARTA_POBYTU", false, "scan.jpg")).toBe("wazne");
  });

  it("classifies OD_REZYDENT_UE as wazne", () => {
    expect(classifyToFolder("OD_REZYDENT_UE", false, "doc.pdf")).toBe("wazne");
  });

  it("classifies ODWOLANIE as wazne", () => {
    expect(classifyToFolder("ODWOLANIE", false, "appeal.pdf")).toBe("wazne");
  });

  it("classifies WIZA as wazne", () => {
    expect(classifyToFolder("WIZA", false, "visa.pdf")).toBe("wazne");
  });

  // Ważne — by filename patterns
  it("classifies passport by filename as wazne", () => {
    expect(classifyToFolder(null, false, "paszport_scan.jpg")).toBe("wazne");
  });

  it("classifies diploma by filename as wazne", () => {
    expect(classifyToFolder(null, false, "dyplom_inżyniera.pdf")).toBe("wazne");
  });

  it("classifies decision by filename as wazne", () => {
    expect(classifyToFolder(null, false, "decyzja_wojewody.pdf")).toBe("wazne");
  });

  it("classifies residence card by filename as wazne", () => {
    expect(classifyToFolder(null, false, "karta_pobytu_skan.jpg")).toBe("wazne");
  });

  it("classifies work permit by filename as wazne", () => {
    expect(classifyToFolder(null, false, "zezwolenie_na_prace_2025.pdf")).toBe("wazne");
  });

  it("classifies declaration (oświadczenie) by filename as wazne", () => {
    expect(classifyToFolder(null, false, "oswiadczenie_opwp.pdf")).toBe("wazne");
  });

  it("classifies EU long-term resident by filename as wazne", () => {
    expect(classifyToFolder(null, false, "rezydent_dlugoterminowy.pdf")).toBe("wazne");
  });

  it("classifies visa by filename as wazne", () => {
    expect(classifyToFolder(null, false, "wiza_schengen.pdf")).toBe("wazne");
  });

  it("classifies appeal (odwołanie) by filename as wazne", () => {
    expect(classifyToFolder(null, false, "Odwołanie_MG_Pranchuk.pdf")).toBe("wazne");
  });

  it("classifies TRC abbreviation by filename as wazne", () => {
    expect(classifyToFolder(null, false, "MUW - Pismo_uzupelnienie_dokumentacji_TRC.docx")).toBe("wazne");
  });

  it("classifies WP_2024 by filename as wazne", () => {
    expect(classifyToFolder(null, false, "WP_2024_scan.pdf")).toBe("wazne");
  });

  // Inne dokumenty
  it("classifies unknown document as inne_dokumenty", () => {
    expect(classifyToFolder(null, false, "random_file.pdf")).toBe("inne_dokumenty");
  });

  it("classifies unrecognized type as inne_dokumenty", () => {
    expect(classifyToFolder(null, false, "foto_3x4.jpg")).toBe("inne_dokumenty");
  });

  // Dokumenty członków rodziny
  it("classifies different person's document as dokumenty_rodziny", () => {
    expect(classifyToFolder("KARTA_POBYTU", true, "karta_pobytu.pdf")).toBe("dokumenty_rodziny");
  });

  it("classifies different person's passport as dokumenty_rodziny", () => {
    expect(classifyToFolder(null, true, "paszport_zona.jpg")).toBe("dokumenty_rodziny");
  });

  it("prioritizes family over document type", () => {
    expect(classifyToFolder("ZEZWOLENIE_A", true, "zezwolenie.pdf")).toBe("dokumenty_rodziny");
  });
});

describe("isDifferentPersonFromOpis", () => {
  it("returns true for standard warning", () => {
    expect(isDifferentPersonFromOpis("\u26a0 Dokument innej osoby: Jan Kowalski")).toBe(true);
  });

  it("returns false for null", () => {
    expect(isDifferentPersonFromOpis(null)).toBe(false);
  });

  it("returns false for regular description", () => {
    expect(isDifferentPersonFromOpis("Skan dokumentu z telefonu")).toBe(false);
  });

  it("returns false for warning without osoby", () => {
    expect(isDifferentPersonFromOpis("\u26a0 Uszkodzony plik")).toBe(false);
  });
});
