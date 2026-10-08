/**
 * Mark 114 people from the TRC list as "wProcesie = true".
 *
 * Usage:
 *   node scripts/mark-w-procesie.mjs           # dry-run
 *   node scripts/mark-w-procesie.mjs --apply    # apply
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// Manual ID overrides (same as classify-folders.mjs)
const MANUAL_ID_MAP = {
  "Chelsea|Marange": 262,
  "Jajula|Konaye Polelo": 186,
  "Ndigwirei|Nyasha": 45,
  "Oriaku|Victor": 48,
  "Rice|Lydia": 39,
  "Liudvichenka|Anatolii": 116,
  "Du Toit|Johanna Magdalena": 198,
  "Kanarska|Anastasia": null, // same as Anastasiya (ID 232)
  "Van Reenen|Christian Albert": null, // same as van Reenen Christian (ID 326)
  "Yegorova|VIctoria": 1080,
  "De-Tchambila|Claude Christ": 490,
  "Hashimoto|Keiko": 663,
  "Hauser|Emiliee Faith": 590,
  "Kleshchanka|Viktar": 674,
  "Isik|Burak": 174,
};

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

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const matchedIds = new Set();
  const notFound = [];

  for (const [nazwisko, imie] of PEOPLE) {
    const key = `${nazwisko.trim()}|${imie.trim()}`;
    const manualId = MANUAL_ID_MAP[key];

    if (manualId === null) continue; // skip duplicates

    let match = null;
    if (manualId !== undefined) {
      match = await db.fdkForeigner.findUnique({ where: { id: manualId }, select: { id: true, nazwisko: true, imie: true } });
    } else {
      match = await db.fdkForeigner.findFirst({
        where: {
          nazwisko: { equals: nazwisko.trim(), mode: "insensitive" },
          imie: { equals: imie.trim(), mode: "insensitive" },
        },
        select: { id: true, nazwisko: true, imie: true },
      });
    }

    if (match) {
      matchedIds.add(match.id);
    } else {
      notFound.push(`${nazwisko} ${imie}`);
    }
  }

  console.log(`Znaleziono: ${matchedIds.size} osób`);
  if (notFound.length > 0) {
    console.log(`Nie znaleziono (${notFound.length}): ${notFound.join(", ")}`);
  }

  if (APPLY) {
    // First reset all to false
    await db.fdkForeigner.updateMany({ data: { wProcesie: false } });

    // Then set matched to true
    await db.fdkForeigner.updateMany({
      where: { id: { in: [...matchedIds] } },
      data: { wProcesie: true },
    });

    console.log(`\nUstawiono wProcesie=true dla ${matchedIds.size} osób.`);
  } else {
    console.log(`\n[DRY-RUN] Osoby do oznaczenia: ${[...matchedIds].join(", ")}`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
