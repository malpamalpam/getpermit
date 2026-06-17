import { describe, it, expect } from "vitest";
import { computeStatus, withComputedStatuses } from "./fdk-queries";

function makeDate(daysFromToday: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(0, 0, 0, 0);
  return d;
}

describe("computeStatus", () => {
  it("returns WYGASLE when dataDo is yesterday", () => {
    expect(
      computeStatus({ status: "AKTYWNE", dataOd: makeDate(-30), dataDo: makeDate(-1) })
    ).toBe("WYGASLE");
  });

  it("returns AKTYWNE when dataDo is today", () => {
    expect(
      computeStatus({ status: "BRAK_DANYCH", dataOd: makeDate(-10), dataDo: makeDate(0) })
    ).toBe("AKTYWNE");
  });

  it("returns AKTYWNE when dataDo is in the future", () => {
    expect(
      computeStatus({ status: "BRAK_DANYCH", dataOd: makeDate(-10), dataDo: makeDate(30) })
    ).toBe("AKTYWNE");
  });

  it("returns AKTYWNE when dataOd is today and dataDo is null", () => {
    expect(
      computeStatus({ status: "BRAK_DANYCH", dataOd: makeDate(0), dataDo: null })
    ).toBe("AKTYWNE");
  });

  it("returns W_TRAKCIE when dataOd is in the future", () => {
    expect(
      computeStatus({ status: "BRAK_DANYCH", dataOd: makeDate(5), dataDo: makeDate(30) })
    ).toBe("W_TRAKCIE");
  });

  it("returns BRAK_DANYCH when both dates are null", () => {
    expect(
      computeStatus({ status: "BRAK_DANYCH", dataOd: null, dataDo: null })
    ).toBe("BRAK_DANYCH");
  });

  it("preserves UCHYLONE regardless of dates", () => {
    expect(
      computeStatus({ status: "UCHYLONE", dataOd: makeDate(-10), dataDo: makeDate(30) })
    ).toBe("UCHYLONE");
  });

  it("preserves UMORZONE regardless of dates", () => {
    expect(
      computeStatus({ status: "UMORZONE", dataOd: makeDate(-30), dataDo: makeDate(-1) })
    ).toBe("UMORZONE");
  });

  it("returns WYGASLE for expired document even if status was AKTYWNE", () => {
    // Simulates the Borzdov case: dataDo = 10.06.2026, which is in the past
    expect(
      computeStatus({ status: "AKTYWNE", dataOd: makeDate(-100), dataDo: makeDate(-7) })
    ).toBe("WYGASLE");
  });

  it("returns AKTYWNE when dataOd is in the past and dataDo is null", () => {
    expect(
      computeStatus({ status: "BRAK_DANYCH", dataOd: makeDate(-30), dataDo: null })
    ).toBe("AKTYWNE");
  });

  it("returns WYGASLE when only dataDo exists and is past", () => {
    expect(
      computeStatus({ status: "AKTYWNE", dataOd: null, dataDo: makeDate(-1) })
    ).toBe("WYGASLE");
  });

  it("returns BRAK_DANYCH when only dataDo exists and is future (no dataOd)", () => {
    // dataDo is future but dataOd is null — can't determine if active
    expect(
      computeStatus({ status: "BRAK_DANYCH", dataOd: null, dataDo: makeDate(30) })
    ).toBe("BRAK_DANYCH");
  });
});

describe("withComputedStatuses", () => {
  it("computes statuses for an array of bases", () => {
    const bases = [
      { status: "AKTYWNE" as const, dataOd: makeDate(-30), dataDo: makeDate(-1) },
      { status: "BRAK_DANYCH" as const, dataOd: makeDate(-10), dataDo: makeDate(30) },
      { status: "UCHYLONE" as const, dataOd: makeDate(-10), dataDo: makeDate(30) },
    ];
    const result = withComputedStatuses(bases);

    expect(result[0].status).toBe("WYGASLE");
    expect(result[1].status).toBe("AKTYWNE");
    expect(result[2].status).toBe("UCHYLONE");
  });

  it("returns empty array for empty input", () => {
    expect(withComputedStatuses([])).toEqual([]);
  });
});
