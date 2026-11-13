/**
 * Round 9 fixes:
 *
 * 1. Scan all foreigners with valid decyzjaPobytowaDo but 0 residence bases → report
 * 2. Restore Valovich /155 TRC-FDK residence basis (deleted by migration-round7 step2)
 * 3. Re-scrape TRC attachments for foreigners with 0 residence bases
 * 4. Report Khoo /52 state (missing Zezwolenie A 16.10.2024)
 *
 * Usage:
 *   node scripts/fix-round9.mjs              # dry run
 *   node scripts/fix-round9.mjs --apply      # apply fixes
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const BUCKET = "fdk-attachments";

// Supabase / Anthropic for re-scraping
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TRC_TYPES = [
  "TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ",
  "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC",
  "TRC_INNE_OKOLICZNOSCI", "TRC_BLUE_CARD", "KARTA_POBYTU", "BLUE_CARD",
];

// ============================================================================
// Step 1: Scan for foreigners with valid permit but 0 residence bases
// ============================================================================
async function step1() {
  console.log("\n=== STEP 1: Scan foreigners with valid permit but 0 residence bases ===");

  const now = new Date();

  // All foreigners with decyzjaPobytowaDo in the future
  const withPermit = await prisma.fdkForeigner.findMany({
    where: { decyzjaPobytowaDo: { gt: now } },
    select: {
      id: true, imie: true, nazwisko: true, decyzjaPobytowaDo: true,
      _count: { select: { residenceBases: true } },
    },
  });

  const noResidenceBases = withPermit.filter((f) => f._count.residenceBases === 0);

  console.log(`  Foreigners with decyzjaPobytowaDo in future: ${withPermit.length}`);
  console.log(`  Of those with 0 residence bases: ${noResidenceBases.length}`);

  const rows = ["id,imie,nazwisko,decyzjaPobytowaDo"];
  for (const f of noResidenceBases) {
    console.log(`    /${f.id} ${f.imie ?? ""} ${f.nazwisko} — kp do: ${f.decyzjaPobytowaDo?.toISOString().slice(0, 10)}`);
    rows.push(`${f.id},"${f.imie ?? ""}","${f.nazwisko}",${f.decyzjaPobytowaDo?.toISOString().slice(0, 10) ?? ""}`);
  }
  writeFileSync("raport-r9-no-residence.csv", rows.join("\n"));

  return noResidenceBases;
}

// ============================================================================
// Step 2: Restore Valovich /155 TRC-FDK residence basis
// ============================================================================
async function step2() {
  console.log("\n=== STEP 2: Restore Valovich /155 TRC-FDK residence basis ===");

  const existing = await prisma.fdkResidenceBasis.findMany({
    where: { foreignerId: 155 },
    orderBy: { dataOd: "desc" },
  });
  console.log(`  Existing residence bases for /155: ${existing.length}`);
  for (const r of existing) {
    console.log(`    #${r.id} ${r.typ} ${r.dataOd?.toISOString().slice(0,10)} — ${r.dataDo?.toISOString().slice(0,10)} nr=${r.nrDecyzji ?? "-"}`);
  }

  // Check if TRC-FDK WSC-II-P.6151.85854.2024 already exists
  const trcExists = existing.some(
    (r) => r.nrDecyzji === "WSC-II-P.6151.85854.2024" || (r.typ === "TRC_FDK" && r.dataDo?.toISOString().slice(0, 10) === "2028-01-28")
  );

  if (trcExists) {
    console.log("  ✓ TRC-FDK basis already exists — skipping creation");
    return;
  }

  // Find the source attachment for re-scraping
  const trcAtt = await prisma.fdkAttachment.findFirst({
    where: {
      foreignerId: 155,
      OR: [
        { detectedType: { in: TRC_TYPES as never } },
        { nazwaPliku: { contains: "WSC" } },
        { nazwaPliku: { contains: "karta" } },
        { nazwaPliku: { contains: "decyzj" } },
        { opis: { contains: "WSC-II-P.6151.85854" } },
      ],
    },
    orderBy: { id: "desc" },
  });

  console.log(`  TRC attachment found: ${trcAtt ? `#${trcAtt.id} ${trcAtt.nazwaPliku}` : "none"}`);

  if (trcAtt && APPLY) {
    // Try re-scraping the attachment to auto-create the residence basis
    console.log(`  Attempting re-scrape of att #${trcAtt.id}...`);
    const wasRescraped = await rescrapeAttachment(trcAtt.id, 155);
    if (wasRescraped) {
      const after = await prisma.fdkResidenceBasis.findMany({ where: { foreignerId: 155 } });
      console.log(`  After re-scrape: ${after.length} residence bases`);
      if (after.some((r) => r.typ === "TRC_FDK")) {
        console.log("  ✓ TRC-FDK basis created by re-scrape");
        return;
      }
    }
  }

  // Manual fallback: create the basis with known data
  console.log("  Manual creation of TRC-FDK basis:");
  console.log("    foreignerId=155, typ=TRC_FDK, dataOd=2025-01-28, dataDo=2028-01-28");
  console.log("    nrDecyzji=WSC-II-P.6151.85854.2024, urzad=Wojewoda Mazowiecki");

  if (APPLY) {
    const created = await prisma.fdkResidenceBasis.create({
      data: {
        foreignerId: 155,
        typ: "TRC_FDK",
        status: "AKTYWNE",
        dataOd: new Date("2025-01-28"),
        dataDo: new Date("2028-01-28"),
        nrDecyzji: "WSC-II-P.6151.85854.2024",
        urzad: "Wojewoda Mazowiecki",
        sourceAttachmentId: trcAtt?.id ?? null,
      },
    });
    console.log(`  ✓ CREATED #${created.id}`);

    // Also update foreigner's decyzjaPobytowaDo if needed
    const foreigner = await prisma.fdkForeigner.findUnique({ where: { id: 155 }, select: { decyzjaPobytowaDo: true } });
    if (!foreigner?.decyzjaPobytowaDo || foreigner.decyzjaPobytowaDo < new Date("2028-01-28")) {
      await prisma.fdkForeigner.update({
        where: { id: 155 },
        data: { decyzjaPobytowaDo: new Date("2028-01-28") },
      });
      console.log("  ✓ Updated foreigner.decyzjaPobytowaDo = 2028-01-28");
    }
  }
}

// ============================================================================
// Step 3: Re-scrape TRC attachments for other foreigners with 0 residence bases
// ============================================================================
async function step3(noResidenceBases) {
  console.log("\n=== STEP 3: Re-scrape TRC attachments for foreigners missing residence bases ===");

  for (const f of noResidenceBases) {
    if (f.id === 155) continue; // handled in step2

    const trcAtts = await prisma.fdkAttachment.findMany({
      where: {
        foreignerId: f.id,
        detectedType: { in: TRC_TYPES as never },
      },
      orderBy: { id: "desc" },
    });

    console.log(`  /${f.id} ${f.imie ?? ""} ${f.nazwisko}: ${trcAtts.length} TRC attachments`);
    for (const att of trcAtts) {
      console.log(`    att #${att.id} ${att.nazwaPliku} (${att.detectedType})`);
      if (APPLY) {
        const ok = await rescrapeAttachment(att.id, f.id);
        console.log(`    → ${ok ? "OK" : "FAIL"}`);
      }
    }
  }
}

// ============================================================================
// Step 4: Check Khoo /52 for missing Zezwolenie A and residence bases
// ============================================================================
async function step4() {
  console.log("\n=== STEP 4: Check Khoo /52 ===");

  const khooBases = await prisma.fdkEmploymentBase.findMany({
    where: { foreignerId: 52 },
    orderBy: { dataOd: "desc" },
    select: { id: true, typ: true, status: true, dataOd: true, dataDo: true, nrDecyzji: true, firma: true, stanowisko: true, rodzajUmowy: true },
  });
  console.log("  Employment bases:");
  for (const b of khooBases) {
    console.log(`    #${b.id} ${b.typ} ${b.status} ${b.dataOd?.toISOString().slice(0,10) ?? "-"} — ${b.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${b.nrDecyzji ?? "-"}`);
  }

  const khooRes = await prisma.fdkResidenceBasis.findMany({
    where: { foreignerId: 52 },
    orderBy: { dataOd: "desc" },
  });
  console.log("  Residence bases:");
  for (const r of khooRes) {
    console.log(`    #${r.id} ${r.typ} ${r.dataOd?.toISOString().slice(0,10) ?? "-"} — ${r.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${r.nrDecyzji ?? "-"}`);
  }

  // Check for missing Zezwolenie A WRP-II.8671.78630.2024 (16.10.2024–15.10.2025)
  const hasZezw = khooBases.some(
    (b) => (b.nrDecyzji ?? "").includes("78630") || (b.dataDo?.toISOString().slice(0,10) === "2025-10-15")
  );
  if (!hasZezw) {
    console.log("\n  ⚠ Khoo missing Zezwolenie A WRP-II.8671.78630.2024 (16.10.2024–15.10.2025)");
    // Find the attachment
    const zezwAtt = await prisma.fdkAttachment.findFirst({
      where: {
        foreignerId: 52,
        OR: [
          { nazwaPliku: { contains: "78630" } },
          { nazwaPliku: { contains: "2024" } },
          { opis: { contains: "78630" } },
          { detectedType: "ZEZWOLENIE_A" },
        ],
      },
      orderBy: { id: "asc" },
    });
    if (zezwAtt) {
      console.log(`  Found attachment: #${zezwAtt.id} ${zezwAtt.nazwaPliku} (${zezwAtt.detectedType})`);
      if (APPLY) {
        console.log("  Re-scraping...");
        await rescrapeAttachment(zezwAtt.id, 52);
      }
    } else {
      console.log("  No attachment found — Zezwolenie may need to be uploaded");
    }
  } else {
    console.log("  ✓ Zezwolenie A already present");
  }
}

// ============================================================================
// Step 5: Check Abraham /47 and Valovich oświadczenia
// ============================================================================
async function step5() {
  console.log("\n=== STEP 5: Check Abraham /47 ===");

  const abrahamBases = await prisma.fdkEmploymentBase.findMany({
    where: { foreignerId: 47 },
    orderBy: { dataOd: "desc" },
    select: { id: true, typ: true, status: true, dataOd: true, dataDo: true, nrDecyzji: true, firma: true, stanowisko: true },
  });
  for (const b of abrahamBases) {
    console.log(`  emp #${b.id} ${b.typ} ${b.status} ${b.dataOd?.toISOString().slice(0,10) ?? "-"} — ${b.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${b.nrDecyzji ?? "-"}`);
  }

  // Check attachment label for /47 (should be ZEZWOLENIE_A, not TRC_BLUE_CARD)
  const wrongType = await prisma.fdkAttachment.findFirst({
    where: { foreignerId: 47, detectedType: "TRC_BLUE_CARD" },
  });
  if (wrongType) {
    console.log(`  ⚠ Abraham att #${wrongType.id} has detectedType=TRC_BLUE_CARD, should be ZEZWOLENIE_A`);
    console.log(`    File: ${wrongType.nazwaPliku}`);
    if (APPLY) {
      await prisma.fdkAttachment.update({ where: { id: wrongType.id }, data: { detectedType: "ZEZWOLENIE_A" } });
      console.log("  ✓ Fixed detectedType → ZEZWOLENIE_A");
      // Fix the employment base typ if wrongly set
      const wrongBase = await prisma.fdkEmploymentBase.findFirst({
        where: { foreignerId: 47, sourceAttachmentId: wrongType.id, typ: "TRC_BLUE_CARD" },
      });
      if (wrongBase) {
        await prisma.fdkEmploymentBase.update({ where: { id: wrongBase.id }, data: { typ: "ZEZWOLENIE_A" } });
        console.log(`  ✓ Fixed employment base #${wrongBase.id} typ → ZEZWOLENIE_A`);
      }
    }
  }

  // Abraham residence bases
  const abrahamRes = await prisma.fdkResidenceBasis.findMany({ where: { foreignerId: 47 } });
  console.log(`  Residence bases for /47: ${abrahamRes.length}`);
  for (const r of abrahamRes) {
    console.log(`    #${r.id} ${r.typ} ${r.dataOd?.toISOString().slice(0,10) ?? "-"} — ${r.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${r.nrDecyzji ?? "-"} urzad=${r.urzad ?? "-"}`);
  }

  console.log("\n=== STEP 5b: Check Valovich /155 oświadczenia ===");
  const valovichBases = await prisma.fdkEmploymentBase.findMany({
    where: { foreignerId: 155 },
    orderBy: { dataOd: "desc" },
    select: { id: true, typ: true, status: true, dataOd: true, dataDo: true, nrDecyzji: true, nrOswiadczenia: true, stanowisko: true, firma: true, rodzajUmowy: true },
  });
  for (const b of valovichBases) {
    console.log(`  emp #${b.id} ${b.typ} ${b.status} ${b.dataOd?.toISOString().slice(0,10) ?? "-"} — ${b.dataDo?.toISOString().slice(0,10) ?? "-"} nr=${b.nrDecyzji ?? b.nrOswiadczenia ?? "-"} stan="${b.stanowisko?.slice(0,30) ?? "-"}" firm="${b.firma?.slice(0,30) ?? "-"}" umowa=${b.rodzajUmowy ?? "-"}`);
  }
}

// ============================================================================
// OCR re-scrape helpers (from direct-rescrape.mjs)
// ============================================================================

const OCR_PROMPT = `Ten obraz to strona polskiego dokumentu imigracyjnego (decyzja pobytowa, zezwolenie na prace, oswiadczenie o powierzeniu pracy, wiza, karta pobytu, powiadomienie UA). Obraz moze byc OBROCONY — odczytaj tekst niezaleznie od orientacji.

ZADANIE: Wyciagnij dane i zwroc TYLKO JSON (bez komentarzy, bez markdown):

{"detectedType":"TRC_FDK","imie":"...","nazwisko":"...","dataUrodzenia":"YYYY-MM-DD","obywatelstwo":"kraj","nrPaszportu":"...","dataOd":"YYYY-MM-DD","dataDo":"YYYY-MM-DD","stanowisko":"...","rodzajUmowy":"...","firma":"...","nrDecyzji":"...","nrOswiadczenia":"...","wynagrodzenie":"...","urzad":"...","sygnaturaSprawy":"..."}

KRYTYCZNE ZASADY:
1. Dokument: NAGLOWEK → SENTENCJA → UZASADNIENIE. Dane bierz TYLKO z SENTENCJI.
2. dataOd = data wydania z naglowka. dataDo = "do dnia" z sentencji.
3. wynagrodzenie = TYLKO z sentencji.
4. firma = PELNA nazwa z sentencji.
5. nrDecyzji: DLA ZEZWOLENIA NA PRACE = numer zezwolenia (cyfry/rok). DLA DECYZJI POBYTOWEJ = sygnatura z naglowka (WSC-..., DL.WIPO...).
6. sygnaturaSprawy = sygnatura WRP-... jesli to zezwolenie na prace.
7. urzad = organ wydajacy: "Wojewoda Mazowiecki" itd. Dla oswiadczen/UA = null.
8. stanowisko: wyodrebnij w MIANOWNIKU (np. "Specjalista" nie "Specjalisty", "Kierowca" nie "Kierowcy").
9. DLA POWIADOMIEN UA: stanowisko = z pola "stanowisko / rodzaj pracy", NIE z przedmiotu umowy.
10. detectedType: ZEZWOLENIE w tytule → ZEZWOLENIE_A; pobyt + FDK → TRC_FDK; pobyt + inny → TRC_INNY_PRACODAWCA; PSZ-OPWP → OSWIADCZENIE; PSZ-PPWPU → POWIADOMIENIE_UA; karta → KARTA_POBYTU.

Pola nieznalezione = null.`;

async function rescrapeAttachment(attId, foreignerId) {
  try {
    const att = await prisma.fdkAttachment.findUnique({ where: { id: attId } });
    if (!att) { console.log(`  [WARN] att #${attId} not found`); return false; }

    // Download from Supabase
    const { data: fileData, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(att.sciezkaPliku);
    if (dlErr || !fileData) { console.log(`  [WARN] download att #${attId}: ${dlErr?.message}`); return false; }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const ext = att.nazwaPliku.split(".").pop()?.toLowerCase() ?? "pdf";
    const mimeMap = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
    const mediaType = mimeMap[ext] ?? "application/pdf";
    const base64 = buffer.toString("base64");
    const isPdf = mediaType === "application/pdf";

    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

    let response;
    if (isPdf) {
      response = await anthropic.beta.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        betas: ["pdfs-2024-09-25"],
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: OCR_PROMPT }] }],
      });
    } else {
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: OCR_PROMPT }] }],
      });
    }

    const rawText = response.content.find((c) => c.type === "text")?.text ?? "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { console.log(`  [WARN] No JSON in response for att #${attId}`); return false; }

    const parsed = JSON.parse(jsonMatch[0]);
    const { detectedType, dataOd, dataDo, nrDecyzji, urzad, nrKartyPobytu } = parsed;

    if (!detectedType) { console.log(`  [WARN] att #${attId}: no detectedType`); return false; }

    // Create residence basis for TRC types
    const residenceTypes = ["TRC_FDK","TRC_INNY_PRACODAWCA","TRC_HUMANITARNE","TRC_POBYT_Z_CUDZ",
      "TRC_MALZONEK_PL","TRC_STUDIA","TRC_ABSOLWENT","TRC_DZIALALNOSC","TRC_INNE_OKOLICZNOSCI",
      "TRC_BLUE_CARD","KARTA_POBYTU","BLUE_CARD"];

    if (residenceTypes.includes(detectedType) && (dataOd || dataDo || nrDecyzji)) {
      // Check for existing duplicate
      const existing = await prisma.fdkResidenceBasis.findFirst({
        where: { foreignerId, nrDecyzji: nrDecyzji ?? undefined, typ: detectedType },
      });
      if (!existing) {
        await prisma.fdkResidenceBasis.create({
          data: {
            foreignerId,
            typ: detectedType,
            status: "AKTYWNE",
            dataOd: dataOd ? new Date(dataOd) : null,
            dataDo: dataDo ? new Date(dataDo) : null,
            nrDecyzji: nrDecyzji ?? null,
            urzad: urzad ?? null,
            nrKartyPobytu: nrKartyPobytu ?? null,
            sourceAttachmentId: attId,
          },
        });
        console.log(`    Created residence basis: ${detectedType} ${dataOd ?? "?"} — ${dataDo ?? "?"} nr=${nrDecyzji ?? "-"}`);
      }
    }

    // Update attachment detectedType
    await prisma.fdkAttachment.update({ where: { id: attId }, data: { detectedType } });

    return true;
  } catch (e) {
    console.log(`  [ERROR] att #${attId}: ${e.message}`);
    return false;
  }
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log(`=== FIX ROUND 9 — ${APPLY ? "APPLY" : "DRY RUN"} ===`);

  const noResidenceBases = await step1();
  await step2();
  await step3(noResidenceBases);
  await step4();
  await step5();

  if (!APPLY) console.log("\n--- DRY RUN. Użyj --apply. ---");
  await prisma.$disconnect();
}

main().catch(console.error);
