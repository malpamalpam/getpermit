import { describe, it, expect } from "vitest";
import {
  CONFIG,
  isFdkEmployer,
  resolveArticleMapping,
  isIndefiniteType,
  isPositiveDecision,
  isNegativeDecision,
  isChangeDecision,
  matchKeywords,
  extractArticle,
  getToggleValue,
  setToggleValue,
} from "./legalizacja-config";

describe("legalizacja-config", () => {
  describe("isFdkEmployer", () => {
    it("recognizes FDK by name", () => {
      expect(isFdkEmployer("na rzecz Firma Dla Każdego Sp. z o.o.")).toBe(true);
      expect(isFdkEmployer("na rzecz FIRMA DLA KAŻDEGO")).toBe(true);
    });

    it("recognizes FDK by address", () => {
      expect(isFdkEmployer("ul. Lwowska 5/15, 00-000 Warszawa")).toBe(true);
    });

    it("recognizes FDK by NIP", () => {
      expect(isFdkEmployer("NIP: 7010962890")).toBe(true);
    });

    it("does NOT match non-FDK employer", () => {
      expect(isFdkEmployer("ABC Solutions Sp. z o.o., ul. Marszałkowska 10")).toBe(false);
    });
  });

  describe("resolveArticleMapping", () => {
    it("resolves art.114 with FDK employer", () => {
      const result = resolveArticleMapping("114", "na rzecz Firma Dla Każdego");
      expect(result?.residence).toBe("TRC_FDK");
      expect(result?.employment).toBe("TRC_FDK");
    });

    it("resolves art.114 with non-FDK employer (default toggle)", () => {
      const result = resolveArticleMapping("114", "na rzecz ABC Solutions");
      expect(result?.residence).toBe("TRC_INNY_PRACODAWCA");
      // Default: reguly_mapowania → no employment base
      expect(result?.employment).toBeNull();
    });

    it("resolves art.127 (Blue Card)", () => {
      const result = resolveArticleMapping("127", "wysokich kwalifikacji");
      expect(result?.residence).toBe("TRC_BLUE_CARD");
      expect(result?.employment).toBe("TRC_BLUE_CARD");
    });

    it("resolves art.195 (pobyt stały) as indefinite", () => {
      const result = resolveArticleMapping("195", "pobyt stały");
      expect(result?.residence).toBe("POBYT_STALY");
      expect(result?.indefinite).toBe(true);
    });

    it("resolves art.186.1.6 (absolwent)", () => {
      const result = resolveArticleMapping("186.1.6", "poszukiwania pracy");
      expect(result?.residence).toBe("TRC_ABSOLWENT");
      expect(result?.employment).toBe("TRC_ABSOLWENT");
    });

    it("resolves art.186.1.9 (humanitarne)", () => {
      const result = resolveArticleMapping("186.1.9", "humanitarne");
      expect(result?.residence).toBe("TRC_HUMANITARNE");
      expect(result?.employment).toBe("TRC_HUMANITARNE");
    });

    it("falls back to base article when specific not found", () => {
      const result = resolveArticleMapping("186.1.99", "humanitarne");
      // Falls back to "186" (inne okoliczności)
      expect(result?.residence).toBe("TRC_INNE_OKOLICZNOSCI");
    });

    it("returns null for unknown article", () => {
      const result = resolveArticleMapping("999", "test");
      expect(result).toBeNull();
    });
  });

  describe("isIndefiniteType", () => {
    it("recognizes indefinite types", () => {
      expect(isIndefiniteType("POBYT_STALY")).toBe(true);
      expect(isIndefiniteType("REZYDENT_UE")).toBe(true);
      expect(isIndefiniteType("STATUS_UCHODZCY")).toBe(true);
      expect(isIndefiniteType("OCHRONA_UZUPELNIAJACA")).toBe(true);
      expect(isIndefiniteType("OBYWATEL_UE")).toBe(true);
      expect(isIndefiniteType("STATUS_ABSOLWENTA")).toBe(true);
    });

    it("rejects non-indefinite types", () => {
      expect(isIndefiniteType("TRC_FDK")).toBe(false);
      expect(isIndefiniteType("ZEZWOLENIE_A")).toBe(false);
    });
  });

  describe("decision detection", () => {
    it("detects positive decisions", () => {
      expect(isPositiveDecision("udzielam zezwolenia")).toBe(true);
      expect(isPositiveDecision("udziela się ochrony")).toBe(true);
      expect(isPositiveDecision("orzekam o udzieleniu")).toBe(true);
    });

    it("detects negative decisions", () => {
      expect(isNegativeDecision("odmawiam udzielenia")).toBe(true);
      expect(isNegativeDecision("umarza się postępowanie")).toBe(true);
      expect(isNegativeDecision("cofa się zezwolenie")).toBe(true);
    });

    it("detects change decisions", () => {
      expect(isChangeDecision("orzekam o zmianie zezwolenia")).toBe(true);
    });
  });

  describe("matchKeywords", () => {
    it("matches pobyt stały", () => {
      expect(matchKeywords("zezwolenie na pobyt stały")).toBe("POBYT_STALY");
    });

    it("matches Blue Card", () => {
      expect(matchKeywords("wysokich kwalifikacji")).toBe("TRC_BLUE_CARD");
    });

    it("matches studia", () => {
      expect(matchKeywords("kontynuowania studiów")).toBe("TRC_STUDIA");
    });

    it("returns null for no match", () => {
      expect(matchKeywords("lorem ipsum dolor")).toBeNull();
    });
  });

  describe("extractArticle", () => {
    it("extracts simple article number", () => {
      expect(extractArticle("Na podstawie art. 114 ustawy")).toBe("114");
    });

    it("extracts article with ustęp and punkt", () => {
      expect(extractArticle("art. 186 ust. 1 pkt 9")).toBe("186.1.9");
    });

    it("skips KPA articles", () => {
      expect(extractArticle("art. 104 KPA art. 114 ustawy o cudzoziemcach")).toBe("114");
    });

    it("returns null when no article found", () => {
      expect(extractArticle("brak artykułu")).toBeNull();
    });
  });

  describe("toggles", () => {
    it("defaults to reguly_mapowania", () => {
      expect(getToggleValue("pesel_ukr")).toBe("reguly_mapowania");
    });

    it("can be changed", () => {
      setToggleValue("pesel_ukr", "instrukcja_1_2");
      expect(getToggleValue("pesel_ukr")).toBe("instrukcja_1_2");
      // Reset
      setToggleValue("pesel_ukr", "reguly_mapowania");
    });

    it("has all 13 toggles defined", () => {
      expect(Object.keys(CONFIG.przelaczniki).length).toBe(13);
    });
  });

  describe("CONFIG completeness", () => {
    it("has article_map entries for all key articles", () => {
      const keyArticles = ["114", "127", "142", "144", "158", "159", "186", "195", "211", "348", "108"];
      for (const art of keyArticles) {
        expect(CONFIG.article_map[art]).toBeDefined();
      }
    });

    it("has employment hierarchy for all new types", () => {
      const newTypes = [
        "POBYT_STALY", "REZYDENT_UE", "STATUS_UCHODZCY", "OCHRONA_UZUPELNIAJACA",
        "TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_BLUE_CARD", "ZEZWOLENIE_A",
        "OSWIADCZENIE", "POWIADOMIENIE_UA",
      ];
      for (const typ of newTypes) {
        expect(CONFIG.employment_hierarchy[typ]).toBeDefined();
      }
    });
  });
});
