/**
 * Match active employees CSV to FDK profiles.
 * - PESEL matching (pad to 11 digits)
 * - Fallback: name matching (normalized, both orders)
 * - Matched → hidden=false, store employee_id/user_id
 * - Unmatched → hidden=true
 *
 * Usage:
 *   node scripts/match-active-employees.mjs <path-to-csv>                    # dry-run
 *   node scripts/match-active-employees.mjs <path-to-csv> --run              # execute
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "match-active-employees";
const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const DO_RUN = args.includes("--run");

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error("Użycie: node scripts/match-active-employees.mjs <ścieżka-do-csv> [--run]");
  process.exit(1);
}

function normalizeTokens(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

function tokensMatch(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  // Require EXACT match on surname (last token) + at least one first-name token match
  // Both sets must share at least one token exactly (not prefix)
  let exactMatches = 0;
  for (const t of tokensA) {
    for (const p of tokensB) {
      if (t === p) { exactMatches++; break; }
    }
  }
  // Need at least 2 exact token matches (surname + first name)
  // For single-token names, require exact match
  const minRequired = Math.min(tokensA.length, tokensB.length) >= 2 ? 2 : 1;
  return exactMatches >= minRequired;
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  MATCH ACTIVE EMPLOYEES → FDK PROFILES`);
  console.log(`  CSV: ${csvPath}`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Parse CSV
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(";");
  console.log(`CSV header: ${header.join(", ")}`);
  console.log(`CSV rows: ${lines.length - 1}\n`);

  const employees = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    const emp = {
      employee_id: cols[0]?.trim() ?? "",
      user_id: cols[1]?.trim() ?? "",
      imie: cols[2]?.trim() ?? "",
      drugie_imie: cols[3]?.trim() ?? "",
      nazwisko: cols[4]?.trim() ?? "",
      pesel: cols[5]?.trim() ?? "",
    };
    // Pad PESEL to 11 digits
    if (emp.pesel && /^\d{10}$/.test(emp.pesel)) {
      emp.pesel = "0" + emp.pesel;
    }
    employees.push(emp);
  }
  console.log(`Pracowników w CSV: ${employees.length}`);

  // Load all profiles
  const allProfiles = await db.fdkForeigner.findMany({
    select: { id: true, imie: true, nazwisko: true, pesel: true, hidden: true, employeeId: true },
  });
  console.log(`Profili w bazie: ${allProfiles.length}\n`);

  // Build lookup maps
  const peselMap = new Map(); // pesel → profile
  const nameTokenMap = []; // [{profile, tokens}]
  for (const p of allProfiles) {
    if (p.pesel) {
      let pesel = p.pesel.trim();
      if (/^\d{10}$/.test(pesel)) pesel = "0" + pesel;
      peselMap.set(pesel, p);
    }
    const fullName = `${p.imie ?? ""} ${p.nazwisko}`.trim();
    nameTokenMap.push({ profile: p, tokens: normalizeTokens(fullName) });
  }

  // Match
  const matched = []; // {employee, profile, matchType}
  const ambiguous = []; // {employee, candidates, reason}
  const noProfile = []; // {employee}
  const matchedProfileIds = new Set();

  for (const emp of employees) {
    const empName = `${emp.imie} ${emp.nazwisko}`.trim();

    // 1. Try PESEL match
    if (emp.pesel && emp.pesel.length === 11) {
      const profile = peselMap.get(emp.pesel);
      if (profile) {
        matched.push({ employee: emp, profile, matchType: "PESEL" });
        matchedProfileIds.add(profile.id);
        continue;
      }
    }

    // 2. Try name match
    const empTokens = normalizeTokens(empName);
    const empTokensWithDrugie = normalizeTokens(`${emp.imie} ${emp.drugie_imie} ${emp.nazwisko}`.trim());

    const candidates = nameTokenMap.filter(({ tokens }) =>
      tokensMatch(empTokens, tokens) || tokensMatch(empTokensWithDrugie, tokens)
    ).map(({ profile }) => profile);

    if (candidates.length === 1) {
      if (matchedProfileIds.has(candidates[0].id)) {
        ambiguous.push({ employee: emp, candidates: candidates.map(c => `id=${c.id} ${c.imie} ${c.nazwisko}`), reason: "Profil już dopasowany do innego pracownika" });
      } else {
        matched.push({ employee: emp, profile: candidates[0], matchType: "NAME" });
        matchedProfileIds.add(candidates[0].id);
      }
    } else if (candidates.length > 1) {
      ambiguous.push({ employee: emp, candidates: candidates.map(c => `id=${c.id} ${c.imie} ${c.nazwisko}`), reason: "Wielu kandydatów" });
    } else {
      noProfile.push({ employee: emp });
    }
  }

  // Profiles NOT matched → to hide
  const toHide = allProfiles.filter((p) => !matchedProfileIds.has(p.id));

  // Print summary
  console.log(`${"=".repeat(60)}`);
  console.log(`  WYNIKI DOPASOWANIA`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Dopasowanych (aktywnych): ${matched.length}`);
  console.log(`    - po PESEL: ${matched.filter(m => m.matchType === "PESEL").length}`);
  console.log(`    - po nazwisku: ${matched.filter(m => m.matchType === "NAME").length}`);
  console.log(`  Niejednoznacznych: ${ambiguous.length}`);
  console.log(`  Pracowników BEZ profilu: ${noProfile.length}`);
  console.log(`  Profili do UKRYCIA: ${toHide.length}`);
  console.log(`  Profili AKTYWNYCH: ${matchedProfileIds.size}`);

  // Execute
  if (DO_RUN) {
    console.log(`\n  Wykonuję zmiany...`);
    // Mark matched as active + store employee_id
    for (const m of matched) {
      await db.fdkForeigner.update({
        where: { id: m.profile.id },
        data: {
          hidden: false,
          employeeId: m.employee.employee_id || null,
          externalUserId: m.employee.user_id || null,
        },
      });
    }
    // Mark unmatched as hidden
    const hideIds = toHide.map((p) => p.id);
    if (hideIds.length > 0) {
      await db.fdkForeigner.updateMany({
        where: { id: { in: hideIds } },
        data: { hidden: true },
      });
    }
    console.log(`  Ukrytych: ${hideIds.length}, aktywnych: ${matchedProfileIds.size}`);
  }

  // Generate reports
  // a) aktywni_bez_profilu.csv
  const csvA = ["employee_id;user_id;imie;drugie_imie;nazwisko;pesel"];
  for (const n of noProfile) {
    csvA.push([n.employee.employee_id, n.employee.user_id, n.employee.imie, n.employee.drugie_imie, n.employee.nazwisko, n.employee.pesel].map(v => `"${(v || "").replace(/"/g, '""')}"`).join(";"));
  }
  fs.writeFileSync("aktywni_bez_profilu.csv", csvA.join("\n"), "utf-8");

  // b) ukryci.csv
  const csvB = ["id;nazwisko;imie;pesel;liczba_zalacznikow"];
  for (const p of toHide) {
    csvB.push(`${p.id};"${p.nazwisko}";"${p.imie ?? ""}";"${p.pesel ?? ""}";"?"` );
  }
  fs.writeFileSync("ukryci.csv", csvB.join("\n"), "utf-8");

  // c) niejednoznaczni.csv
  const csvC = ["employee_id;imie;nazwisko;pesel;kandydaci;powod"];
  for (const a of ambiguous) {
    csvC.push([a.employee.employee_id, a.employee.imie, a.employee.nazwisko, a.employee.pesel, a.candidates.join(" | "), a.reason].map(v => `"${(v || "").replace(/"/g, '""')}"`).join(";"));
  }
  fs.writeFileSync("niejednoznaczni.csv", csvC.join("\n"), "utf-8");

  console.log(`\n  Raporty:`);
  console.log(`    aktywni_bez_profilu.csv (${noProfile.length})`);
  console.log(`    ukryci.csv (${toHide.length})`);
  console.log(`    niejednoznaczni.csv (${ambiguous.length})`);
  console.log();

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
