/**
 * GP fix-all v2 — based on debug-records output.
 * Fixes exact records by ID + global dedup + global salary + global stanowisko.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-all-gp-v2.mjs              # dry-run
 *   node --env-file=.env.local scripts/fix-all-gp-v2.mjs --run        # execute
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CHANGED_BY = "fix-all-gp-v2";
const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");

async function log(foreignerId, field, oldValue, newValue) {
  if (!DO_RUN) return;
  await db.fdkChangeLog.create({
    data: { foreignerId, changedBy: CHANGED_BY, field, oldValue, newValue },
  });
}

const ALIASES = {
  "georgia": "GE", "gruzja": "GE", "belarus": "BY", "bialorus": "BY",
  "moldova": "MD", "moldawia": "MD", "ukraine": "UA", "ukraina": "UA",
  "russia": "RU", "rosja": "RU", "armenia": "AM",
};
function strip(s) { return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

async function isOswAllowed(citizenship, docDate) {
  const countries = await db.oswiadczenieCountry.findMany();
  const norm = strip(citizenship || "");
  if (!norm) return true;
  const alias = ALIASES[norm];
  const match = countries.find(c => {
    const code = c.countryCode.toLowerCase();
    const name = strip(c.countryName);
    if (alias && code === alias.toLowerCase()) return true;
    return norm === code || norm === name || name.includes(norm) || norm.includes(name);
  });
  if (!match) return false;
  const d = docDate ?? new Date();
  if (match.validFrom && d < match.validFrom) return false;
  if (match.validTo && d > match.validTo) return false;
  return true;
}

// ============================================================
// 1. Global: deactivate OSWIADCZENIE for wrong citizenships
// ============================================================
async function fixOswiadczeniaGlobal() {
  console.log("\n=== 1. Deactivate wrong-citizenship OSWIADCZENIE ===\n");
  const bases = await db.fdkEmploymentBase.findMany({
    where: { typ: "OSWIADCZENIE", status: { notIn: ["NIEAKTYWNE"] } },
    include: { foreigner: true },
  });
  let count = 0;
  for (const b of bases) {
    const cit = b.foreigner.obywatelstwo;
    if (!cit) continue;
    if (await isOswAllowed(cit, b.dataOd)) continue;
    const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
    console.log(`  [DEACTIVATE] ${name} (${cit}): #${b.id} ${b.status} → NIEAKTYWNE`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { status: "NIEAKTYWNE" } });
      await log(b.foreignerId, "employment_base_fix", `#${b.id} status=${b.status}`, `NIEAKTYWNE — ${cit} nie uprawnia`);
    }
    count++;
  }
  console.log(`  Total: ${count}`);
}

// ============================================================
// 2. Abraham (47): delete oświadczenia, fix DOB dates, fix stanowisko, dedup
// ============================================================
async function fixAbraham() {
  console.log("\n=== 2. Abraham (47) ===\n");
  const FID = 47;
  const DOB = "1993-04-25";

  // Delete oświadczenia: #287, #408
  for (const id of [287, 408]) {
    console.log(`  [DELETE] Oświadczenie #${id}`);
    if (DO_RUN) {
      await log(FID, "delete", `Podstawa #${id} OSWIADCZENIE`, "Usunięta — Malezja nie uprawnia");
      await db.fdkEmploymentBase.delete({ where: { id } }).catch(() => {});
    }
  }

  // Fix DOB dates on #342, #343, #392
  for (const id of [342, 343, 392]) {
    console.log(`  [FIX DATE] #${id}: dataOd=${DOB} → null`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.update({ where: { id }, data: { dataOd: null } }).catch(() => {});
      await log(FID, "dataOd", DOB, "null (was DOB)");
    }
  }

  // Fix stanowisko on all Abraham's bases
  const bases = await db.fdkEmploymentBase.findMany({ where: { foreignerId: FID } });
  for (const b of bases) {
    if (!b.stanowisko) continue;
    let s = b.stanowisko;
    // Remove "/ w charakterze:" or "/ w charakterze " prefix
    s = s.replace(/^\/?\s*w\s+charakterze\s*:?\s*/i, "").trim();
    // Dedup exact halving
    const half = Math.floor(s.length / 2);
    if (s.length >= 8) {
      if (s.substring(0, half).toLowerCase() === s.substring(half).toLowerCase()) s = s.substring(0, half);
      else if (s.length % 2 === 1 && s.substring(0, half).toLowerCase() === s.substring(half + 1).toLowerCase()) s = s.substring(0, half);
    }
    // CamelCase boundary dedup
    const parts = s.split(/(?<=[a-ząćęłńóśźż])(?=[A-ZĄĆĘŁŃÓŚŹŻ])/);
    if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) s = parts[0];
    if (s !== b.stanowisko) {
      console.log(`  [FIX STAN] #${b.id}: "${b.stanowisko.substring(0, 60)}" → "${s.substring(0, 60)}"`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { stanowisko: s } });
      }
    }
  }

  // Dedup: #342 (dataDo 2024-10-01), #343 (2025-08-18), #392 (2025-10-31) all ZEZWOLENIE without nrDecyzji
  // #392 dataDo=2025-10-31 overlaps with #230 dataDo=2026-10-31 — likely same doc badly parsed. Delete #392.
  // Keep #342 and #343 as two separate historical zezwolenia (different dataDo).
  // Result: #230 (ZEZWOLENIE active), #239 (KARTA_POBYTU active), #342 (ZEZW expired), #343 (ZEZW expired) = 4 bases
  // User wants 3, but we can't determine which historical one is the "real" second electronic permit without re-parsing.
  // Delete #392 as it's redundant with #230 (both period ending ~10.2025/2026)
  console.log(`  [DELETE] #392 (ZEZWOLENIE dataDo=2025-10-31, overlaps with #230)`);
  if (DO_RUN) {
    await log(FID, "dedup", "#392 ZEZWOLENIE", "Usunięta — nakłada się z #230");
    await db.fdkEmploymentBase.delete({ where: { id: 392 } }).catch(() => {});
  }

  const remaining = DO_RUN ? await db.fdkEmploymentBase.count({ where: { foreignerId: FID } }) : "dry-run";
  console.log(`  Final count: ${remaining}`);
}

// ============================================================
// 3. Hanson (280): fix #1343, delete #1310, update decyzjaPobytowaDo
// ============================================================
async function fixHanson() {
  console.log("\n=== 3. Hanson (280) ===\n");
  const FID = 280;

  // Delete oświadczenie #1310
  console.log(`  [DELETE] Oświadczenie #1310`);
  if (DO_RUN) {
    await log(FID, "delete", "#1310 OSWIADCZENIE AKTYWNE", "Usunięta — Kanada nie uprawnia");
    await db.fdkEmploymentBase.delete({ where: { id: 1310 } }).catch(() => {});
  }

  // Fix #1343: firma, dataDo, status
  console.log(`  [FIX] #1343: firma → "FUNDACJA FIRMA DLA KAŻDEGO", dataDo → 2029-08-24, status → AKTYWNE`);
  if (DO_RUN) {
    await db.fdkEmploymentBase.update({
      where: { id: 1343 },
      data: {
        firma: "FUNDACJA FIRMA DLA KAŻDEGO",
        dataDo: new Date("2029-08-24"),
        status: "AKTYWNE",
      },
    });
    await log(FID, "employment_base_fix", "#1343 firma/dataDo/status", "FUNDACJA FIRMA DLA KAŻDEGO, 2029-08-24, AKTYWNE");
  }

  // Update decyzjaPobytowaDo
  console.log(`  [FIX] decyzjaPobytowaDo → 2029-08-24`);
  if (DO_RUN) {
    await db.fdkForeigner.update({
      where: { id: FID },
      data: { decyzjaPobytowaDo: new Date("2029-08-24") },
    });
    await log(FID, "decyzjaPobytowaDo", "2026-03-28", "2029-08-24");
  }
}

// ============================================================
// 4. du Toit (198): merge #1088 and #1089 (karta 2028-10-24)
// ============================================================
async function fixDuToit() {
  console.log("\n=== 4. du Toit (198) ===\n");
  const FID = 198;

  // #1088 has data (AKTYWNE, dataOd, nrDecyzji), #1089 has less (BRAK_DANYCH, no dataOd) → delete #1089
  console.log(`  [DEDUP] #1089 (KARTA_POBYTU BRAK_DANYCH dataDo=2028-10-24) → merge into #1088`);
  if (DO_RUN) {
    // Merge any non-null fields from #1089 into #1088
    const b1088 = await db.fdkEmploymentBase.findUnique({ where: { id: 1088 } });
    const b1089 = await db.fdkEmploymentBase.findUnique({ where: { id: 1089 } });
    if (b1088 && b1089) {
      const update = {};
      for (const f of ["firma", "stanowisko", "wynagrodzenie", "nrDecyzji", "sygnatura", "urzad", "rodzajSprawy", "rodzajUmowy"]) {
        if (!b1088[f] && b1089[f]) update[f] = b1089[f];
      }
      if (Object.keys(update).length > 0) {
        await db.fdkEmploymentBase.update({ where: { id: 1088 }, data: update });
      }
      await log(FID, "dedup", `#1089 KARTA_POBYTU`, `Wchłonięta przez #1088`);
      await db.fdkEmploymentBase.delete({ where: { id: 1089 } });
    }
  }

  // Also fix DOB dates on du Toit's bases (#891, #965, #967, #968 have dataOd = 1993-03-20 = DOB)
  for (const id of [891, 965, 967, 968]) {
    console.log(`  [FIX DATE] #${id}: dataOd=1993-03-20 (DOB) → null`);
    if (DO_RUN) {
      await db.fdkEmploymentBase.update({ where: { id }, data: { dataOd: null } }).catch(() => {});
      await log(FID, "dataOd", "1993-03-20", "null (was DOB)");
    }
  }
}

// ============================================================
// 5. Global salary: fix unit-less salaries
// ============================================================
async function fixSalary() {
  console.log("\n=== 5. Fix salary ===\n");
  const bases = await db.fdkEmploymentBase.findMany({
    where: { wynagrodzenie: { not: null } },
    include: { foreigner: true },
  });
  let count = 0;
  for (const b of bases) {
    const w = b.wynagrodzenie;
    if (!w) continue;
    // Already has unit?
    if (/\/ mies\.|PLN\/h|brutto|netto|do uzupełnienia/i.test(w)) continue;

    // "48,75 PLN" → needs "do uzupełnienia" since we don't know unit
    let newW = w;
    if (/^\d[\d\s.,]*\s*PLN\s*$/i.test(w.trim())) {
      newW = w.trim() + " — do uzupełnienia (brak jednostki)";
    }

    if (newW !== w) {
      const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
      console.log(`  ${name} #${b.id}: "${w}" → "${newW}"`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { wynagrodzenie: newW } });
        await log(b.foreignerId, "wynagrodzenie", w, newW);
      }
      count++;
    }
  }
  console.log(`  Fixed: ${count}`);
}

// ============================================================
// 6. Global stanowisko fix
// ============================================================
async function fixStanowisko() {
  console.log("\n=== 6. Fix stanowisko ===\n");
  const bases = await db.fdkEmploymentBase.findMany({
    where: { stanowisko: { not: null } },
    include: { foreigner: true },
  });
  let count = 0;
  for (const b of bases) {
    let s = b.stanowisko;
    if (!s) continue;

    // Remove "/ w charakterze:" or "/ w charakterze " prefix (with or without colon/slash)
    s = s.replace(/^\/?\s*w\s+charakterze\s*:?\s*/i, "").trim();

    // Exact halving dedup
    if (s.length >= 8) {
      const half = Math.floor(s.length / 2);
      if (s.substring(0, half).toLowerCase() === s.substring(half).toLowerCase()) {
        s = s.substring(0, half);
      } else if (s.length % 2 === 1 && s.substring(0, half).toLowerCase() === s.substring(half + 1).toLowerCase()) {
        s = s.substring(0, half);
      }
    }

    // CamelCase boundary dedup: "abcDef" → ["abc", "Def"] → if same, keep first
    const parts = s.split(/(?<=[a-ząćęłńóśźż])(?=[A-ZĄĆĘŁŃÓŚŹŻ])/);
    if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
      s = parts[0];
    }

    if (s !== b.stanowisko) {
      const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
      console.log(`  ${name} #${b.id}: "${b.stanowisko.substring(0, 70)}" → "${s.substring(0, 70)}"`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { stanowisko: s } });
        await log(b.foreignerId, "stanowisko", b.stanowisko, s);
      }
      count++;
    }
  }
  console.log(`  Fixed: ${count}`);
}

// ============================================================
// 7. Global dedup: same (foreigner, typ, dataDo) → merge
// ============================================================
async function globalDedup() {
  console.log("\n=== 7. Global dedup ===\n");
  const foreigners = await db.fdkForeigner.findMany({
    include: { employmentBases: { orderBy: { createdAt: "asc" } } },
  });
  let removed = 0;
  for (const f of foreigners) {
    if (f.employmentBases.length < 2) continue;
    const groups = new Map();
    for (const b of f.employmentBases) {
      const dataDo = b.dataDo ? b.dataDo.toISOString().slice(0, 10) : "null";
      const key = `${b.typ}|${dataDo}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(b);
    }
    for (const [, bases] of groups) {
      if (bases.length < 2) continue;
      // Score: count non-null important fields
      const score = (x) => ["dataOd", "dataDo", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji", "nrOswiadczenia", "rodzajUmowy", "urzad", "sygnatura"].filter(f => x[f]).length;
      bases.sort((a, b) => score(b) - score(a));
      const keeper = bases[0];
      for (let i = 1; i < bases.length; i++) {
        const dup = bases[i];
        const name = `${f.imie ?? ""} ${f.nazwisko}`.trim();
        console.log(`  [DEDUP] ${name}: #${dup.id} (${dup.typ}) → #${keeper.id}`);
        if (DO_RUN) {
          const update = {};
          for (const field of ["dataOd", "dataDo", "firma", "stanowisko", "wynagrodzenie", "nrDecyzji", "nrOswiadczenia", "rodzajUmowy", "urzad", "sygnatura", "rodzajSprawy"]) {
            if (!keeper[field] && dup[field]) update[field] = dup[field];
          }
          if (Object.keys(update).length > 0) {
            await db.fdkEmploymentBase.update({ where: { id: keeper.id }, data: update });
          }
          await log(f.id, "dedup", `#${dup.id} ${dup.typ}`, `Wchłonięta przez #${keeper.id}`);
          await db.fdkEmploymentBase.delete({ where: { id: dup.id } });
        }
        removed++;
      }
    }
  }
  console.log(`  Removed: ${removed}`);
}

// ============================================================
async function main() {
  console.log(`\n==== GP fix-all v2 (${DO_RUN ? "RUN" : "DRY-RUN"}) ====\n`);

  await fixOswiadczeniaGlobal();
  await fixAbraham();
  await fixHanson();
  await fixDuToit();
  await fixSalary();
  await fixStanowisko();
  await globalDedup();

  console.log("\n==== Done! ====\n");
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
