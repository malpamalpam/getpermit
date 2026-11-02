/**
 * Analiza plików dyplomowych w kartotekach.
 * Sprawdza nazwy plików pod kątem polskich uczelni/szkół.
 *
 * node scripts/analyze-diplomas.mjs
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// Keywords suggesting Polish institution in filename
const POLISH_INDICATORS = [
  /uniwersytet/i, /politechnika/i, /akademia/i,
  /szko[lł]a\s*(wy[zż]sz|policealna|g[lł][oó]wn)/i,
  /collegium/i, /WSB/i, /SGH/i, /AGH/i, /UW\b/i, /UJ\b/i,
  /PW\b/i, /WAT\b/i, /SGGW/i, /SWPS/i,
  /uczelnia/i, /instytut/i,
  /kozminski/i, /lazarski/i, /vistula/i,
  /merito/i, /wy[zż]sz/i,
];

// Keywords suggesting foreign diploma / translation
const FOREIGN_INDICATORS = [
  /t[lł]umaczeni/i, /translat/i, /nostryfikacj/i,
  /apostill/i, /legali[sz]acj/i,
  /university/i, /college/i, /bachelor/i, /master/i,
  /_tl\b/i, /_EN\b/i, /_RU\b/i,
];

async function main() {
  const diplomas = await db.fdkAttachment.findMany({
    where: {
      OR: [
        { nazwaPliku: { contains: "dyplom", mode: "insensitive" } },
        { nazwaPliku: { contains: "diploma", mode: "insensitive" } },
      ],
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true, obywatelstwo: true } },
    },
    orderBy: { foreignerId: "asc" },
  });

  console.log(`=== ANALIZA DYPLOMÓW ===`);
  console.log(`Łącznie plików: ${diplomas.length}\n`);

  const categories = {
    polskie: [],      // Name suggests Polish institution
    zagraniczne: [],  // Name suggests foreign/translation
    niejasne: [],     // Need OCR to determine
  };

  // Check if person already has DOSTEP-type base
  const existingAccess = await db.fdkEmploymentBase.findMany({
    where: {
      typ: {
        in: [
          "DOSTEP_UE", "DOSTEP_STUDENT", "DOSTEP_POBYT_STALY",
          "DOSTEP_REZYDENT_UE", "DOSTEP_KARTA_POLAKA",
          "DOSTEP_OCHRONA_MIEDZ", "DOSTEP_DYPLOM_PL",
        ],
      },
    },
    select: { foreignerId: true, typ: true },
  });
  const accessByPerson = new Map();
  for (const ea of existingAccess) {
    if (!accessByPerson.has(ea.foreignerId)) accessByPerson.set(ea.foreignerId, []);
    accessByPerson.get(ea.foreignerId).push(ea.typ);
  }

  for (const d of diplomas) {
    const name = d.nazwaPliku;
    const isPolish = POLISH_INDICATORS.some((p) => p.test(name));
    const isForeign = FOREIGN_INDICATORS.some((p) => p.test(name));

    const entry = {
      attachmentId: d.id,
      foreignerId: d.foreigner.id,
      person: `${d.foreigner.imie} ${d.foreigner.nazwisko}`,
      citizenship: d.foreigner.obywatelstwo,
      fileName: name,
      typPliku: d.typPliku,
      existingAccess: accessByPerson.get(d.foreigner.id) ?? [],
    };

    if (isForeign && !isPolish) {
      categories.zagraniczne.push(entry);
    } else if (isPolish) {
      categories.polskie.push(entry);
    } else {
      categories.niejasne.push(entry);
    }
  }

  // Unique persons
  const polishPersons = [...new Set(categories.polskie.map((e) => e.foreignerId))];
  const niejasnePersons = [...new Set(categories.niejasne.map((e) => e.foreignerId))];
  const zagranPersons = [...new Set(categories.zagraniczne.map((e) => e.foreignerId))];

  console.log(`--- POLSKIE UCZELNIE/SZKOŁY (z nazwy pliku) ---`);
  console.log(`Plików: ${categories.polskie.length}, osób: ${polishPersons.length}`);
  for (const e of categories.polskie) {
    console.log(`  id=${e.foreignerId} ${e.person} [${e.citizenship}]: ${e.fileName} ${e.existingAccess.length ? `(ma: ${e.existingAccess.join(", ")})` : ""}`);
  }

  console.log(`\n--- ZAGRANICZNE / TŁUMACZENIA ---`);
  console.log(`Plików: ${categories.zagraniczne.length}, osób: ${zagranPersons.length}`);
  for (const e of categories.zagraniczne.slice(0, 20)) {
    console.log(`  id=${e.foreignerId} ${e.person}: ${e.fileName}`);
  }
  if (categories.zagraniczne.length > 20) console.log(`  ... i ${categories.zagraniczne.length - 20} więcej`);

  console.log(`\n--- NIEJASNE (potrzebny OCR lub ręczna weryfikacja) ---`);
  console.log(`Plików: ${categories.niejasne.length}, osób: ${niejasnePersons.length}`);
  for (const e of categories.niejasne.slice(0, 30)) {
    console.log(`  id=${e.foreignerId} ${e.person} [${e.citizenship}]: ${e.fileName} (${e.typPliku})`);
  }
  if (categories.niejasne.length > 30) console.log(`  ... i ${categories.niejasne.length - 30} więcej`);

  // OCR cost estimate for unclear ones
  const ocrNeeded = categories.niejasne.filter((e) => e.typPliku !== "pdf");
  const pdfTextNeeded = categories.niejasne.filter((e) => e.typPliku === "pdf");
  console.log(`\n--- PLAN KOSZTU ---`);
  console.log(`PDF do sprawdzenia tekstem (darmowe): ${pdfTextNeeded.length}`);
  console.log(`Obrazy do OCR: ${ocrNeeded.length}`);
  console.log(`Szacunkowy koszt OCR: $${(ocrNeeded.length * 0.05).toFixed(2)} — $${(ocrNeeded.length * 0.10).toFixed(2)}`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
