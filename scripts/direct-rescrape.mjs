/**
 * Direct re-scrape — bypasses Next.js API, calls OCR + updates DB directly.
 * Use for bulk re-scraping when API auth is not available from scripts.
 *
 * Usage:
 *   node scripts/direct-rescrape.mjs --list              # show what needs re-scrape
 *   node scripts/direct-rescrape.mjs --ids 185,7030,7137  # specific attachments
 *   node scripts/direct-rescrape.mjs --all                # all pending
 *   node scripts/direct-rescrape.mjs --profile 52         # all wazne for foreigner
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BUCKET = "fdk-attachments";

const args = process.argv.slice(2);
const LIST = args.includes("--list");
const ALL = args.includes("--all");
const idsIdx = args.indexOf("--ids");
const profileIdx = args.indexOf("--profile");
const specificIds = idsIdx >= 0 ? args[idsIdx + 1].split(",").map(Number) : [];
const profileId = profileIdx >= 0 ? parseInt(args[profileIdx + 1], 10) : null;

// ============================================================================
// OCR extraction prompt (matches pdf-parser.ts ocrExtractStructured)
// ============================================================================

const PROMPT = `Ten obraz to strona polskiego dokumentu imigracyjnego (decyzja pobytowa, zezwolenie na prace, oswiadczenie o powierzeniu pracy, wiza, karta pobytu, powiadomienie UA). Obraz moze byc OBROCONY — odczytaj tekst niezaleznie od orientacji.

ZADANIE: Wyciagnij dane i zwroc TYLKO JSON (bez komentarzy, bez markdown):

{"detectedType":"TRC_FDK","imie":"...","nazwisko":"...","dataUrodzenia":"YYYY-MM-DD","obywatelstwo":"kraj","nrPaszportu":"...","dataOd":"YYYY-MM-DD","dataDo":"YYYY-MM-DD","stanowisko":"...","rodzajUmowy":"...","firma":"...","nrDecyzji":"...","nrOswiadczenia":"...","wynagrodzenie":"...","urzad":"..."}

KRYTYCZNE ZASADY:
1. Dokument: NAGLOWEK → SENTENCJA → UZASADNIENIE. Dane bierz TYLKO z SENTENCJI.
2. dataOd = data wydania z naglowka. dataDo = "do dnia" z sentencji.
3. wynagrodzenie = TYLKO z sentencji ("za wynagrodzeniem nie nizszym niz X zl brutto").
4. firma = PELNA nazwa z sentencji ("na rzecz podmiotu NAZWA").
5. nrDecyzji: DLA ZEZWOLENIA NA PRACE = numer zezwolenia z tytulu "(typu A) nr NNNNN/RRRR" lub "nr dok NNNNN/RRRR". Format: cyfry/rok. NIGDY sygnatura WRP-... (ta idzie do sygnaturaSprawy). DLA DECYZJI POBYTOWEJ = sygnatura z naglowka (WSC-..., DL.WIPO...).
6. sygnaturaSprawy = sygnatura WRP-... (jesli dokument to zezwolenie na prace). Dla decyzji pobytowych = null.
7. urzad = organ wydajacy: "Wojewoda Mazowiecki", "Wojewoda Malopolski", "Szef Urzedu do Spraw Cudzoziemcow". Dla oswiadczen i powiadomien UA = null.
8. detectedType:
   - "ZEZWOLENIE na prace cudzoziemca" w tytule → ZEZWOLENIE_A
   - "udzielam zezwolenia na pobyt czasowy" + praca na rzecz FDK → TRC_FDK
   - "udzielam zezwolenia na pobyt czasowy" + inny pracodawca → TRC_INNY_PRACODAWCA
   - "wysokie kwalifikacje" / art. 127 → TRC_BLUE_CARD
   - formularz PSZ-OPWP → OSWIADCZENIE
   - PSZ-PPWPU / "powiadomienie o powierzeniu pracy" → POWIADOMIENIE_UA
   - skan plastikowej karty pobytu → KARTA_POBYTU
9. DLA POWIADOMIEN UA (PSZ-PPWPU): stanowisko = TYLKO z pola "stanowisko / rodzaj pracy" w formularzu. NIGDY z "przedmiotu umowy / dziela". firma = podmiot powierzajacy prace. rodzajUmowy = typ umowy z formularza. wynagrodzenie = szukaj liczby z PLN/zl w polach: "wynagrodzenie brutto", "stawka godzinowa", "kwota za wykonanie dziela", "przewidywana kwota wynagrodzenia", "lacznie" — zwroc np. "3500 zl brutto" lub "25 zl/h". Jesli brak kwoty → null.
10. STANOWISKO NIGDY NIE JEST OPISEM CZYNNOSCI: jesli wartosc zaczyna sie od slowa "Stworzenie", "Wykonanie", "Opracowanie", "Przyjmuje", "Realizacja", "Przygotowanie", "Prowadzenie" lub innego rzeczownika odczasownikowego — to jest PRZEDMIOT DZIELA, nie stanowisko. Zwroc null.
11. STANOWISKO ZAWSZE W MIANOWNIKU: jesli decyzja uzywa odmiany (np. "na stanowisku specjalisty"), podaj forme podstawowa ("Specjalista"). Np. "kierowcy" → "Kierowca", "ksiegowej" → "Ksiegowa".
12. DLA ZEZWOLENIA NA PRACE: okres = "Zezwolenie na prace jest wazne od DD.MM.RRRR do DD.MM.RRRR". NIE bierz dat z wniosku, umowy, ani daty doreczenia.
13. stanowisko z sentencji decyzji pobytowej: tekst w cudzyslowie po "na stanowisku".
14. rodzajUmowy z sentencji: "na podstawie umowy o dzielo" / "umowy zlecenia" / "umowy o prace".

Pola nieznalezione = null.`;

// ============================================================================
// OCR call
// ============================================================================

async function ocrExtract(buffer, mediaType, filename) {
  const base64 = Buffer.from(buffer).toString("base64");
  const isPdf = mediaType === "application/pdf";

  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (isPdf) {
        response = await anthropic.beta.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          betas: ["pdfs-2024-09-25"],
          messages: [{ role: "user", content: [contentBlock, { type: "text", text: PROMPT }] }],
        });
      } else {
        response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [{ role: "user", content: [contentBlock, { type: "text", text: PROMPT }] }],
        });
      }
      break;
    } catch (err) {
      const msg = err.message ?? String(err);
      if (/429|overloaded|rate/i.test(msg) && attempt < 2) {
        console.log(`    [RETRY] ${msg.substring(0, 60)} — waiting...`);
        await new Promise((r) => setTimeout(r, (attempt + 1) * 5000));
        continue;
      }
      throw err;
    }
  }

  const fullText = response.content.filter(b => b.type === "text").map(b => b.text ?? "").join("\n").trim();
  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// ============================================================================
// Update DB from OCR result
// ============================================================================

async function updateFromOcr(attachmentId, foreignerId, data) {
  if (!data || !data.detectedType) return { action: "skip", reason: "no detectedType" };

  // Update employment base linked to this attachment
  const existingEmp = await prisma.fdkEmploymentBase.findFirst({
    where: { foreignerId, sourceAttachmentId: attachmentId },
  });

  const empFields = {};
  if (data.stanowisko) empFields.stanowisko = data.stanowisko;
  if (data.rodzajUmowy) empFields.rodzajUmowy = data.rodzajUmowy;
  if (data.firma) empFields.firma = data.firma;
  if (data.wynagrodzenie) empFields.wynagrodzenie = data.wynagrodzenie;
  if (data.urzad) empFields.urzad = data.urzad;
  if (data.dataOd) empFields.dataOd = new Date(data.dataOd);
  if (data.dataDo) empFields.dataDo = new Date(data.dataDo);

  // For zezwolenia: nrDecyzji = permit number, sygnaturaSprawy → sygnatura
  if (data.nrDecyzji && !/^WRP/i.test(data.nrDecyzji)) {
    empFields.nrDecyzji = data.nrDecyzji;
  }
  if (data.sygnaturaSprawy) {
    empFields.sygnatura = data.sygnaturaSprawy;
  }
  // If nrDecyzji starts with WRP, it's the sygnatura
  if (data.nrDecyzji && /^WRP/i.test(data.nrDecyzji)) {
    empFields.sygnatura = data.nrDecyzji;
    // Don't set nrDecyzji to WRP
  }

  if (existingEmp && Object.keys(empFields).length > 0) {
    // Only update non-null fields (don't overwrite good data with null)
    const updates = {};
    for (const [k, v] of Object.entries(empFields)) {
      if (v !== null && v !== undefined) updates[k] = v;
    }
    await prisma.fdkEmploymentBase.update({ where: { id: existingEmp.id }, data: updates });
  } else if (!existingEmp && data.detectedType === "POWIADOMIENIE_UA" && data.dataOd) {
    // Create new UA employment base
    await prisma.fdkEmploymentBase.create({
      data: {
        foreignerId,
        typ: "POWIADOMIENIE_UA",
        status: "BRAK_DANYCH",
        sourceAttachmentId: attachmentId,
        dataOd: data.dataOd ? new Date(data.dataOd) : null,
        dataDo: data.dataDo ? new Date(data.dataDo) : null,
        stanowisko: data.stanowisko || null,
        rodzajUmowy: data.rodzajUmowy || null,
        firma: data.firma || null,
        wynagrodzenie: data.wynagrodzenie || null,
      },
    });
  }

  // Update residence base linked to this attachment
  const existingRes = await prisma.fdkResidenceBasis.findFirst({
    where: { foreignerId, sourceAttachmentId: attachmentId },
  });
  if (existingRes) {
    const resUpdates = {};
    if (data.urzad && !existingRes.urzad) resUpdates.urzad = data.urzad;
    if (data.nrDecyzji && !existingRes.nrDecyzji && !/^WRP/i.test(data.nrDecyzji)) resUpdates.nrDecyzji = data.nrDecyzji;
    if (data.dataOd && !existingRes.dataOd) resUpdates.dataOd = new Date(data.dataOd);
    if (data.dataDo && !existingRes.dataDo) resUpdates.dataDo = new Date(data.dataDo);
    if (Object.keys(resUpdates).length > 0) {
      await prisma.fdkResidenceBasis.update({ where: { id: existingRes.id }, data: resUpdates });
    }
  }

  return {
    action: existingEmp ? "updated" : (data.detectedType === "POWIADOMIENIE_UA" ? "created" : "no_base"),
    type: data.detectedType,
    stanowisko: data.stanowisko?.substring(0, 40),
    urzad: data.urzad,
    nrDecyzji: data.nrDecyzji,
    sygnaturaSprawy: data.sygnaturaSprawy,
  };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  let attachments;

  if (specificIds.length > 0) {
    attachments = await prisma.fdkAttachment.findMany({
      where: { id: { in: specificIds } },
      select: { id: true, foreignerId: true, nazwaPliku: true, typPliku: true, storagePath: true, folder: true, detectedType: true },
    });
  } else if (profileId) {
    attachments = await prisma.fdkAttachment.findMany({
      where: { foreignerId: profileId, folder: "wazne" },
      select: { id: true, foreignerId: true, nazwaPliku: true, typPliku: true, storagePath: true, folder: true, detectedType: true },
    });
  } else if (ALL) {
    // All that need re-scrape: UA with POWIADOMIENIE_UA type, zezwolenia without permit nr, TRC without stanowisko
    const uaAtts = await prisma.fdkAttachment.findMany({
      where: { detectedType: "POWIADOMIENIE_UA", folder: "wazne" },
      select: { id: true, foreignerId: true, nazwaPliku: true, typPliku: true, storagePath: true, folder: true, detectedType: true },
    });
    // TRC with empty stanowisko
    const trcBases = await prisma.fdkEmploymentBase.findMany({
      where: {
        typ: { in: ["TRC_FDK", "TRC_BLUE_CARD", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ", "TRC_MALZONEK_PL"] },
        OR: [{ stanowisko: null }, { stanowisko: "" }],
        sourceAttachmentId: { not: null },
      },
      select: { sourceAttachmentId: true },
    });
    const trcAttIds = trcBases.map(b => b.sourceAttachmentId).filter(Boolean);
    const trcAtts = trcAttIds.length > 0 ? await prisma.fdkAttachment.findMany({
      where: { id: { in: trcAttIds } },
      select: { id: true, foreignerId: true, nazwaPliku: true, typPliku: true, storagePath: true, folder: true, detectedType: true },
    }) : [];

    const allMap = new Map();
    for (const a of [...uaAtts, ...trcAtts]) allMap.set(a.id, a);
    attachments = [...allMap.values()];
  } else {
    // --list mode
    LIST; // just to use the variable
    const uaCount = await prisma.fdkAttachment.count({ where: { detectedType: "POWIADOMIENIE_UA", folder: "wazne" } });
    const trcEmpty = await prisma.fdkEmploymentBase.count({
      where: {
        typ: { in: ["TRC_FDK", "TRC_BLUE_CARD", "TRC_HUMANITARNE"] },
        OR: [{ stanowisko: null }, { stanowisko: "" }],
        sourceAttachmentId: { not: null },
      },
    });
    console.log(`UA notifications to scrape: ${uaCount}`);
    console.log(`TRC with empty stanowisko: ${trcEmpty}`);
    console.log("\nUsage:");
    console.log("  --ids 185,7030    Specific attachment IDs");
    console.log("  --profile 52      All wazne for foreigner 52");
    console.log("  --all             All pending (UA + TRC empty)");
    await prisma.$disconnect();
    return;
  }

  console.log(`=== DIRECT RE-SCRAPE: ${attachments.length} attachments ===\n`);

  let ok = 0, fail = 0, skip = 0;
  for (const att of attachments) {
    const scrapable = ["pdf", "jpeg", "jpg", "png"];
    if (!scrapable.includes(att.typPliku)) { skip++; continue; }

    try {
      // Download
      const { data: fileData, error: dlError } = await supabase.storage.from(BUCKET).download(att.storagePath);
      if (dlError || !fileData) {
        console.log(`  [DL_FAIL] #${att.id} ${att.nazwaPliku}`);
        fail++;
        continue;
      }

      const buffer = await fileData.arrayBuffer();
      const isImage = ["jpeg", "jpg", "png"].includes(att.typPliku);
      const mediaType = isImage ? (att.typPliku === "png" ? "image/png" : "image/jpeg") : "application/pdf";

      // OCR
      const data = await ocrExtract(buffer, mediaType, att.nazwaPliku);
      if (!data) {
        console.log(`  [NO_DATA] #${att.id} ${att.nazwaPliku}`);
        fail++;
        continue;
      }

      // Update DB
      const result = await updateFromOcr(att.id, att.foreignerId, data);
      console.log(`  [${result.action.toUpperCase()}] #${att.id} ${att.nazwaPliku} → ${result.type ?? "?"} stan="${result.stanowisko ?? "-"}" urzad="${result.urzad ?? "-"}" nr="${result.nrDecyzji ?? "-"}"`);
      ok++;

      // Rate limit: 500ms between OCR calls
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.log(`  [ERROR] #${att.id} ${att.nazwaPliku}: ${err.message?.substring(0, 80)}`);
      fail++;
    }
  }

  console.log(`\n=== DONE: ${ok} OK, ${fail} failed, ${skip} skipped ===`);
  await prisma.$disconnect();
}

main().catch(console.error);
