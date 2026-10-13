import { describe, it, expect } from "vitest";
import { classifyToFolder, isDifferentPersonFromOpis } from "./folder-classifier";

describe("classifyToFolder", () => {
  // =============================================
  // Ważne — by detected type (FINAL documents)
  // =============================================
  it("classifies ZEZWOLENIE_A as wazne", () => {
    expect(classifyToFolder("ZEZWOLENIE_A", false, "doc.pdf")).toBe("wazne");
  });

  it("classifies TRC_FDK as wazne", () => {
    expect(classifyToFolder("TRC_FDK", false, "decyzja_123.pdf")).toBe("wazne");
  });

  it("classifies OSWIADCZENIE (registered) as wazne", () => {
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

  // =============================================
  // Ważne — by filename (identity & final docs)
  // =============================================
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

  it("classifies EU long-term resident by filename as wazne", () => {
    expect(classifyToFolder(null, false, "rezydent_dlugoterminowy.pdf")).toBe("wazne");
  });

  it("classifies visa by filename as wazne", () => {
    expect(classifyToFolder(null, false, "wiza_schengen.pdf")).toBe("wazne");
  });

  it("classifies appeal (odwołanie) by filename as wazne", () => {
    expect(classifyToFolder(null, false, "Odwołanie_MG_Pranchuk.pdf")).toBe("wazne");
  });

  it("classifies WP_2024 by filename as wazne", () => {
    expect(classifyToFolder(null, false, "WP_2024_scan.pdf")).toBe("wazne");
  });

  // =============================================
  // TRC procedure folder
  // =============================================
  it("classifies TRC supplementation letter as trc", () => {
    expect(classifyToFolder(null, false, "MUW - Pismo_uzupelnienie_dokumentacji_TRC.docx")).toBe("trc");
  });

  it("classifies TRC application as trc", () => {
    expect(classifyToFolder(null, false, "wniosek_TRC_Morozov.pdf")).toBe("trc");
  });

  it("classifies Załącznik nr 1 as trc", () => {
    expect(classifyToFolder(null, false, "Skan_zalacznik_nr_1_Valovich.pdf")).toBe("trc");
  });

  it("classifies TRC fee (440 PLN) as trc", () => {
    expect(classifyToFolder(null, false, "opłata_skarbowa_440_zł.pdf")).toBe("trc");
  });

  it("classifies OSW-UTRZYMANIE as trc (not wazne!)", () => {
    expect(classifyToFolder(null, false, "OSW-UTRZYMANIE_Skuratovich.pdf")).toBe("trc");
  });

  it("classifies OSW-NIEKARALNOSC as trc", () => {
    expect(classifyToFolder(null, false, "OSW-NIEKARALNOSC_Morozov.pdf")).toBe("trc");
  });

  it("classifies wezwanie TRC as trc", () => {
    expect(classifyToFolder(null, false, "Wezwanie_z_03.08.2026_TRC.pdf")).toBe("trc");
  });

  it("classifies pełnomocnictwo as trc", () => {
    expect(classifyToFolder(null, false, "PoA_Viktar_Valovich_MG.pdf")).toBe("trc");
  });

  it("classifies UPO as trc", () => {
    expect(classifyToFolder(null, false, "upo.pdf")).toBe("trc");
  });

  it("classifies TRC confirmation (CEN number) as trc", () => {
    expect(classifyToFolder(null, false, "Morozov_Anton_Potwierdzenie_CEN2406130233518.pdf")).toBe("trc");
  });

  it("classifies category trc_2024 hint as trc", () => {
    expect(classifyToFolder(null, false, "random_file.pdf", "trc_2024")).toBe("trc");
  });

  // =============================================
  // Oświadczenie procedure folder
  // =============================================
  it("classifies WNIOSEK-OSW as oswiadczenie", () => {
    expect(classifyToFolder(null, false, "WNIOSEK-OSW_Kowalski.pdf")).toBe("oswiadczenie");
  });

  it("classifies podjęcie pracy as oswiadczenie", () => {
    expect(classifyToFolder(null, false, "01.01.2026 podjęcie_zatrudnienia_UZ_Valovich.pdf")).toBe("oswiadczenie");
  });

  it("classifies zakończenie pracy as oswiadczenie", () => {
    expect(classifyToFolder(null, false, "31.07.2026_zakończenie_pracy.pdf")).toBe("oswiadczenie");
  });

  it("classifies zgłoszenie umowy as oswiadczenie", () => {
    expect(classifyToFolder(null, false, "Zgłoszenie_umowy_20.07.2026.pdf")).toBe("oswiadczenie");
  });

  it("classifies PSZ-PPPO as oswiadczenie", () => {
    expect(classifyToFolder(null, false, "PSZ-PPPO_niepodjecie.pdf")).toBe("oswiadczenie");
  });

  // =============================================
  // Zezwolenie procedure folder
  // =============================================
  it("classifies WRP reference as zezwolenie", () => {
    expect(classifyToFolder(null, false, "WRP-II.8671.21797.2024.pdf")).toBe("zezwolenie");
  });

  // =============================================
  // Dokumenty członków rodziny
  // =============================================
  it("classifies different person's document as dokumenty_rodziny", () => {
    expect(classifyToFolder("KARTA_POBYTU", true, "karta_pobytu.pdf")).toBe("dokumenty_rodziny");
  });

  it("classifies different person's passport as dokumenty_rodziny", () => {
    expect(classifyToFolder(null, true, "paszport_zona.jpg")).toBe("dokumenty_rodziny");
  });

  it("prioritizes family over document type", () => {
    expect(classifyToFolder("ZEZWOLENIE_A", true, "zezwolenie.pdf")).toBe("dokumenty_rodziny");
  });

  // =============================================
  // Inne dokumenty
  // =============================================
  it("classifies unknown document as inne_dokumenty", () => {
    expect(classifyToFolder(null, false, "random_file.pdf")).toBe("inne_dokumenty");
  });

  it("classifies unrecognized type as inne_dokumenty", () => {
    expect(classifyToFolder(null, false, "foto_3x4.jpg")).toBe("inne_dokumenty");
  });

  // =============================================
  // Regression: oświadczenie in filename ≠ wazne
  // (previously /o[śs]wiadczeni[ea]/i caught everything)
  // =============================================
  it("does NOT classify oświadczenie_o_liczbie_osob as wazne", () => {
    expect(classifyToFolder(null, false, "oswiadczenie_o_liczbie_osob_na_utrzymaniu.docx")).toBe("trc");
  });

  it("does NOT classify oświadczenie_praca_tabelka as wazne", () => {
    // Internal FDK form — not a TRC document, goes to inne_dokumenty (acceptable)
    const result = classifyToFolder(null, false, "oswiadczenie_praca_tzw._tabelka_0 (1).docx");
    expect(result).not.toBe("wazne");
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
