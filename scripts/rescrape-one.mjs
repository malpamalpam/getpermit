/**
 * Re-scrape a single foreigner's attachments via OCR to fix/complete data.
 *
 * Usage:
 *   node scripts/rescrape-one.mjs <foreignerId>                    # show attachments
 *   node scripts/rescrape-one.mjs <foreignerId> --att <attId>      # OCR one attachment, show raw result
 *   node scripts/rescrape-one.mjs <foreignerId> --att <attId> --apply  # apply result to base
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

const BUCKET = "fdk-attachments";
const args = process.argv.slice(2);
const foreignerId = parseInt(args.find((a) => !a.startsWith("--")), 10);
const attIdx = args.indexOf("--att");
const attId = attIdx >= 0 ? parseInt(args[attIdx + 1], 10) : null;
const DO_APPLY = args.includes("--apply");

if (!foreignerId || isNaN(foreignerId)) {
  console.error("Usage: node scripts/rescrape-one.mjs <foreignerId> [--att <attId>] [--apply]");
  process.exit(1);
}

async function main() {
  const foreigner = await db.fdkForeigner.findUnique({
    where: { id: foreignerId },
    include: {
      attachments: { orderBy: { uploadedAt: "asc" } },
      employmentBases: { orderBy: { dataOd: "desc" } },
    },
  });

  if (!foreigner) {
    console.error(`Foreigner ${foreignerId} not found`);
    process.exit(1);
  }

  console.log(`\n${foreigner.imie} ${foreigner.nazwisko} (id=${foreignerId})`);
  console.log(`Obywatelstwo: ${foreigner.obywatelstwo ?? "?"}`);
  console.log(`Załączników: ${foreigner.attachments.length}`);
  console.log(`Podstaw: ${foreigner.employmentBases.length}\n`);

  // List attachments
  if (!attId) {
    console.log("ZAŁĄCZNIKI:");
    for (const a of foreigner.attachments) {
      console.log(`  id=${a.id} [${a.kategoria}] ${a.nazwaPliku} (${a.typPliku}, ${(Number(a.rozmiarBytes) / 1024).toFixed(0)} KB)`);
    }
    console.log("\nPODSTAWY:");
    for (const b of foreigner.employmentBases) {
      const od = b.dataOd?.toISOString().slice(0, 10) ?? "—";
      const doo = b.dataDo?.toISOString().slice(0, 10) ?? "—";
      console.log(`  id=${b.id} [${b.typ}] ${b.status} ${od} – ${doo} firma="${b.firma ?? ""}" stanowisko="${b.stanowisko ?? ""}" nr="${b.nrDecyzji ?? b.nrOswiadczenia ?? ""}"`);
    }
    console.log(`\nUżyj: node scripts/rescrape-one.mjs ${foreignerId} --att <attId>`);
    await db.$disconnect();
    return;
  }

  // Find attachment
  const att = foreigner.attachments.find((a) => a.id === attId);
  if (!att) {
    console.error(`Attachment ${attId} not found for foreigner ${foreignerId}`);
    process.exit(1);
  }

  console.log(`Scrapuję: ${att.nazwaPliku} (${att.typPliku})\n`);

  // Download
  const { data: fileData, error: dlError } = await supabase.storage
    .from(BUCKET)
    .download(att.storagePath);

  if (dlError || !fileData) {
    console.error(`Download failed: ${dlError?.message}`);
    process.exit(1);
  }

  const buffer = await fileData.arrayBuffer();

  // Try text extraction first
  if (att.typPliku === "pdf") {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(Buffer.from(buffer));
      const textLen = (pdfData.text ?? "").replace(/\s/g, "").length;
      console.log(`--- TEXT LAYER (${textLen} znaków) ---`);
      if (textLen > 50) {
        console.log(pdfData.text.substring(0, 3000));
        console.log(textLen > 3000 ? `\n... (obcięto, pełny tekst: ${textLen} zn.)` : "");
      } else {
        console.log("(za mało tekstu — skan bez warstwy tekstowej)");
      }
      console.log("---\n");
    } catch {
      console.log("(pdf-parse error — skan)\n");
    }
  }

  // OCR
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Brak ANTHROPIC_API_KEY");
    process.exit(1);
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const base64 = Buffer.from(buffer).toString("base64");
  const isPdf = att.typPliku === "pdf";
  const isImage = ["jpeg", "jpg", "png"].includes(att.typPliku);

  const extractionPrompt = `Ten obraz/plik to strona polskiego dokumentu imigracyjnego. Obraz moze byc OBROCONY.

ZADANIE: Wyciagnij dane i zwroc TYLKO JSON:

{"detectedType":"...","imie":"...","nazwisko":"...","dataUrodzenia":"YYYY-MM-DD","obywatelstwo":"kraj","nrPaszportu":"...","dataOd":"YYYY-MM-DD","dataDo":"YYYY-MM-DD","stanowisko":"...","rodzajUmowy":"...","firma":"...","nrDecyzji":"...","nrOswiadczenia":"...","wynagrodzenie":"..."}

ZASADY:
1. Dokument: NAGLOWEK → SENTENCJA → UZASADNIENIE. Dane bierz TYLKO z SENTENCJI (nie uzasadnienia).
2. dataOd = data wydania z naglowka. dataDo = "do dnia" z sentencji.
3. wynagrodzenie = TYLKO z sentencji ("za wynagrodzeniem nie nizszym niz X zl brutto").
4. firma = PELNA nazwa z sentencji ("na rzecz podmiotu NAZWA").
5. nrDecyzji = sygnatura z naglowka (pod nazwa organu).
6. detectedType:
   - "wysokie kwalifikacje"/art.127 W SENTENCJI → BLUE_CARD
   - "udzielam zezwolenia na pobyt" → KARTA_POBYTU
   - "zezwolenie na prace" → ZEZWOLENIE
   - formularz PSZ-OPWP → OSWIADCZENIE
   - "powiadomienie o powierzeniu pracy" → ZGLOSZENIE_UA
7. obywatelstwo: TYLKO kraj.
8. stanowisko: z sentencji ("na stanowisku" lub "rodzaj pracy").
9. Pola nieznalezione = null.`;

  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: isImage ? "image/jpeg" : "image/png", data: base64 } };

  let response;
  if (isPdf) {
    response = await client.beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      betas: ["pdfs-2024-09-25"],
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: extractionPrompt }] }],
    });
  } else {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: extractionPrompt }] }],
    });
  }

  const fullText = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n").trim();

  console.log("--- RAW OCR RESPONSE ---");
  console.log(fullText);
  console.log("---\n");

  // Parse JSON
  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Nie znaleziono JSON w odpowiedzi OCR");
    await db.$disconnect();
    return;
  }

  const data = JSON.parse(jsonMatch[0]);
  console.log("PARSED:");
  console.log(JSON.stringify(data, null, 2));

  if (!DO_APPLY) {
    console.log(`\nUżyj --apply aby zaktualizować podstawę w bazie.`);
    await db.$disconnect();
    return;
  }

  // Apply: find matching base or update the most relevant one
  const docType = data.detectedType;
  if (!docType) {
    console.log("Brak detectedType — nie aktualizuję.");
    await db.$disconnect();
    return;
  }

  // Find existing base to update
  let targetBase = foreigner.employmentBases.find((b) => b.typ === docType && (!b.dataDo || !data.dataDo));
  if (!targetBase) {
    targetBase = foreigner.employmentBases.find((b) => b.typ === docType);
  }

  if (!targetBase) {
    console.log(`Brak podstawy typu ${docType} do zaktualizowania. Tworzę nową...`);
    const newBase = await db.fdkEmploymentBase.create({
      data: {
        foreignerId,
        typ: docType,
        status: "BRAK_DANYCH",
        dataOd: data.dataOd ? new Date(data.dataOd) : null,
        dataDo: data.dataDo ? new Date(data.dataDo) : null,
        firma: data.firma || null,
        stanowisko: data.stanowisko || null,
        nrDecyzji: data.nrDecyzji || null,
        nrOswiadczenia: data.nrOswiadczenia || null,
        wynagrodzenie: data.wynagrodzenie || null,
        rodzajUmowy: data.rodzajUmowy || null,
      },
    });
    console.log(`Utworzono podstawę #${newBase.id} (${docType})`);
  } else {
    const updateFields = {};
    if (data.dataOd && !targetBase.dataOd) updateFields.dataOd = new Date(data.dataOd);
    if (data.dataDo && !targetBase.dataDo) updateFields.dataDo = new Date(data.dataDo);
    if (data.firma && !targetBase.firma) updateFields.firma = data.firma;
    if (data.stanowisko && !targetBase.stanowisko) updateFields.stanowisko = data.stanowisko;
    if (data.nrDecyzji && !targetBase.nrDecyzji) updateFields.nrDecyzji = data.nrDecyzji;
    if (data.wynagrodzenie && !targetBase.wynagrodzenie) updateFields.wynagrodzenie = data.wynagrodzenie;
    if (data.rodzajUmowy && !targetBase.rodzajUmowy) updateFields.rodzajUmowy = data.rodzajUmowy;

    if (Object.keys(updateFields).length === 0) {
      console.log(`Podstawa #${targetBase.id} już ma wszystkie pola — nic do aktualizacji.`);
    } else {
      await db.fdkEmploymentBase.update({ where: { id: targetBase.id }, data: updateFields });
      await db.fdkChangeLog.create({
        data: {
          foreignerId,
          changedBy: "rescrape-one",
          field: "scrape",
          oldValue: null,
          newValue: `Uzupełniono podstawę #${targetBase.id} (${docType}) z pliku: ${att.nazwaPliku}. Pola: ${Object.keys(updateFields).join(", ")}`,
        },
      });
      console.log(`Zaktualizowano #${targetBase.id}: ${JSON.stringify(updateFields, null, 2)}`);
    }
  }

  // Update foreigner fields
  const fUpdate = {};
  if (data.obywatelstwo && !foreigner.obywatelstwo) fUpdate.obywatelstwo = data.obywatelstwo;
  if (data.dataUrodzenia && !foreigner.dataUrodzenia) fUpdate.dataUrodzenia = new Date(data.dataUrodzenia);
  if (data.nrPaszportu && !foreigner.nrPaszportu) fUpdate.nrPaszportu = data.nrPaszportu;
  if (Object.keys(fUpdate).length > 0) {
    await db.fdkForeigner.update({ where: { id: foreignerId }, data: fUpdate });
    console.log(`Zaktualizowano profil: ${JSON.stringify(fUpdate)}`);
  }

  console.log("\nGotowe.");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
