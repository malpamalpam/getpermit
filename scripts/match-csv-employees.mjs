/**
 * Match CSV active_employees (1147 rows) against FDK profiles.
 * Reports: matched, unmatched, match criteria, PESEL issues.
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

function normalizeName(s) {
  return (s ?? "").trim().toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

async function main() {
  // Read CSV
  const csvPath = "aktywni_bez_profilu.csv";
  if (!fs.existsSync(csvPath)) {
    console.error("Brak pliku aktywni_bez_profilu.csv");
    process.exit(1);
  }
  const lines = fs.readFileSync(csvPath, "utf-8").split(/\r?\n/).filter(l => l.trim());
  const header = parseCsvLine(lines[0]);
  console.log(`CSV header: ${header.join(" | ")}`);
  console.log(`CSV rows: ${lines.length - 1}\n`);

  const csvRows = lines.slice(1).map(l => {
    const f = parseCsvLine(l);
    return {
      employee_id: f[0],
      user_id: f[1],
      imie: f[2]?.trim(),
      drugie_imie: f[3]?.trim(),
      nazwisko: f[4]?.trim(),
      pesel: f[5]?.trim(),
    };
  });

  // Load all FDK profiles
  const profiles = await db.fdkForeigner.findMany({
    select: { id: true, nazwisko: true, imie: true, pesel: true, hidden: true, employeeId: true, externalUserId: true },
  });

  // Build lookup maps
  const byPesel = new Map();
  const byName = new Map();
  const byEmployeeId = new Map();

  for (const p of profiles) {
    if (p.pesel) byPesel.set(p.pesel.trim(), p);
    // Also try PESEL with leading zero stripped (common issue)
    if (p.pesel && p.pesel.startsWith("0")) byPesel.set(p.pesel.slice(1), p);

    const nameKey = `${normalizeName(p.imie)}|${normalizeName(p.nazwisko)}`;
    if (!byName.has(nameKey)) byName.set(nameKey, []);
    byName.get(nameKey).push(p);

    if (p.employeeId) byEmployeeId.set(p.employeeId, p);
  }

  let matched = 0;
  let matchedByPesel = 0;
  let matchedByName = 0;
  let matchedByEmployeeId = 0;
  let unmatched = 0;
  const unmatchedRows = [];
  const matchedHidden = [];
  const peselIssues = [];

  for (const row of csvRows) {
    let profile = null;
    let matchMethod = "";

    // Try 1: employee_id
    if (row.employee_id && byEmployeeId.has(row.employee_id)) {
      profile = byEmployeeId.get(row.employee_id);
      matchMethod = "employee_id";
      matchedByEmployeeId++;
    }

    // Try 2: PESEL exact
    if (!profile && row.pesel) {
      if (byPesel.has(row.pesel)) {
        profile = byPesel.get(row.pesel);
        matchMethod = "pesel";
        matchedByPesel++;
      }
      // Try with leading zero added (PESEL truncated to 10 digits)
      else if (row.pesel.length === 10 && byPesel.has("0" + row.pesel)) {
        profile = byPesel.get("0" + row.pesel);
        matchMethod = "pesel_leading_zero";
        matchedByPesel++;
        peselIssues.push(`${row.imie} ${row.nazwisko}: CSV pesel="${row.pesel}" → FDK pesel="0${row.pesel}" (ucięte zero)`);
      }
    }

    // Try 3: imię + nazwisko
    if (!profile) {
      const nameKey = `${normalizeName(row.imie)}|${normalizeName(row.nazwisko)}`;
      const candidates = byName.get(nameKey);
      if (candidates && candidates.length === 1) {
        profile = candidates[0];
        matchMethod = "name_exact";
        matchedByName++;
      } else if (candidates && candidates.length > 1) {
        // Multiple matches — try narrowing by PESEL
        const byPeselMatch = candidates.find(c => c.pesel === row.pesel);
        if (byPeselMatch) {
          profile = byPeselMatch;
          matchMethod = "name+pesel";
          matchedByName++;
        }
      }
    }

    if (profile) {
      matched++;
      if (profile.hidden) {
        matchedHidden.push({ ...row, profileId: profile.id, hidden: true, matchMethod });
      }
    } else {
      unmatched++;
      unmatchedRows.push(row);
    }
  }

  // Reports
  console.log(`=== MATCHING RESULTS ===\n`);
  console.log(`CSV rows: ${csvRows.length}`);
  console.log(`Matched: ${matched} (employee_id: ${matchedByEmployeeId}, pesel: ${matchedByPesel}, name: ${matchedByName})`);
  console.log(`Unmatched: ${unmatched}`);
  console.log(`Matched but hidden: ${matchedHidden.length}`);
  console.log(`PESEL issues (ucięte zero): ${peselIssues.length}\n`);

  if (peselIssues.length > 0) {
    console.log("--- PESEL z uciętym zerem ---");
    for (const issue of peselIssues.slice(0, 20)) console.log(`  ${issue}`);
    if (peselIssues.length > 20) console.log(`  ... (${peselIssues.length - 20} więcej)`);
    console.log("");
  }

  // Write unmatched CSV
  const unmatchedCsv = ["employee_id;user_id;imie;drugie_imie;nazwisko;pesel"];
  for (const r of unmatchedRows) {
    unmatchedCsv.push(`"${r.employee_id}";"${r.user_id}";"${r.imie}";"${r.drugie_imie}";"${r.nazwisko}";"${r.pesel}"`);
  }
  fs.writeFileSync("raport-unmatched-csv.csv", unmatchedCsv.join("\n"), "utf-8");
  console.log(`Raport niezmatchowanych: raport-unmatched-csv.csv (${unmatchedRows.length} wierszy)\n`);

  // Write PESEL issues
  if (peselIssues.length > 0) {
    fs.writeFileSync("raport-pesel-issues.csv", peselIssues.join("\n"), "utf-8");
    console.log(`Raport PESEL: raport-pesel-issues.csv\n`);
  }

  // Write hidden matched
  const hiddenCsv = ["employee_id;imie;nazwisko;pesel;profile_id;hidden;match_method"];
  for (const r of matchedHidden) {
    hiddenCsv.push(`"${r.employee_id}";"${r.imie}";"${r.nazwisko}";"${r.pesel}";${r.profileId};${r.hidden};${r.matchMethod}`);
  }
  fs.writeFileSync("raport-matched-hidden.csv", hiddenCsv.join("\n"), "utf-8");
  console.log(`Zmatchowani ukryci: raport-matched-hidden.csv (${matchedHidden.length})\n`);

  await db.$disconnect();
}

main().catch(console.error);
