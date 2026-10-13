import { describe, it, expect } from "vitest";
import { runPreWriteChecks } from "./pre-write-checks";
import type { ParsedDocumentData } from "./pdf-parser";

describe("runPreWriteChecks", () => {
  const profileName = { imie: "Jan", nazwisko: "Kowalski" };

  // Check 1: Data urodzenia jako data od
  it("flags dataOd before 2000 as DOB error", () => {
    const parsed: ParsedDocumentData = { dataOd: "1985-04-25" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 1)).toBe(true);
  });

  it("accepts dataOd after 2000", () => {
    const parsed: ParsedDocumentData = { dataOd: "2025-01-01" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 1)).toBe(false);
  });

  // Check 2: Form labels in values
  it("flags form labels in stanowisko", () => {
    const parsed: ParsedDocumentData = { stanowisko: "/ w charakterze programisty" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 2)).toBe(true);
  });

  // Check 3: Sentencja in firma
  it("flags sentencja text in firma", () => {
    const parsed: ParsedDocumentData = { firma: "udzielam zezwolenia na pobyt" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 3)).toBe(true);
  });

  // Check 4: Salary unit mismatch
  it("flags hourly rate > 500 PLN", () => {
    const parsed: ParsedDocumentData = {
      wynagrodzenie: "5000 PLN/h",
      parsedSalary: { kwota: 5000, jednostka: "godzinowo", bruttoNetto: "brutto", raw: "5000 PLN/h" },
    };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 4)).toBe(true);
  });

  it("flags monthly salary < 100 PLN", () => {
    const parsed: ParsedDocumentData = {
      wynagrodzenie: "50 PLN",
      parsedSalary: { kwota: 50, jednostka: "miesiecznie", bruttoNetto: "brutto", raw: "50 PLN" },
    };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 4)).toBe(true);
  });

  // Check 7: GUID as document number
  it("flags UUID in nrDecyzji", () => {
    const parsed: ParsedDocumentData = { nrDecyzji: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 7)).toBe(true);
  });

  // Check 8: Karta pobytu nr in passport field
  it("flags karta pobytu number in nrPaszportu", () => {
    const parsed: ParsedDocumentData = { nrPaszportu: "RS1234567" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 8)).toBe(true);
  });

  it("does NOT flag normal passport number", () => {
    const parsed: ParsedDocumentData = { nrPaszportu: "AB1234567" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 8)).toBe(false);
  });

  // Check 9: Dowód osobisty nr in passport field
  it("flags dowód osobisty number in nrPaszportu", () => {
    const parsed: ParsedDocumentData = { nrPaszportu: "ABC123456" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 9)).toBe(true);
  });

  // Check 12: Karta pobytu creating employment base
  it("warns about karta pobytu creating employment", () => {
    const parsed: ParsedDocumentData = { detectedType: "KARTA_POBYTU" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 12)).toBe(true);
  });

  // Check 13: Zezwolenie type in rodzajUmowy
  it("flags zezwolenie type in rodzajUmowy", () => {
    const parsed: ParsedDocumentData = { rodzajUmowy: "ZEZWOLENIE NA POBYT STAŁY" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 13)).toBe(true);
  });

  // Check 17: Same dataOd and dataDo
  it("warns when dataOd equals dataDo", () => {
    const parsed: ParsedDocumentData = { dataOd: "2026-01-15", dataDo: "2026-01-15", nrDecyzji: "SC-123" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 17)).toBe(true);
  });

  // Check 22: Empty KARTA_POBYTU
  it("flags empty karta pobytu record", () => {
    const parsed: ParsedDocumentData = { detectedType: "KARTA_POBYTU" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 22)).toBe(true);
  });

  // Check 25: Invalid type
  it("flags type not in CRM dictionary", () => {
    const parsed: ParsedDocumentData = { detectedType: "NIEISTNIEJACY_TYP" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 25)).toBe(true);
  });

  it("accepts valid CRM type", () => {
    const parsed: ParsedDocumentData = { detectedType: "TRC_FDK" };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 25)).toBe(false);
  });

  // === NEW: Fee amounts as salary (section 9 rule 4) — must be ERROR, not warning ===
  it("blocks fee amount 51 PLN as salary (error severity)", () => {
    const parsed: ParsedDocumentData = {
      wynagrodzenie: "51,00 PLN",
      parsedSalary: { kwota: 51, jednostka: "miesiecznie", bruttoNetto: "brutto", raw: "51,00 PLN" },
    };
    const issues = runPreWriteChecks(parsed, profileName);
    const feeIssue = issues.find(i => i.checkId === 4 && i.message.includes("opłata"));
    expect(feeIssue).toBeDefined();
    expect(feeIssue!.severity).toBe("error");
  });

  it("blocks fee amount 440 PLN as salary (error severity)", () => {
    const parsed: ParsedDocumentData = {
      wynagrodzenie: "440,00 PLN",
      parsedSalary: { kwota: 440, jednostka: "miesiecznie", bruttoNetto: "brutto", raw: "440,00 PLN" },
    };
    const issues = runPreWriteChecks(parsed, profileName);
    const feeIssue = issues.find(i => i.checkId === 4 && i.message.includes("opłata"));
    expect(feeIssue).toBeDefined();
    expect(feeIssue!.severity).toBe("error");
  });

  it("blocks fee amount 100 PLN as salary", () => {
    const parsed: ParsedDocumentData = {
      wynagrodzenie: "100,00 PLN",
      parsedSalary: { kwota: 100, jednostka: "miesiecznie", bruttoNetto: "brutto", raw: "100,00 PLN" },
    };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 4 && i.severity === "error")).toBe(true);
  });

  it("blocks concatenated salary > 100k (1 021 893 140 zł)", () => {
    const parsed: ParsedDocumentData = {
      wynagrodzenie: "1 021 893 140 zł",
    };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 4 && i.severity === "error")).toBe(true);
  });

  it("blocks monthly salary below 1000 PLN", () => {
    const parsed: ParsedDocumentData = {
      wynagrodzenie: "500 PLN",
      parsedSalary: { kwota: 500, jednostka: "miesiecznie", bruttoNetto: "brutto", raw: "500 PLN" },
    };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 4 && i.severity === "error")).toBe(true);
  });

  it("allows valid salary 6000 PLN monthly", () => {
    const parsed: ParsedDocumentData = {
      wynagrodzenie: "6000 PLN brutto",
      parsedSalary: { kwota: 6000, jednostka: "miesiecznie", bruttoNetto: "brutto", raw: "6000 PLN brutto" },
    };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.some(i => i.checkId === 4 && i.severity === "error")).toBe(false);
  });

  it("allows valid hourly rate 50 PLN", () => {
    const parsed: ParsedDocumentData = {
      wynagrodzenie: "50,00 PLN/h brutto",
      parsedSalary: { kwota: 50, jednostka: "godzinowo", bruttoNetto: "brutto", raw: "50,00 PLN/h brutto" },
    };
    const issues = runPreWriteChecks(parsed, profileName);
    // 50 PLN/h is a valid hourly rate, not a fee (fee check only applies to monthly)
    const errorIssues = issues.filter(i => i.checkId === 4 && i.severity === "error");
    expect(errorIssues.length).toBe(0);
  });

  // No issues for clean data
  it("returns no issues for valid complete data", () => {
    const parsed: ParsedDocumentData = {
      detectedType: "ZEZWOLENIE_A",
      dataOd: "2026-01-01",
      dataDo: "2026-12-31",
      imie: "Jan",
      nazwisko: "Kowalski",
      firma: "ABC Sp. z o.o.",
      stanowisko: "Programista",
      rodzajUmowy: "umowa o pracę",
      nrDecyzji: "12345/2026",
    };
    const issues = runPreWriteChecks(parsed, profileName);
    expect(issues.length).toBe(0);
  });
});
