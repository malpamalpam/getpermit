/**
 * Classify existing FDK attachments into folders (wazne / inne_dokumenty / dokumenty_rodziny).
 * Also verifies scraping: 0-byte files, duplicates, missing attachments.
 *
 * Usage:
 *   node scripts/classify-folders.mjs                  # dry-run (all 114 people)
 *   node scripts/classify-folders.mjs --apply           # apply changes
 *   node scripts/classify-folders.mjs --limit 5         # dry-run for first 5 people
 *   node scripts/classify-folders.mjs --apply --limit 5 # apply for first 5 people
 */
import { PrismaClient } from "@prisma/client";
import { createWriteStream } from "fs";

const db = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;

// === FOLDER CLASSIFICATION (mirrors src/lib/folder-classifier.ts) ===

const WAZNE_TYPES = new Set([
  "ZEZWOLENIE_A", "TRC_FDK", "TRC_STUDIA", "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL",
  "TRC_HUMANITARNE", "TRC_ABSOLWENT", "TRC_BLUE_CARD", "TRC_DZIALALNOSC",
  "KARTA_POBYTU", "POBYT_CUKR", "OSWIADCZENIE", "POWIADOMIENIE_UA", "ZGLOSZENIE_UA",
  "WIZA", "OD_POBYT_STALY", "OD_REZYDENT_UE", "OD_MALZONEK_PL", "OD_CZLONEK_RODZINY",
  "OD_BLUE_CARD", "OD_HUMANITARNE", "OD_OCHRONA_UZUP", "OD_STUDENT", "OD_UE",
  "OD_UK_WYSTAPIENIE", "ODWOLANIE",
]);

const WAZNE_FILENAME_PATTERNS = [
  /paszport/i, /passport/i, /паспорт/i,
  /dyplom/i, /diploma/i, /диплом/i,
  /decyzj[aiy]/i, /decision/i, /решение/i,
  /karta[\s_-]*pobytu/i, /residence[\s_-]*card/i,
  /zezwoleni[ea][\s_-]*na[\s_-]*prac/i, /work[\s_-]*permit/i,
  /o[śs]wiadczeni[ea]/i, /declaration/i,
  /rezydent/i, /long[\s_-]*term/i,
  /wiza/i, /visa/i, /виза/i,
  /odwo[łl]anie/i, /za[żz]alenie/i,
  /\bTRC\b/i, /\bWP[\s_-]?\d{4}/i, /\bKP[\s_-]?skan/i, /\bPSZ[\s_-]?OP/i,
  /powiadomienie[\s_-]*ua/i, /zg[łl]oszenie[\s_-]*ua/i,
];

function classifyToFolder(detectedType, isDifferentPerson, filename) {
  if (isDifferentPerson) return "dokumenty_rodziny";
  if (detectedType && WAZNE_TYPES.has(detectedType)) return "wazne";
  for (const p of WAZNE_FILENAME_PATTERNS) {
    if (p.test(filename.toLowerCase())) return "wazne";
  }
  return "inne_dokumenty";
}

function isDifferentPersonFromOpis(opis) {
  if (!opis) return false;
  return opis.startsWith("\u26a0") && /inn(?:ej|a)\s+osob/i.test(opis);
}

// === LIST OF 114 PEOPLE ===

const PEOPLE = [
  ["Abrazhevich", "Kirill"], ["Abrazhevich", "Arina"], ["Afrasiyabov", "Fakhri"],
  ["AKHUNDOV", "Kamran"], ["Aksinovich", "Natallia"], ["Aksiutsin", "Yauhen"],
  ["Andrukhina-Pranchuk", "Yelizaveta"], ["Anikanov", "Mikhail"], ["BAHAMOLAU", "ALIAKSEI"],
  ["Bandarenka", "Tamara"], ["Chelsea", "Marange"], ["Chyhir", "Mikhail"],
  ["Daniels", "Florence Kuwani"], ["Denysiuk", "Anna"], ["De-Tchambila", "Claude Christ"],
  ["Dmytriiev", "Yevgen"], ["Du Toit", "Johanna Magdalena"], ["Egorova", "Anastasiia"],
  ["Fedarynchyk", "Yelisei"], ["FILATAU", "ALEH"], ["Filatava", "Hanna"],
  ["Gaidukova", "Alina"], ["Garny", "Alexey"], ["Gorjizadeh", "Masoud"],
  ["Habyshava", "Katsiaryna"], ["Hashimoto", "Keiko"], ["Hauser", "Emiliee Faith"],
  ["Isik", "Burak"], ["Jajula", "Konaye Polelo"], ["Jasi", "Bright"],
  ["Jasi", "Heather"], ["Jasi", "Bryce Thabiso"], ["Kanarska", "Anastasiya"],
  ["Kanarska", "Anastasia"], ["Karamov", "Oleg"], ["Kazmina", "Margarita"],
  ["Kholov", "Viktor"], ["Khoo", "Danny Eu Huat"], ["Kiba", "Olga"],
  ["KIRFF", "BOHDAN"], ["Kleshchanka", "Viktar"], ["Kryshtal", "Vladyslav"],
  ["Kuryts", "Krystsina"], ["Kuzyk", "Denys"], ["Lapeko", "Alesia"],
  ["Lipatova", "Elena"], ["Liubchak", "Anastasiia"], ["Liudvichenka", "Anatolii"],
  ["Lomats", "Ilya"], ["Malinouskaya", "Yaraslava"], ["Malinouskaya", "Vasilisa"],
  ["Malinovski", "Pavel"], ["Maltsev", "Konstantin"], ["Mayorau", "Mikita"],
  ["Medved", "Vladislav"], ["Meniukov", "Aleksandr"], ["Mezentsau", "Ihar"],
  ["Mezentsava", "Rose"], ["Mikulec", "Tyler"], ["Mitsura", "Ivan"],
  ["MKHIZE", "WANDILE NJABULO"], ["Mkhwanazi", "Gugulethu Khethiwe"],
  ["Morozov", "Anton"], ["Naskar", "Tanmay"], ["Nazaraliev", "Beksultan"],
  ["Ndigwirei", "Nyasha"], ["Nossoff", "Daniel"], ["Nossoff", "Sergei Igorevich"],
  ["Nossoff", "Alexandra"], ["Novik", "Yuliya"], ["Olshanskaia", "Anastasiia"],
  ["Oriaku", "Victor"], ["Pankevich", "Siarhei"], ["Pranchuk", "Dzmitry"],
  ["Regan", "Joseph Saul"], ["Rice", "Lydia"], ["Sarokina", "Katsiaryna"],
  ["Serova", "Tatiana"], ["Shabanov", "Vladislav"], ["Sheremet", "Taisiia"],
  ["Siamenchyk", "Yauheniya"], ["Sidarenka", "Marharyta"],
  ["Skuratovich", "Aliaksei"], ["Skuratovich", "Veranika"],
  ["Skuratovich", "Daminik"], ["Skuratovich", "Daryian"],
  ["Sobolev", "Valentin"], ["Soboleva", "Yelena"], ["Sytau", "Pavel"],
  ["TARASEVICH", "ILYA"], ["TARASEVICH", "Leu"], ["Tsudzin", "Ihar"],
  ["USPENSKAYA", "NINA"], ["Valovich", "Viktar"], ["Valovich", "MARYIA"],
  ["Valovich", "VALIANTSIN"], ["Valovich", "VIACHASLAU"], ["Valovich", "VERA"],
  ["Van Reenen", "Christian Albert"], ["van Reenen", "Christian"],
  ["Vasina", "Irina"], ["Voitau", "Andrei"], ["Voitava", "Valeryia"],
  ["VOLOSHCHENKO", "OLEKSANDR"], ["Vorobei", "Volodymyr"], ["Vouna", "Volha"],
  ["Weigman", "Christian Frederick"], ["YAREMCHANKA", "ALEXANDRA"],
  ["Yegorova", "VIctoria"], ["Zaiko", "Maryia"], ["Zarowska", "Sofia"],
  ["Zholubov", "Vladyslav"], ["Zhukava", "Liliya"], ["Zviregei", "Fortune"],
];

// Manual overrides: person from list → known DB ID
// For cases where name doesn't match exactly (swapped, typo, hidden, extra middle name)
const MANUAL_ID_MAP = {
  "Chelsea|Marange": 262,
  "Jajula|Konaye Polelo": 186,
  "Ndigwirei|Nyasha": 45,
  "Oriaku|Victor": 48,
  "Rice|Lydia": 39,
  "Liudvichenka|Anatolii": 116,
  "Du Toit|Johanna Magdalena": 198,
  "Kanarska|Anastasia": null, // same as Anastasiya (ID 232) — skip duplicate
  "Van Reenen|Christian Albert": null, // same as van Reenen Christian (ID 326) — skip duplicate
  "Yegorova|VIctoria": 1080,
  "De-Tchambila|Claude Christ": 490,
  "Hashimoto|Keiko": 663,
  "Hauser|Emiliee Faith": 590,
  "Kleshchanka|Viktar": 674,
  "Isik|Burak": 174,
};

// === MAIN ===

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  if (LIMIT) console.log(`Limit: ${LIMIT} people`);
  console.log();

  const csvLines = [
    "nazwisko;imie;id_getpermit;liczba_wazne;liczba_inne;liczba_rodzina;braki_scrapingu;do_weryfikacji;uwagi",
  ];

  let processed = 0;
  const notFound = [];
  const duplicateCandidates = [];

  const peopleToProcess = LIMIT ? PEOPLE.slice(0, LIMIT) : PEOPLE;

  for (const [nazwisko, imie] of peopleToProcess) {
    // Case-insensitive, trim search
    const nazwiskoTrim = nazwisko.trim();
    const imieTrim = imie.trim();

    // Check manual overrides first
    const manualKey = `${nazwiskoTrim}|${imieTrim}`;
    const manualId = MANUAL_ID_MAP[manualKey];
    if (manualId === null) {
      // Explicitly skipped (duplicate of another entry)
      console.log(`[SKIP] ${nazwiskoTrim} ${imieTrim} — duplikat innego wpisu z listy`);
      csvLines.push(`${nazwiskoTrim};${imieTrim};;;;;;Duplikat — pominięto`);
      continue;
    }

    let matches;
    if (manualId !== undefined) {
      // Use manual ID override
      const f = await db.fdkForeigner.findUnique({
        where: { id: manualId },
        include: { attachments: true, employmentBases: true },
      });
      matches = f ? [f] : [];
      if (f) console.log(`[MANUAL] ${nazwiskoTrim} ${imieTrim} → ${f.imie} ${f.nazwisko} (ID ${f.id})`);
    } else {
      matches = await db.fdkForeigner.findMany({
        where: {
          nazwisko: { equals: nazwiskoTrim, mode: "insensitive" },
          imie: { equals: imieTrim, mode: "insensitive" },
        },
        include: {
          attachments: true,
          employmentBases: true,
        },
      });
    }

    if (matches.length === 0) {
      // Fuzzy search: try surname only
      const surnameMatches = await db.fdkForeigner.findMany({
        where: { nazwisko: { equals: nazwiskoTrim, mode: "insensitive" } },
        select: { id: true, nazwisko: true, imie: true, hidden: true },
      });
      // Also try first name only (for swapped name/surname cases like "Chelsea Marange")
      const firstNameAsSurname = await db.fdkForeigner.findMany({
        where: { nazwisko: { equals: imieTrim, mode: "insensitive" } },
        select: { id: true, nazwisko: true, imie: true, hidden: true },
      });
      const candidates = [...surnameMatches, ...firstNameAsSurname]
        .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i); // dedup

      if (candidates.length > 0) {
        const candStr = candidates.map((c) => `${c.imie ?? ""} ${c.nazwisko} (ID ${c.id}${c.hidden ? ", HIDDEN" : ""})`).join("; ");
        console.log(`[NOT FOUND] ${nazwiskoTrim} ${imieTrim} — KANDYDACI: ${candStr}`);
        notFound.push(`${nazwiskoTrim} ${imieTrim} [kandydaci: ${candStr}]`);
        csvLines.push(`${nazwiskoTrim};${imieTrim};;;;;;Nie znaleziono (kandydaci: ${candStr.replace(/;/g, ",")})`);
      } else {
        console.log(`[NOT FOUND] ${nazwiskoTrim} ${imieTrim} — brak kandydatów`);
        notFound.push(`${nazwiskoTrim} ${imieTrim}`);
        csvLines.push(`${nazwiskoTrim};${imieTrim};;;;;;Nie znaleziono w GetPermit`);
      }
      continue;
    }

    if (matches.length > 1) {
      duplicateCandidates.push({
        name: `${nazwiskoTrim} ${imieTrim}`,
        ids: matches.map((m) => m.id),
      });
    }

    for (const foreigner of matches) {
      processed++;
      const issues = [];
      const toVerify = [];
      let countWazne = 0, countInne = 0, countRodzina = 0;

      // Build map: attachment id → employment base type (from sourceAttachmentId)
      const attachTypMap = new Map();
      for (const base of foreigner.employmentBases) {
        if (base.sourceAttachmentId) {
          attachTypMap.set(base.sourceAttachmentId, base.typ);
        }
      }

      // Check for scraping issues
      const zeroByteFiles = foreigner.attachments.filter((a) => a.rozmiarBytes !== null && BigInt(a.rozmiarBytes) === 0n);
      if (zeroByteFiles.length > 0) {
        issues.push(`${zeroByteFiles.length} plik(i) 0 bajtów: ${zeroByteFiles.map((a) => a.nazwaPliku).join(", ")}`);
      }

      // Check for duplicate filenames
      const filenameCounts = {};
      for (const a of foreigner.attachments) {
        filenameCounts[a.nazwaPliku] = (filenameCounts[a.nazwaPliku] || 0) + 1;
      }
      const dupeFiles = Object.entries(filenameCounts).filter(([, c]) => c > 1);
      if (dupeFiles.length > 0) {
        issues.push(`Duplikaty: ${dupeFiles.map(([n, c]) => `${n} (x${c})`).join(", ")}`);
      }

      // Check for employment bases without source attachment
      const orphanBases = foreigner.employmentBases.filter((b) => !b.sourceAttachmentId);
      if (orphanBases.length > 0) {
        issues.push(`${orphanBases.length} podstaw bez przypisanego załącznika`);
      }

      // Classify each attachment
      for (const att of foreigner.attachments) {
        const isDiffPerson = isDifferentPersonFromOpis(att.opis);

        // Determine detectedType: from linked employment base, or from existing detectedType field
        let detectedType = att.detectedType ?? null;
        if (!detectedType && attachTypMap.has(att.id)) {
          detectedType = attachTypMap.get(att.id);
        }

        const folder = classifyToFolder(detectedType, isDiffPerson, att.nazwaPliku);

        if (folder === "wazne") countWazne++;
        else if (folder === "dokumenty_rodziny") countRodzina++;
        else countInne++;

        // Flag uncertain classification
        if (!detectedType && folder === "inne_dokumenty") {
          toVerify.push(att.nazwaPliku);
        }

        if (APPLY) {
          // Only update if folder not manually set
          if (!att.folderManual) {
            const updateData = { folder };
            // Persist detectedType from employment base if we found one
            if (detectedType && !att.detectedType) {
              updateData.detectedType = detectedType;
            }
            if (att.folder !== folder || (detectedType && !att.detectedType)) {
              await db.fdkAttachment.update({
                where: { id: att.id },
                data: updateData,
              });
            }
          }
        }
      }

      const issuesStr = issues.join(" | ").replace(/;/g, ",");
      const verifyStr = toVerify.length > 0
        ? `${toVerify.length} dok.: ${toVerify.slice(0, 3).join(", ")}${toVerify.length > 3 ? "..." : ""}`
        : "";

      console.log(
        `[${APPLY ? "APPLIED" : "DRY-RUN"}] ${foreigner.nazwisko} ${foreigner.imie} (ID ${foreigner.id}): ` +
        `W=${countWazne} I=${countInne} R=${countRodzina} att=${foreigner.attachments.length}` +
        (issues.length > 0 ? ` | ISSUES: ${issuesStr}` : "") +
        (toVerify.length > 0 ? ` | VERIFY: ${toVerify.length}` : "")
      );

      csvLines.push(
        `${foreigner.nazwisko};${foreigner.imie};${foreigner.id};${countWazne};${countInne};${countRodzina};${issuesStr};${verifyStr};`
      );
    }
  }

  // Write CSV report
  const filename = APPLY ? "raport-foldery-applied.csv" : "raport-foldery-dry.csv";
  const csvContent = csvLines.join("\n") + "\n";
  const ws = createWriteStream(filename);
  ws.write("\uFEFF"); // BOM for Excel
  ws.write(csvContent);
  ws.end();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Przetworzono: ${processed} osób`);
  if (notFound.length > 0) {
    console.log(`Nie znaleziono (${notFound.length}): ${notFound.join(", ")}`);
  }
  if (duplicateCandidates.length > 0) {
    console.log(`\nMożliwe duplikaty/warianty:`);
    for (const d of duplicateCandidates) {
      console.log(`  ${d.name} → ID: ${d.ids.join(", ")}`);
    }
  }
  console.log(`\nRaport zapisany: ${filename}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
