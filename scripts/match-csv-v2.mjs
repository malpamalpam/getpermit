/**
 * Match CSV active employees against FDK profiles — v2 with PESEL zero-padding.
 *
 * CSV: aktywni_bez_profilu.csv (825 rows — employees WITHOUT matched profile)
 *
 * Matching order:
 * 1. PESEL exact (11 digits)
 * 2. PESEL with leading zero padding (10→11 digits)
 * 3. imię+nazwisko (normalized, no diacritics)
 *
 * Outputs:
 * - raport-match-v2-unmatched.csv — CSV rows not matched to any profile
 * - raport-match-v2-hidden-candidates.csv — hidden profiles that ARE in CSV (candidates to unhide)
 * - raport-match-v2-pesel-padded.csv — matches found only after zero-padding
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ';' && !inQuotes) { fields.push(current); current = ""; continue; }
    current += ch;
  }
  fields.push(current);
  return fields;
}

function normName(s) {
  return (s ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/ł/g, "l").replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ń/g, "n").replace(/ó/g, "o").replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
    .replace(/[^a-z\s-]/g, "").replace(/\s+/g, " ").trim();
}

function padPesel(pesel) {
  if (!pesel) return null;
  const clean = pesel.replace(/\D/g, "");
  if (clean.length === 11) return clean;
  if (clean.length === 10) return "0" + clean; // leading zero was stripped
  return null; // invalid
}

async function main() {
  // Read CSV
  const csvPath = "aktywni_bez_profilu.csv";
  const lines = fs.readFileSync(csvPath, "utf-8").split(/\r?\n/).filter(l => l.trim());
  const csvRows = lines.slice(1).map(l => {
    const f = parseCsvLine(l);
    return {
      employee_id: f[0]?.trim(),
      user_id: f[1]?.trim(),
      imie: f[2]?.trim(),
      drugie_imie: f[3]?.trim(),
      nazwisko: f[4]?.trim(),
      pesel_raw: f[5]?.trim(),
      pesel: padPesel(f[5]?.trim()),
    };
  });
  console.log(`CSV rows: ${csvRows.length}\n`);

  // Load all FDK profiles
  const profiles = await db.fdkForeigner.findMany({
    select: { id: true, nazwisko: true, imie: true, pesel: true, hidden: true, employeeId: true },
  });

  // Build lookup maps
  const byPesel = new Map(); // pesel (11-digit) → profile
  const byName = new Map(); // "imie|nazwisko" → [profiles]
  const byEmployeeId = new Map();

  for (const p of profiles) {
    if (p.pesel) {
      const padded = padPesel(p.pesel);
      if (padded) byPesel.set(padded, p);
    }
    const key = `${normName(p.imie)}|${normName(p.nazwisko)}`;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(p);
    if (p.employeeId) byEmployeeId.set(p.employeeId, p);
  }

  const results = [];

  for (const row of csvRows) {
    let profile = null;
    let method = "";
    let peselNote = "";

    // 1. employee_id
    if (row.employee_id && byEmployeeId.has(row.employee_id)) {
      profile = byEmployeeId.get(row.employee_id);
      method = "employee_id";
    }

    // 2. PESEL (with padding)
    if (!profile && row.pesel) {
      if (byPesel.has(row.pesel)) {
        profile = byPesel.get(row.pesel);
        method = row.pesel_raw.length === 10 ? "pesel_padded" : "pesel_exact";
        if (row.pesel_raw.length === 10) peselNote = `CSV="${row.pesel_raw}" → padded="${row.pesel}"`;
      }
    }

    // 3. imię+nazwisko (normalized)
    if (!profile) {
      const key = `${normName(row.imie)}|${normName(row.nazwisko)}`;
      const candidates = byName.get(key);
      if (candidates?.length === 1) {
        profile = candidates[0];
        method = "name_unique";
      } else if (candidates?.length > 1) {
        // Try narrowing by PESEL
        if (row.pesel) {
          const byP = candidates.find(c => padPesel(c.pesel) === row.pesel);
          if (byP) { profile = byP; method = "name+pesel"; }
        }
        if (!profile) {
          method = "name_ambiguous";
          // Take first non-hidden if any
          const visible = candidates.find(c => !c.hidden);
          if (visible) { profile = visible; method = "name_ambiguous_first_visible"; }
        }
      }
    }

    results.push({
      ...row,
      profileId: profile?.id ?? null,
      profileHidden: profile?.hidden ?? null,
      matchMethod: method,
      peselNote,
    });
  }

  // Stats
  const matched = results.filter(r => r.profileId);
  const unmatched = results.filter(r => !r.profileId);
  const matchedHidden = matched.filter(r => r.profileHidden === true);
  const peselPadded = results.filter(r => r.matchMethod === "pesel_padded");

  console.log(`=== WYNIKI MATCHOWANIA ===\n`);
  console.log(`CSV wierszy: ${csvRows.length}`);
  console.log(`Zmatchowano: ${matched.length}`);
  console.log(`  - employee_id: ${results.filter(r => r.matchMethod === "employee_id").length}`);
  console.log(`  - pesel exact: ${results.filter(r => r.matchMethod === "pesel_exact").length}`);
  console.log(`  - pesel padded (0→11): ${peselPadded.length}`);
  console.log(`  - name unique: ${results.filter(r => r.matchMethod === "name_unique").length}`);
  console.log(`  - name+pesel: ${results.filter(r => r.matchMethod === "name+pesel").length}`);
  console.log(`  - name ambiguous: ${results.filter(r => r.matchMethod?.startsWith("name_ambiguous")).length}`);
  console.log(`Niezmatchowano: ${unmatched.length}`);
  console.log(`Zmatchowano z UKRYTYM profilem: ${matchedHidden.length} ← KANDYDACI DO ODKRYCIA`);
  console.log(`PESEL z dopełnionym zerem: ${peselPadded.length}\n`);

  // a) Unmatched CSV
  const unmatchedCsv = ["employee_id;user_id;imie;drugie_imie;nazwisko;pesel_raw;pesel_padded;powod"];
  for (const r of unmatched) {
    const reason = !r.pesel ? "brak PESEL, brak matcha po nazwisku" : "PESEL nie istnieje w FDK, nazwisko nie matchuje";
    unmatchedCsv.push(`"${r.employee_id}";"${r.user_id}";"${r.imie}";"${r.drugie_imie}";"${r.nazwisko}";"${r.pesel_raw}";"${r.pesel ?? ""}";"${reason}"`);
  }
  fs.writeFileSync("raport-match-v2-unmatched.csv", unmatchedCsv.join("\n"), "utf-8");
  console.log(`Raport (b): raport-match-v2-unmatched.csv (${unmatched.length} wierszy)`);

  // c) Hidden candidates to unhide
  const hiddenCsv = ["employee_id;imie_csv;nazwisko_csv;pesel_csv;profile_id;imie_fdk;nazwisko_fdk;pesel_fdk;match_method;pesel_note"];
  for (const r of matchedHidden) {
    const p = profiles.find(p => p.id === r.profileId);
    hiddenCsv.push(`"${r.employee_id}";"${r.imie}";"${r.nazwisko}";"${r.pesel_raw}";${r.profileId};"${p?.imie ?? ""}";"${p?.nazwisko ?? ""}";"${p?.pesel ?? ""}";${r.matchMethod};"${r.peselNote}"`);
  }
  fs.writeFileSync("raport-match-v2-hidden-candidates.csv", hiddenCsv.join("\n"), "utf-8");
  console.log(`Raport (c): raport-match-v2-hidden-candidates.csv (${matchedHidden.length} kandydatów do odkrycia)`);

  // PESEL padded report
  if (peselPadded.length > 0) {
    const peselCsv = ["employee_id;imie;nazwisko;pesel_raw;pesel_padded;profile_id"];
    for (const r of peselPadded) {
      peselCsv.push(`"${r.employee_id}";"${r.imie}";"${r.nazwisko}";"${r.pesel_raw}";"${r.pesel}";${r.profileId}`);
    }
    fs.writeFileSync("raport-match-v2-pesel-padded.csv", peselCsv.join("\n"), "utf-8");
    console.log(`Raport PESEL: raport-match-v2-pesel-padded.csv (${peselPadded.length})`);
  }

  console.log("");
  await db.$disconnect();
}

main().catch(console.error);
