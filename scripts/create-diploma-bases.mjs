/**
 * 1. Utwórz podstawy DOSTEP_DYPLOM_PL dla pewnych absolwentów polskich uczelni/szkół.
 * 2. Przeskanuj 342 niejasne PDF-y tekstem (darmowo) i wyłów polskie uczelnie.
 *
 * node scripts/create-diploma-bases.mjs          # dry run
 * node scripts/create-diploma-bases.mjs --apply  # apply
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const db = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const DO_APPLY = process.argv.includes("--apply");
const BUCKET = "fdk-attachments";

// ========== STEP 1: Pewne polskie dyplomy ==========

const CERTAIN_DIPLOMAS = [
  { foreignerId: 191, label: "Akademia Nauk Stosowanych W. Pola w Lublinie", fileName: "Ndlovu_Jasi_Heather_Nomazulu_dyplom.pdf" },
  { foreignerId: 262, label: "absolwent polskiej uczelni", fileName: "Chelsea Marange - dyplom PL-Kopiuj(1).pdf" },
  { foreignerId: 309, label: "absolwent szkoły policealnej", fileName: "Dyplom zawodowy szkoła policealna Elvira Koroleva.pdf" },
  { foreignerId: 647, label: "Uniwersytet Marii Curie-Skłodowskiej w Lublinie", fileName: "Kanavaliuk_Anastasiya_dyplom.pdf" },
  { foreignerId: 780, label: "Akademia Ekonomiczno-Humanistyczna w Warszawie", fileName: "Matildah Nampasa_dyplom.pdf" },
  { foreignerId: 914, label: "absolwent polskiej uczelni", fileName: "dyplom - wyższe Ruth.pdf" },
  // 244 Petrilovska — already has DOSTEP_UE, skip
];

// ========== STEP 2: Polish institution detection in PDF text ==========

const POLISH_UNI_PATTERNS = [
  /uniwersytet/i, /politechnika/i, /akademia/i,
  /szko[łl]a\s*(wy[żz]sz|policealna|g[łl][óo]wn)/i,
  /collegium/i, /uczelnia/i,
  // Specific Polish universities
  /warszawsk/i, /jagiello/i, /wroc[łl]awsk/i, /gda[ńn]sk/i,
  /pozna[ńn]sk/i, /lubelsk/i, /l[óo]dzk/i, /krakow/i,
  /kozminski|ko[źz]mi[ńn]sk/i, /lazarski|[łl]azarsk/i,
  /vistula/i, /merito/i,
  /WSB|SGH|AGH|SGGW|SWPS|WAT\b/i,
  /wy[żz]sz[aąey]\s+szko[łl]/i,
  /Rzeczpospolit\w+\s+Polsk/i, // "Rzeczpospolita Polska" on diploma
  /Minister\s+(?:Nauki|Edukacji|Szkolnictwa)/i,
  /dyplom\s+uko[ńn]czenia\s+studi[óo]w/i,
  /dyplom\s+zawodowy/i,
  /technik\w+\s+informatyk|technik\w+\s+ekonomist/i,
];

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DRY RUN"}\n`);

  // ========== STEP 1 ==========
  console.log("=== KROK 1: Pewne polskie dyplomy ===\n");

  for (const cert of CERTAIN_DIPLOMAS) {
    // Check if already has DOSTEP_DYPLOM_PL
    const existing = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: cert.foreignerId, typ: "DOSTEP_DYPLOM_PL" },
    });
    if (existing) {
      console.log(`  id=${cert.foreignerId}: już ma DOSTEP_DYPLOM_PL (#${existing.id}) — pomijam`);
      continue;
    }

    const foreigner = await db.fdkForeigner.findUnique({
      where: { id: cert.foreignerId },
      select: { imie: true, nazwisko: true },
    });

    console.log(`  id=${cert.foreignerId} ${foreigner?.imie} ${foreigner?.nazwisko}: ${cert.label} → DOSTEP_DYPLOM_PL`);

    if (DO_APPLY) {
      const base = await db.fdkEmploymentBase.create({
        data: {
          foreignerId: cert.foreignerId,
          typ: "DOSTEP_DYPLOM_PL",
          status: "AKTYWNE",
          firma: cert.label,
        },
      });
      await db.fdkChangeLog.create({
        data: {
          foreignerId: cert.foreignerId,
          changedBy: "create-diploma-bases",
          field: "scrape",
          oldValue: null,
          newValue: `Utworzono podstawę #${base.id} (DOSTEP_DYPLOM_PL — ${cert.label}) z pliku: ${cert.fileName}`,
        },
      });
      console.log(`    → Utworzono #${base.id}`);
    }
  }

  // ========== STEP 2: Skan PDF tekstem ==========
  console.log("\n=== KROK 2: Skanowanie niejasnych PDF-ów tekstem ===\n");

  // Get all diploma attachments that are PDFs and not obviously foreign/Polish
  const FOREIGN_INDICATORS = [
    /t[lł]umaczeni/i, /translat/i, /nostryfikacj/i,
    /apostill/i, /legali[sz]acj/i,
    /university/i, /college/i, /bachelor/i, /master/i,
    /_tl\b/i, /_EN\b/i, /_RU\b/i,
  ];
  const POLISH_NAME_INDICATORS = [
    /uniwersytet/i, /politechnika/i, /akademia/i,
    /szko[lł]a\s*(wy[zż]sz|policealna|g[lł][oó]wn)/i,
    /collegium/i, /WSB/i, /SGH/i, /AGH/i,
    /uczelnia/i, /wy[zż]sz/i, /merito/i,
    /kozminski/i, /lazarski/i, /vistula/i,
  ];

  const allDiplomas = await db.fdkAttachment.findMany({
    where: {
      typPliku: "pdf",
      OR: [
        { nazwaPliku: { contains: "dyplom", mode: "insensitive" } },
        { nazwaPliku: { contains: "diploma", mode: "insensitive" } },
      ],
    },
    include: {
      foreigner: { select: { id: true, imie: true, nazwisko: true, obywatelstwo: true } },
    },
  });

  // Filter to "unclear" ones only
  const unclearPdfs = allDiplomas.filter((d) => {
    const name = d.nazwaPliku;
    const isForeign = FOREIGN_INDICATORS.some((p) => p.test(name));
    const isPolish = POLISH_NAME_INDICATORS.some((p) => p.test(name));
    return !isForeign && !isPolish;
  });

  console.log(`PDF-ów do przeskanowania: ${unclearPdfs.length}\n`);

  const foundPolish = [];
  let scanned = 0;
  let errors = 0;

  for (const att of unclearPdfs) {
    scanned++;
    if (scanned % 50 === 0) console.log(`  Postęp: ${scanned}/${unclearPdfs.length}...`);

    try {
      const { data: fileData, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(att.storagePath);

      if (dlError || !fileData) {
        errors++;
        continue;
      }

      const buffer = await fileData.arrayBuffer();
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(Buffer.from(buffer));
      const text = pdfData.text ?? "";

      if (text.replace(/\s/g, "").length < 30) {
        // Too little text — would need OCR
        continue;
      }

      // Check if Polish institution
      const isPolish = POLISH_UNI_PATTERNS.some((p) => p.test(text));
      if (isPolish) {
        // Extract institution name (first matching line)
        const matchedPattern = POLISH_UNI_PATTERNS.find((p) => p.test(text));
        const match = text.match(matchedPattern);
        const context = match ? text.substring(Math.max(0, match.index - 30), match.index + 80).replace(/\n/g, " ").trim() : "";

        foundPolish.push({
          attachmentId: att.id,
          foreignerId: att.foreigner.id,
          person: `${att.foreigner.imie} ${att.foreigner.nazwisko}`,
          citizenship: att.foreigner.obywatelstwo,
          fileName: att.nazwaPliku,
          context: context.substring(0, 120),
        });
      }
    } catch {
      errors++;
    }
  }

  console.log(`\nPrzeskanowano: ${scanned}, błędów: ${errors}`);
  console.log(`\n--- ZNALEZIONE POLSKIE DYPLOMY (z tekstu PDF) ---`);
  console.log(`Plików: ${foundPolish.length}`);

  // Unique persons
  const uniquePersons = [...new Map(foundPolish.map((f) => [f.foreignerId, f])).values()];
  console.log(`Osób: ${uniquePersons.length}\n`);

  for (const f of foundPolish) {
    console.log(`  id=${f.foreignerId} ${f.person} [${f.citizenship}]: ${f.fileName}`);
    console.log(`    → "${f.context}"`);
  }

  // Check which ones already have DOSTEP_DYPLOM_PL
  if (uniquePersons.length > 0) {
    const existingBases = await db.fdkEmploymentBase.findMany({
      where: {
        foreignerId: { in: uniquePersons.map((p) => p.foreignerId) },
        typ: "DOSTEP_DYPLOM_PL",
      },
    });
    const alreadyHas = new Set(existingBases.map((b) => b.foreignerId));

    const toCreate = uniquePersons.filter((p) => !alreadyHas.has(p.foreignerId));
    console.log(`\nDo utworzenia podstaw: ${toCreate.length} (${alreadyHas.size} już mają)`);

    if (DO_APPLY && toCreate.length > 0) {
      console.log("\nTworzę podstawy:");
      for (const p of toCreate) {
        const base = await db.fdkEmploymentBase.create({
          data: {
            foreignerId: p.foreignerId,
            typ: "DOSTEP_DYPLOM_PL",
            status: "AKTYWNE",
            firma: "absolwent polskiej uczelni",
          },
        });
        await db.fdkChangeLog.create({
          data: {
            foreignerId: p.foreignerId,
            changedBy: "create-diploma-bases",
            field: "scrape",
            oldValue: null,
            newValue: `Utworzono podstawę #${base.id} (DOSTEP_DYPLOM_PL — absolwent polskiej uczelni) z pliku: ${p.fileName}`,
          },
        });
        console.log(`  id=${p.foreignerId} ${p.person} → #${base.id}`);
      }
    }
  }

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
