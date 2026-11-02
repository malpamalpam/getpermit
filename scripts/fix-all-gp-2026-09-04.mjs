/**
 * Comprehensive fix script for GP corrections 04.09.2026 — domknięcie.
 *
 * Fixes:
 *   1. Deactivate OSWIADCZENIE bases for wrong citizenships (not just flag)
 *   2. Abraham (47): remove oświadczenia, fix dates (remove DOB), fix stanowisko, dedup to 3
 *   3. Hanson (280): fix firma, dates, decyzjaPobytowaDo, remove oświadczenie
 *   4. Adeosun (382): deactivate oświadczenia
 *   5. du Toit (198): merge duplicate karta pobytu 24.10.2028
 *   6. All salary: add units, flag suspicious
 *   7. Stanowisko: remove "/ w charakterze" prefix, deduplicate
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-all-gp-2026-09-04.mjs              # dry-run
 *   node --env-file=.env.local scripts/fix-all-gp-2026-09-04.mjs --run        # execute
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-all-gp-2026-09-04";
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

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

async function isOswiadczenieAllowed(citizenship, documentDate) {
  const countries = await db.oswiadczenieCountry.findMany();
  const norm = stripDiacritics(citizenship || "");
  if (!norm) return true;
  const aliasCode = ALIASES[norm];
  const match = countries.find((c) => {
    const code = c.countryCode.toLowerCase();
    const name = stripDiacritics(c.countryName);
    if (aliasCode && code === aliasCode.toLowerCase()) return true;
    return norm === code || norm === name || name.includes(norm) || norm.includes(name);
  });
  if (!match) return false;
  const checkDate = documentDate ?? new Date();
  if (match.validFrom && checkDate < match.validFrom) return false;
  if (match.validTo && checkDate > match.validTo) return false;
  return true;
}

async function log(foreignerId, field, oldValue, newValue) {
  if (!DO_RUN) return;
  await db.fdkChangeLog.create({
    data: { foreignerId, changedBy: CHANGED_BY, field, oldValue, newValue },
  });
}

// ============================================================
// 1. Deactivate OSWIADCZENIE bases for wrong citizenships
// ============================================================
async function fixOswiadczenia() {
  console.log("\n=== 1. Deactivate wrong-citizenship OSWIADCZENIE bases ===\n");

  const bases = await db.fdkEmploymentBase.findMany({
    where: { typ: "OSWIADCZENIE" },
    include: { foreigner: true },
  });

  let count = 0;
  for (const base of bases) {
    const cit = base.foreigner.obywatelstwo;
    if (!cit) continue;
    const allowed = await isOswiadczenieAllowed(cit, base.dataOd);
    if (!allowed) {
      const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
      console.log(`  [DEACTIVATE] ${name} (${cit}): #${base.id} → NIEAKTYWNE`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({
          where: { id: base.id },
          data: { status: "NIEAKTYWNE" },
        });
        await log(base.foreignerId, "employment_base_fix",
          `Podstawa #${base.id} OSWIADCZENIE status=${base.status}`,
          `NIEAKTYWNE — obywatelstwo "${cit}" nie uprawnia do oświadczeń`);
      }
      count++;
    }
  }
  console.log(`  Deaktywowanych: ${count}`);
}

// ============================================================
// 2. Abraham (foreignerId=47)
// ============================================================
async function fixAbraham() {
  console.log("\n=== 2. Fix Abraham (id=47) ===\n");
  const ABRAHAM_ID = 47;
  const DOB = "1993-04-25";

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: ABRAHAM_ID },
    include: { employmentBases: true },
  });
  if (!foreigner) { console.log("  Abraham not found!"); return; }

  console.log(`  Bases: ${foreigner.employmentBases.length}`);

  for (const base of foreigner.employmentBases) {
    // Remove oświadczenia
    if (base.typ === "OSWIADCZENIE") {
      console.log(`  [DELETE] Oświadczenie #${base.id}`);
      if (DO_RUN) {
        await log(ABRAHAM_ID, "employment_base_fix", `Podstawa #${base.id} OSWIADCZENIE`, "Usunięta — obywatelstwo Malezja nie uprawnia");
        await db.fdkEmploymentBase.delete({ where: { id: base.id } });
      }
      continue;
    }

    // Fix dates: remove DOB as dataOd
    const dataOdStr = base.dataOd ? base.dataOd.toISOString().slice(0, 10) : null;
    if (dataOdStr === DOB) {
      console.log(`  [FIX DATE] #${base.id}: dataOd=${DOB} (DOB) → null`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { dataOd: null } });
        await log(ABRAHAM_ID, "dataOd", DOB, "null — was DOB");
      }
    }

    // Fix stanowisko: remove "/ w charakterze" prefix and deduplicate
    if (base.stanowisko) {
      let fixed = base.stanowisko;
      // Remove "/ w charakterze " prefix
      fixed = fixed.replace(/^\/?\s*w\s+charakterze\s+/i, "").trim();
      // Deduplicate exact repetition
      const half = Math.floor(fixed.length / 2);
      if (fixed.length >= 8 && fixed.substring(0, half).toLowerCase() === fixed.substring(half).toLowerCase()) {
        fixed = fixed.substring(0, half);
      }
      // CamelCase dedup: "abcDef" where lower→upper boundary splits into duplicates
      const parts = fixed.split(/(?<=[a-ząćęłńóśźż])(?=[A-ZĄĆĘŁŃÓŚŹŻ])/);
      if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
        fixed = parts[0];
      }
      if (fixed !== base.stanowisko) {
        console.log(`  [FIX STANOWISKO] #${base.id}: "${base.stanowisko}" → "${fixed}"`);
        if (DO_RUN) {
          await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { stanowisko: fixed } });
          await log(ABRAHAM_ID, "stanowisko", base.stanowisko, fixed);
        }
      }
    }
  }

  // Dedup remaining bases
  const remaining = await db.fdkEmploymentBase.findMany({ where: { foreignerId: ABRAHAM_ID }, orderBy: { createdAt: "asc" } });
  console.log(`  Remaining after oświadczenie removal: ${remaining.length}`);

  // Group by (typ, dataDo)
  const groups = new Map();
  for (const b of remaining) {
    const dataDo = b.dataDo ? b.dataDo.toISOString().slice(0, 10) : "null";
    const key = `${b.typ}|${dataDo}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  for (const [key, bases] of groups) {
    if (bases.length < 2) continue;
    // Keep the one with most data
    bases.sort((a, b) => {
      const score = (x) => ["dataOd", "dataDo", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji"].filter(f => x[f]).length;
      return score(b) - score(a);
    });
    const keeper = bases[0];
    for (let i = 1; i < bases.length; i++) {
      console.log(`  [DEDUP] #${bases[i].id} (${bases[i].typ}) → merge into #${keeper.id}`);
      if (DO_RUN) {
        // Merge non-null fields
        const updateData = {};
        for (const f of ["dataOd", "dataDo", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji", "rodzajUmowy"]) {
          if (!keeper[f] && bases[i][f]) updateData[f] = bases[i][f];
        }
        if (Object.keys(updateData).length > 0) {
          await db.fdkEmploymentBase.update({ where: { id: keeper.id }, data: updateData });
        }
        await log(ABRAHAM_ID, "dedup", `Podstawa #${bases[i].id}`, `Wchłonięta przez #${keeper.id}`);
        await db.fdkEmploymentBase.delete({ where: { id: bases[i].id } });
      }
    }
  }

  const finalCount = DO_RUN
    ? (await db.fdkEmploymentBase.count({ where: { foreignerId: ABRAHAM_ID } }))
    : "?? (dry-run)";
  console.log(`  Final count: ${finalCount}`);
}

// ============================================================
// 3. Hanson (foreignerId=280)
// ============================================================
async function fixHanson() {
  console.log("\n=== 3. Fix Hanson (id=280) ===\n");
  const HANSON_ID = 280;

  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: HANSON_ID },
    include: { employmentBases: true },
  });
  if (!foreigner) { console.log("  Hanson not found!"); return; }

  for (const base of foreigner.employmentBases) {
    // Delete oświadczenia (Kanada)
    if (base.typ === "OSWIADCZENIE") {
      console.log(`  [DELETE] Oświadczenie #${base.id}`);
      if (DO_RUN) {
        await log(HANSON_ID, "employment_base_fix", `Podstawa #${base.id} OSWIADCZENIE`, "Usunięta — obywatelstwo Kanada nie uprawnia");
        await db.fdkEmploymentBase.delete({ where: { id: base.id } });
      }
      continue;
    }

    // Fix the karta pobytu with nr SC-XIV.6151.2749.2025
    if (base.typ === "KARTA_POBYTU" && base.nrDecyzji?.includes("6151.2749.2025")) {
      const fixes = {};

      // Fix firma — should be just the employer name
      if (base.firma && base.firma.length > 50) {
        fixes.firma = "FUNDACJA FIRMA DLA KAŻDEGO";
        console.log(`  [FIX FIRMA] #${base.id}: "${base.firma.substring(0, 60)}..." → "FUNDACJA FIRMA DLA KAŻDEGO"`);
      }

      // Fix dataDo if missing or wrong
      if (!base.dataDo || base.dataDo.toISOString().slice(0, 10) !== "2029-08-24") {
        fixes.dataDo = new Date("2029-08-24");
        console.log(`  [FIX DATADO] #${base.id}: ${base.dataDo?.toISOString().slice(0, 10) ?? "null"} → 2029-08-24`);
      }

      // Fix status
      if (base.status === "BRAK_DANYCH") {
        fixes.status = "AKTYWNE";
        console.log(`  [FIX STATUS] #${base.id}: BRAK_DANYCH → AKTYWNE`);
      }

      if (Object.keys(fixes).length > 0 && DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: fixes });
        await log(HANSON_ID, "employment_base_fix",
          `#${base.id}: firma truncated, dataDo fixed, status fixed`,
          JSON.stringify(fixes));
      }
    }
  }

  // Update decyzjaPobytowaDo to 2029-08-24
  const currentDecyzja = foreigner.decyzjaPobytowaDo;
  const targetDate = new Date("2029-08-24");
  if (!currentDecyzja || currentDecyzja < targetDate) {
    console.log(`  [FIX POBYT] decyzjaPobytowaDo: ${currentDecyzja?.toISOString().slice(0, 10) ?? "null"} → 2029-08-24`);
    if (DO_RUN) {
      await db.fdkForeigner.update({ where: { id: HANSON_ID }, data: { decyzjaPobytowaDo: targetDate } });
      await log(HANSON_ID, "decyzjaPobytowaDo",
        currentDecyzja?.toISOString().slice(0, 10) ?? "null", "2029-08-24");
    }
  }
}

// ============================================================
// 4. du Toit (foreignerId=198) — merge duplicate karta 24.10.2028
// ============================================================
async function fixDuToit() {
  console.log("\n=== 4. Fix du Toit (id=198) ===\n");
  const DUTOIT_ID = 198;

  const bases = await db.fdkEmploymentBase.findMany({
    where: { foreignerId: DUTOIT_ID },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  Bases: ${bases.length}`);

  // Find duplicate karta_pobytu with same dataDo
  const groups = new Map();
  for (const b of bases) {
    if (b.typ !== "KARTA_POBYTU") continue;
    const dataDo = b.dataDo ? b.dataDo.toISOString().slice(0, 10) : "null";
    if (!groups.has(dataDo)) groups.set(dataDo, []);
    groups.get(dataDo).push(b);
  }

  for (const [dataDo, dupes] of groups) {
    if (dupes.length < 2) continue;
    // Keep the one with most data
    dupes.sort((a, b) => {
      const score = (x) => ["dataOd", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji", "sygnatura", "urzad"].filter(f => x[f]).length;
      return score(b) - score(a);
    });
    const keeper = dupes[0];
    for (let i = 1; i < dupes.length; i++) {
      console.log(`  [DEDUP] Karta ${dataDo}: #${dupes[i].id} → merge into #${keeper.id}`);
      if (DO_RUN) {
        const updateData = {};
        for (const f of ["dataOd", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji", "sygnatura", "urzad", "rodzajSprawy", "rodzajUmowy"]) {
          if (!keeper[f] && dupes[i][f]) updateData[f] = dupes[i][f];
        }
        if (Object.keys(updateData).length > 0) {
          await db.fdkEmploymentBase.update({ where: { id: keeper.id }, data: updateData });
        }
        await log(DUTOIT_ID, "dedup", `Podstawa #${dupes[i].id} KARTA_POBYTU`, `Wchłonięta przez #${keeper.id}`);
        await db.fdkEmploymentBase.delete({ where: { id: dupes[i].id } });
      }
    }
  }
}

// ============================================================
// 5. Fix all salary: add units, flag suspicious
// ============================================================
async function fixSalary() {
  console.log("\n=== 5. Fix salary (all bases) ===\n");

  const bases = await db.fdkEmploymentBase.findMany({
    where: { wynagrodzenie: { not: null } },
    include: { foreigner: true },
  });

  let fixed = 0;
  let flagged = 0;

  for (const base of bases) {
    const wyn = base.wynagrodzenie;
    if (!wyn) continue;

    // Already formatted with unit?
    if (/\/ mies\.|PLN\/h|do uzupełnienia/i.test(wyn)) continue;

    // Parse
    const numMatch = wyn.match(/(\d[\d\s]*(?:[.,]\d{1,2})?)/);
    if (!numMatch) continue;

    const kwotaStr = numMatch[1].replace(/\s/g, "").replace(",", ".");
    const kwota = parseFloat(kwotaStr);
    if (isNaN(kwota) || kwota <= 0) continue;

    let jednostka = "nieznana";
    if (/miesi[ęe]czn|\/\s*mies/i.test(wyn)) jednostka = "miesiecznie";
    else if (/godzin|\/\s*h\b|\/\s*godz/i.test(wyn)) jednostka = "godzinowo";

    let bruttoNetto = "";
    if (/brutto/i.test(wyn)) bruttoNetto = " brutto";
    else if (/netto/i.test(wyn)) bruttoNetto = " netto";

    const podejrzana =
      (jednostka === "miesiecznie" && kwota < 1000) ||
      (jednostka === "godzinowo" && kwota < 20) ||
      (jednostka === "nieznana" && kwota < 20);

    let newWyn;
    const fmt = kwota.toLocaleString("pl-PL", { minimumFractionDigits: kwota % 1 !== 0 ? 2 : 0 });

    if (jednostka === "godzinowo") {
      const monthly = Math.round(kwota * 168);
      newWyn = `${fmt} PLN/h${bruttoNetto} — ≈ ${monthly.toLocaleString("pl-PL")} PLN/mies. przy pełnym etacie`;
    } else if (jednostka === "miesiecznie") {
      newWyn = `${fmt} PLN${bruttoNetto} / mies.`;
    } else {
      // Unknown unit — leave as structured but mark
      newWyn = `${fmt} PLN${bruttoNetto}`;
      if (podejrzana) newWyn += " — do uzupełnienia";
    }

    if (newWyn === wyn) continue;

    const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
    const flag = podejrzana ? " [PODEJRZANA]" : "";
    console.log(`  ${name} #${base.id}: "${wyn}" → "${newWyn}"${flag}`);

    if (DO_RUN) {
      const uwagi = podejrzana
        ? (base.uwagi ? `${base.uwagi}\n⚠ Stawka podejrzana — sprawdź` : "⚠ Stawka podejrzana — sprawdź")
        : base.uwagi;
      await db.fdkEmploymentBase.update({
        where: { id: base.id },
        data: { wynagrodzenie: newWyn, ...(podejrzana ? { uwagi } : {}) },
      });
      await log(base.foreignerId, "wynagrodzenie", wyn, newWyn + flag);
    }

    fixed++;
    if (podejrzana) flagged++;
  }

  console.log(`  Fixed: ${fixed}, Flagged suspicious: ${flagged}`);
}

// ============================================================
// 6. Fix stanowisko across all bases
// ============================================================
async function fixStanowisko() {
  console.log("\n=== 6. Fix stanowisko (all bases) ===\n");

  const bases = await db.fdkEmploymentBase.findMany({
    where: { stanowisko: { not: null } },
    include: { foreigner: true },
  });

  let fixed = 0;
  for (const base of bases) {
    let s = base.stanowisko;
    if (!s) continue;

    // Remove "/ w charakterze" prefix
    s = s.replace(/^\/?\s*w\s+charakterze\s+/i, "").trim();

    // Exact halving dedup
    const half = Math.floor(s.length / 2);
    if (s.length >= 8 && s.substring(0, half).toLowerCase() === s.substring(half).toLowerCase()) {
      s = s.substring(0, half);
    }

    // CamelCase boundary dedup
    const parts = s.split(/(?<=[a-ząćęłńóśźż])(?=[A-ZĄĆĘŁŃÓŚŹŻ])/);
    if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
      s = parts[0];
    }

    if (s !== base.stanowisko) {
      const name = `${base.foreigner.imie ?? ""} ${base.foreigner.nazwisko}`.trim();
      console.log(`  ${name} #${base.id}: "${base.stanowisko}" → "${s}"`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { stanowisko: s } });
        await log(base.foreignerId, "stanowisko", base.stanowisko, s);
      }
      fixed++;
    }
  }
  console.log(`  Fixed: ${fixed}`);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`\n========================================`);
  console.log(`  GP fix-all script (${DO_RUN ? "RUN" : "DRY-RUN"})`);
  console.log(`========================================\n`);

  await fixOswiadczenia();
  await fixAbraham();
  await fixHanson();
  await fixDuToit();
  await fixSalary();
  await fixStanowisko();

  console.log("\n========================================");
  console.log("  Done!");
  console.log("========================================\n");

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
