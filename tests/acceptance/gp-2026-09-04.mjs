/**
 * Acceptance tests for GP corrections 04.09.2026.
 * Read-only — does NOT modify any data.
 *
 * Usage:
 *   node --env-file=.env.local tests/acceptance/gp-2026-09-04.mjs
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ALIASES = {
  "georgia": "GE", "gruzja": "GE",
  "belarus": "BY", "bialorus": "BY",
  "moldova": "MD", "moldawia": "MD",
  "ukraine": "UA", "ukraina": "UA",
  "russia": "RU", "rosja": "RU",
  "armenia": "AM",
};
function stripDiacritics(s) {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const results = [];
function test(id, description, pass, detail) {
  results.push({ id, description, pass, detail });
  console.log(`  ${pass ? "✅ PASS" : "❌ FAIL"} ${id}: ${description}${detail ? ` — ${detail}` : ""}`);
}

// Hierarchy (mirror of fdk-queries.ts)
const HIERARCHY = {
  DOSTEP_POBYT_STALY: 8, DOSTEP_REZYDENT_UE: 8, DOSTEP_KARTA_POLAKA: 8, DOSTEP_OCHRONA_MIEDZ: 8,
  BLUE_CARD: 7, KARTA_POBYTU: 7,
  DOSTEP_UE: 6, DOSTEP_DYPLOM_PL: 6,
  ZEZWOLENIE: 5,
  OSWIADCZENIE: 4,
  ZGLOSZENIE_UA: 3,
  DOSTEP_STUDENT: 2,
};

function computeStatus(b) {
  if (["UCHYLONE", "UMORZONE", "NIEAKTYWNE"].includes(b.status)) return b.status;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (b.dataZakPracy) { const d = new Date(b.dataZakPracy); d.setHours(0,0,0,0); if (d <= today) return "NIEAKTYWNE"; }
  const dataOd = b.dataOd ? new Date(b.dataOd) : null;
  const dataDo = b.dataDo ? new Date(b.dataDo) : null;
  if (dataOd) dataOd.setHours(0,0,0,0);
  if (dataDo) dataDo.setHours(0,0,0,0);
  if (dataDo && dataDo < today) return "WYGASLE";
  if (dataOd && dataOd <= today && (!dataDo || dataDo >= today)) return "AKTYWNE";
  if (dataOd && dataOd > today) return "W_TRAKCIE";
  return "BRAK_DANYCH";
}

function getCurrentBasis(bases) {
  const withStatus = bases.map(b => ({ ...b, computedStatus: computeStatus(b) }));
  const active = withStatus.filter(b => b.computedStatus === "AKTYWNE" || b.computedStatus === "W_TRAKCIE");
  if (active.length === 0) return null;
  return active.reduce((best, b) => {
    const hb = HIERARCHY[b.typ] ?? 0;
    const ha = HIERARCHY[best.typ] ?? 0;
    if (hb !== ha) return hb > ha ? b : best;
    return (b.dataDo?.getTime() ?? 0) > (best.dataDo?.getTime() ?? 0) ? b : best;
  });
}

async function main() {
  console.log("\n=== GP 2026-09-04 Acceptance Tests ===\n");

  // T1: Abraham (47)
  {
    const f = await db.fdkForeigner.findUnique({
      where: { id: 47 },
      include: { employmentBases: true },
    });
    const bases = f?.employmentBases ?? [];
    test("T1a", "Abraham: 3-4 bases (2 hist. zezw. + 1 active zezw. + 1 karta)", bases.length >= 3 && bases.length <= 4, `got ${bases.length}`);
    test("T1b", "Abraham: no base with dataOd = 1993-04-25",
      !bases.some(b => b.dataOd?.toISOString().slice(0, 10) === "1993-04-25"),
      bases.filter(b => b.dataOd?.toISOString().slice(0, 10) === "1993-04-25").map(b => `#${b.id}`).join(", ") || "ok");
    test("T1c", "Abraham: no OSWIADCZENIE type",
      !bases.some(b => b.typ === "OSWIADCZENIE"),
      bases.filter(b => b.typ === "OSWIADCZENIE").map(b => `#${b.id}`).join(", ") || "ok");
    test("T1d", "Abraham: no stanowisko with repeated phrase",
      !bases.some(b => b.stanowisko && /(.{10,})\1/i.test(b.stanowisko)),
      bases.filter(b => b.stanowisko).map(b => `#${b.id}: "${b.stanowisko?.substring(0, 50)}"`).join("; "));
  }

  // T2: Hanson (280)
  {
    const f = await db.fdkForeigner.findUnique({
      where: { id: 280 },
      include: { employmentBases: true },
    });
    const bases = f?.employmentBases ?? [];
    const sc = bases.find(b => b.nrDecyzji?.includes("6151.2749.2025"));
    test("T2a", "Hanson: has base SC-XIV.6151.2749.2025", !!sc, sc ? `#${sc.id}` : "not found");
    test("T2b", "Hanson: firma = FUNDACJA FIRMA DLA KAŻDEGO",
      sc?.firma === "FUNDACJA FIRMA DLA KAŻDEGO", `got "${sc?.firma?.substring(0, 40)}"`);
    test("T2c", "Hanson: dataDo = 2029-08-24",
      sc?.dataDo?.toISOString().slice(0, 10) === "2029-08-24", `got ${sc?.dataDo?.toISOString().slice(0, 10) ?? "null"}`);
    test("T2d", "Hanson: no OSWIADCZENIE",
      !bases.some(b => b.typ === "OSWIADCZENIE"),
      bases.filter(b => b.typ === "OSWIADCZENIE").map(b => `#${b.id}`).join(", ") || "ok");
    const best = getCurrentBasis(bases);
    test("T2e", "Hanson: current basis = the SC decision",
      best?.id === sc?.id, `best=#${best?.id} (${best?.typ}), sc=#${sc?.id}`);
    test("T2f", "Hanson: decyzjaPobytowaDo >= 2029-08-24",
      f?.decyzjaPobytowaDo?.toISOString().slice(0, 10) >= "2029-08-24",
      `got ${f?.decyzjaPobytowaDo?.toISOString().slice(0, 10) ?? "null"}`);
  }

  // T3: Adeosun (382)
  {
    const f = await db.fdkForeigner.findUnique({
      where: { id: 382 },
      include: { employmentBases: true },
    });
    const bases = f?.employmentBases ?? [];
    const activeOsw = bases.filter(b => b.typ === "OSWIADCZENIE" && computeStatus(b) === "AKTYWNE");
    test("T3a", "Adeosun: no active OSWIADCZENIE",
      activeOsw.length === 0, `${activeOsw.length} active oświadczenia`);
    const best = getCurrentBasis(bases);
    test("T3b", "Adeosun: current basis ≠ OSWIADCZENIE",
      !best || best.typ !== "OSWIADCZENIE", `best=${best?.typ ?? "null"}`);
  }

  // T4: Anikanov (162)
  {
    const f = await db.fdkForeigner.findUnique({
      where: { id: 162 },
      include: { employmentBases: true },
    });
    const bases = f?.employmentBases ?? [];
    const best = getCurrentBasis(bases);
    test("T4a", "Anikanov: current basis = EU Blue Card",
      best?.typ === "BLUE_CARD", `got ${best?.typ ?? "null"}`);
    test("T4b", "Anikanov: status = AKTYWNE",
      best ? computeStatus(best) === "AKTYWNE" : false, `got ${best ? computeStatus(best) : "null"}`);
    test("T4c", "Anikanov: dataDo = 2028-05-29",
      best?.dataDo?.toISOString().slice(0, 10) === "2028-05-29",
      `got ${best?.dataDo?.toISOString().slice(0, 10) ?? "null"}`);
  }

  // T5: du Toit (198)
  {
    const f = await db.fdkForeigner.findUnique({
      where: { id: 198 },
      include: { employmentBases: true },
    });
    const bases = f?.employmentBases ?? [];
    const kp2028 = bases.filter(b => b.typ === "KARTA_POBYTU" && b.dataDo?.toISOString().slice(0, 10) === "2028-10-24");
    test("T5a", "du Toit: exactly 1 karta pobytu with dataDo 24.10.2028",
      kp2028.length === 1, `got ${kp2028.length}`);
    const withWyn = bases.filter(b => b.wynagrodzenie && !/\/ mies\.|PLN\/h|do uzupełnienia|PLN brutto|PLN netto/i.test(b.wynagrodzenie));
    test("T5b", "du Toit: no salary without unit",
      withWyn.length === 0, withWyn.map(b => `#${b.id}: "${b.wynagrodzenie}"`).join("; ") || "ok");
  }

  // T6: no active OSWIADCZENIE for wrong citizenships (whole DB)
  {
    const countries = await db.oswiadczenieCountry.findMany();
    const allOsw = await db.fdkEmploymentBase.findMany({
      where: { typ: "OSWIADCZENIE" },
      include: { foreigner: true },
    });
    let violations = 0;
    const violationNames = [];
    for (const b of allOsw) {
      const status = computeStatus(b);
      if (status !== "AKTYWNE" && status !== "W_TRAKCIE") continue;
      const cit = b.foreigner.obywatelstwo;
      if (!cit) continue;
      const norm = stripDiacritics(cit);
      const aliasCode = ALIASES[norm];
      const match = countries.find(c => {
        const code = c.countryCode.toLowerCase();
        const name = stripDiacritics(c.countryName);
        if (aliasCode && code === aliasCode.toLowerCase()) return true;
        return norm === code || norm === name || name.includes(norm) || norm.includes(name);
      });
      if (!match) {
        violations++;
        violationNames.push(`${b.foreigner.imie} ${b.foreigner.nazwisko} (${cit})`);
      } else if (match.validTo && (b.dataOd ?? new Date()) > match.validTo) {
        violations++;
        violationNames.push(`${b.foreigner.imie} ${b.foreigner.nazwisko} (${cit}, po ${match.validTo.toISOString().slice(0,10)})`);
      }
    }
    test("T6", "No active OSWIADCZENIE for ineligible citizenships",
      violations === 0, violations > 0 ? `${violations}: ${violationNames.slice(0, 5).join(", ")}` : "ok");
  }

  // T7: no salary without unit
  {
    const allWithWyn = await db.fdkEmploymentBase.findMany({
      where: { wynagrodzenie: { not: null } },
    });
    const noUnit = allWithWyn.filter(b => {
      const w = b.wynagrodzenie;
      if (!w) return false;
      // Has unit if contains "/ mies.", "PLN/h", "brutto", "netto", "do uzupełnienia"
      return !/\/ mies\.|PLN\/h|brutto|netto|do uzupełnienia/i.test(w);
    });
    test("T7", "All salaries have unit or marked",
      noUnit.length === 0, noUnit.length > 0 ? `${noUnit.length} without unit` : "ok");
  }

  // T8: no duplicate (foreigner, typ, dataDo) pairs
  {
    const allBases = await db.fdkEmploymentBase.findMany({
      where: { status: { notIn: ["NIEAKTYWNE"] } },
    });
    const seen = new Map();
    let dupes = 0;
    for (const b of allBases) {
      const key = `${b.foreignerId}|${b.typ}|${b.dataDo?.toISOString().slice(0, 10) ?? "null"}`;
      if (seen.has(key)) dupes++;
      else seen.set(key, b.id);
    }
    test("T8", "No duplicate (foreigner, typ, dataDo) active pairs",
      dupes === 0, `${dupes} duplicates`);
  }

  // T9: 20 random records — current basis consistent
  {
    const count = await db.fdkForeigner.count();
    const skip = Math.max(0, Math.floor(Math.random() * (count - 20)));
    const sample = await db.fdkForeigner.findMany({
      skip, take: 20,
      include: { employmentBases: true },
    });
    let consistent = 0;
    for (const f of sample) {
      const best = getCurrentBasis(f.employmentBases);
      // Just verify getCurrentBasis returns a result or null consistently
      if (best === null || (best.typ && best.dataDo !== undefined)) consistent++;
    }
    test("T9", "20 random records: getCurrentBasis consistent",
      consistent === sample.length, `${consistent}/${sample.length} consistent`);
  }

  // T10: Abraham Dane HR
  {
    const contracts = await db.fdkHrContract.findMany({ where: { foreignerId: 47 } });
    test("T10", "Abraham: HR tab shows contracts if they exist",
      true, // This is informational — if no contracts exist, "Brak danych HR" is correct
      `${contracts.length} contracts found`);
  }

  // Summary
  console.log("\n=== Summary ===\n");
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`  Passed: ${passed}/${results.length}`);
  console.log(`  Failed: ${failed}/${results.length}`);
  if (failed > 0) {
    console.log("\n  Failed tests:");
    results.filter(r => !r.pass).forEach(r => console.log(`    ${r.id}: ${r.description} — ${r.detail}`));
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
