/**
 * Report: identify profiles that may be family members (not separate FDK clients).
 *
 * Checks:
 * 1. Profiles created by create-missing-profiles.mjs (source in changelog)
 * 2. Surname pairs (male/female forms): Filatau/Filatava, Voitau/Voitava etc.
 * 3. Multiple people with same surname — children vs separate clients
 * 4. Profiles with no attachments or only family-member attachments
 *
 * Output: CSV with recommendation per profile (keep / convert to family member / verify)
 *
 * Usage:
 *   node scripts/report-family-members.mjs
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const db = new PrismaClient();

// Known surname pairs (male/female Slavic forms)
const SURNAME_PAIRS = [
  ["Filatau", "Filatava"],
  ["Mezentsau", "Mezentsava"],
  ["Voitau", "Voitava"],
  ["Sobolev", "Soboleva"],
  ["Pranchuk", "Andrukhina-Pranchuk"],
];

// Known family groups from create-missing-profiles.mjs
const FAMILY_GROUPS = {
  Skuratovich: { main: "Aliaksei", members: ["Veranika", "Daminik", "Daryian"] },
  Valovich: { main: "Viktar", members: ["MARYIA", "VALIANTSIN", "VIACHASLAU", "VERA"] },
  Abrazhevich: { main: "Kirill", members: ["Arina"] },
  Nossoff: { main: "Alexandra", members: ["Daniel", "Sergei Igorevich"] },
  Malinouskaya: { main: null, members: ["Yaraslava", "Vasilisa"], relative: "Malinovski Pavel" },
  TARASEVICH: { main: "ILYA", members: ["Leu"] },
  USPENSKAYA: { main: null, members: ["NINA"], relative: "Tarasevich Ilya" },
  Jasi: { main: null, members: ["Bright", "Heather", "Bryce Thabiso"] },
};

// Surnames to check for family groupings
const SURNAMES_TO_CHECK = [
  "Abrazhevich", "Jasi", "Kanarska", "Malinouskaya", "Nossoff",
  "Skuratovich", "Tarasevich", "Valovich",
  "Filatau", "Filatava", "Mezentsau", "Mezentsava",
  "Voitau", "Voitava", "Sobolev", "Soboleva",
  "Pranchuk", "Andrukhina-Pranchuk",
  "USPENSKAYA",
];

async function main() {
  const csvLines = [
    "nazwisko;imie;id;wProcesie;hidden;obywatelstwo;attachments;emp_bases;res_bases;source;rekomendacja;grupa_rodzinna;komentarz",
  ];

  console.log("=== RAPORT PROFILI — CZŁONKOWIE RODZINY ===\n");

  // 1. Find all profiles created by create-missing-profiles script
  const autoCreatedLogs = await db.fdkChangeLog.findMany({
    where: {
      field: "profile_created",
      changedBy: "create-missing-profiles",
    },
    select: { foreignerId: true, newValue: true },
  });
  const autoCreatedIds = new Set(autoCreatedLogs.map((l) => l.foreignerId));

  console.log(`Profile utworzone przez create-missing-profiles: ${autoCreatedIds.size}\n`);

  // 2. Get all profiles with matching surnames
  const allProfiles = await db.fdkForeigner.findMany({
    where: {
      nazwisko: { in: SURNAMES_TO_CHECK, mode: "insensitive" },
    },
    include: {
      _count: { select: { attachments: true, employmentBases: true, residenceBases: true } },
    },
    orderBy: [{ nazwisko: "asc" }, { imie: "asc" }],
  });

  // Group by surname
  const bySurname = new Map();
  for (const p of allProfiles) {
    const key = p.nazwisko.toUpperCase();
    const list = bySurname.get(key) ?? [];
    list.push(p);
    bySurname.set(key, list);
  }

  // 3. Analyze each group
  for (const [surname, profiles] of bySurname) {
    console.log(`\n--- ${surname} (${profiles.length} profili) ---`);

    for (const p of profiles) {
      const name = `${p.nazwisko} ${p.imie || ""}`.trim();
      const isAutoCreated = autoCreatedIds.has(p.id);
      const attCount = p._count.attachments;
      const empCount = p._count.employmentBases;
      const resCount = p._count.residenceBases;

      // Determine recommendation
      let recommendation = "ZACHOWAJ";
      let familyGroup = "";
      let comment = "";

      // Check if in known family group
      const familyInfo = FAMILY_GROUPS[p.nazwisko] ?? FAMILY_GROUPS[p.nazwisko.toUpperCase()];
      if (familyInfo) {
        const imieUpper = (p.imie ?? "").toUpperCase();
        const isMain = familyInfo.main && imieUpper === familyInfo.main.toUpperCase();
        const isMember = familyInfo.members.some((m) => m.toUpperCase() === imieUpper);

        if (isMain) {
          recommendation = "ZACHOWAJ — główny profil rodziny";
          familyGroup = `${surname} (główny)`;
        } else if (isMember) {
          recommendation = "DO WERYFIKACJI — możliwy członek rodziny";
          familyGroup = `${surname} (członek rodziny ${familyInfo.main || familyInfo.relative || "?"})`;
          if (isAutoCreated) {
            comment = "Utworzony automatycznie przez skrypt";
          }
          if (attCount === 0) {
            recommendation = "PRZEKSZTAŁĆ — brak załączników, prawdopodobnie członek rodziny";
            comment += " | Brak własnych załączników";
          }
        }
      }

      // Check surname pairs (male/female)
      for (const [male, female] of SURNAME_PAIRS) {
        if (p.nazwisko.toUpperCase() === female.toUpperCase()) {
          // Female form — check if male form exists
          const maleProfiles = bySurname.get(male.toUpperCase());
          if (maleProfiles && maleProfiles.length > 0) {
            familyGroup = `para: ${male}/${female}`;
            if (!recommendation.includes("WERYFIKACJI")) {
              recommendation = "DO WERYFIKACJI — możliwy małżonek/ka";
              comment = `Sprawdź relację z ${male} ${maleProfiles[0].imie || ""}`;
            }
          }
        }
      }

      // Auto-created without own employment bases → likely family member
      if (isAutoCreated && empCount <= 1 && resCount <= 1) {
        if (!recommendation.includes("PRZEKSZTAŁĆ")) {
          recommendation = "DO WERYFIKACJI — utworzony automatycznie, mało danych";
        }
      }

      const source = isAutoCreated ? "create-missing-profiles" : "ręczny/import";

      console.log(
        `  ${name} (ID ${p.id}) | att=${attCount} emp=${empCount} res=${resCount}` +
        ` | ${source} | ${recommendation}`
      );

      csvLines.push(
        [surname, p.imie || "", p.id, p.wProcesie, p.hidden, p.obywatelstwo || "",
          attCount, empCount, resCount, source, recommendation, familyGroup, comment]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(";")
      );
    }
  }

  // 4. Also check for shared attachments between surname groups
  console.log("\n\n=== ZAŁĄCZNIKI WSPÓLNE MIĘDZY PROFILAMI RODZINNYMI ===\n");

  for (const [surname, profiles] of bySurname) {
    if (profiles.length < 2) continue;
    const ids = profiles.map((p) => p.id);

    // Find attachments in these profiles that have the same filename
    const sharedAtts = await db.$queryRaw`
      SELECT a1."foreigner_id" as id1, a2."foreigner_id" as id2, a1."nazwa_pliku" as plik
      FROM fdk_attachments a1
      JOIN fdk_attachments a2 ON a1."nazwa_pliku" = a2."nazwa_pliku" AND a1."foreigner_id" < a2."foreigner_id"
      WHERE a1."foreigner_id" = ANY(${ids}::int[]) AND a2."foreigner_id" = ANY(${ids}::int[])
      LIMIT 20
    `;

    if (sharedAtts.length > 0) {
      console.log(`  ${surname}: ${sharedAtts.length} wspólnych plików`);
      for (const s of sharedAtts.slice(0, 5)) {
        const p1 = profiles.find((p) => p.id === s.id1);
        const p2 = profiles.find((p) => p.id === s.id2);
        console.log(`    ${p1?.imie || "?"} ↔ ${p2?.imie || "?"}: ${s.plik}`);
      }
    }
  }

  // Write CSV
  const filename = "raport-family-members.csv";
  writeFileSync(filename, "\uFEFF" + csvLines.join("\n") + "\n");
  console.log(`\nRaport zapisany: ${filename}`);
}

main().catch(console.error).finally(() => db.$disconnect());
