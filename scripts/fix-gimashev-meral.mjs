/**
 * Fix Gimashev (id=44) and Meral (id=581):
 * 1. Clear false "inna osoba" flag on Gimashev att 4570
 * 2. OCR rescrape att 4570 (Gimashev decision PDF)
 * 3. OCR rescrape att 4909 (Meral decision PNG)
 * 4. Show SELECT results as proof
 *
 * Usage:
 *   node scripts/fix-gimashev-meral.mjs          # dry run — show what would happen
 *   node scripts/fix-gimashev-meral.mjs --apply  # apply changes to DB
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
const DO_APPLY = process.argv.includes("--apply");

const EXTRACTION_PROMPT = `Ten obraz/plik to strona polskiego dokumentu imigracyjnego. Obraz moze byc OBROCONY.

ZADANIE: Wyciagnij dane i zwroc TYLKO JSON:

{"detectedType":"...","imie":"...","nazwisko":"...","dataUrodzenia":"YYYY-MM-DD","obywatelstwo":"kraj","nrPaszportu":"...","dataOd":"YYYY-MM-DD","dataDo":"YYYY-MM-DD","stanowisko":"...","rodzajUmowy":"...","firma":"...","nrDecyzji":"...","nrOswiadczenia":"...","wynagrodzenie":"...","wymiarCzasu":"..."}

ZASADY:
1. Dokument: NAGLOWEK → SENTENCJA → UZASADNIENIE. Dane bierz WYŁĄCZNIE z SENTENCJI (po "postanawiam"/"orzekam"/"udzielam"). NIGDY z UZASADNIENIA.
2. DECYZJA II INSTANCJI (Szef Urzędu do Spraw Cudzoziemców, "uchylam i udzielam"):
   - nrDecyzji = sygnatura z NAGLOWKA tej decyzji (np. DL.WIIPO.xxxx), NIE numer uchylonej decyzji (np. WSC-...).
   - Wszystkie dane (daty, wynagrodzenie, stanowisko, firma) TYLKO z części po "udzielam zezwolenia" w SENTENCJI.
   - dataDo = data "do dnia" z sentencji udzielenia.
   - dataOd = data wydania decyzji z nagłówka.
   - IGNORUJ wszystkie numery, daty i kwoty wymienione w uzasadnieniu lub w części "uchylam".
3. dataOd = data wydania z naglowka. dataDo = "do dnia" z sentencji.
4. wynagrodzenie = TYLKO z sentencji ("za wynagrodzeniem nie nizszym niz X zl brutto").
5. firma = PELNA nazwa z sentencji ("na rzecz podmiotu NAZWA").
6. nrDecyzji = sygnatura z naglowka (pod nazwa organu).
7. detectedType:
   - "wysokie kwalifikacje"/art.127 W SENTENCJI → BLUE_CARD
   - "udzielam zezwolenia na pobyt" → KARTA_POBYTU
   - "zezwolenie na prace" → ZEZWOLENIE
   - formularz PSZ-OPWP → OSWIADCZENIE
   - "powiadomienie o powierzeniu pracy" → ZGLOSZENIE_UA
8. obywatelstwo: TYLKO kraj (NIE "Federacji Rosyjskiej" — to powinno być "Rosja").
9. stanowisko: z sentencji ("na stanowisku" lub "rodzaj pracy").
10. wymiarCzasu: np. "100 godzin miesięcznie", "pełny etat" — z sentencji.
11. rodzajUmowy: np. "umowa o dzieło", "umowa zlecenie" — z sentencji.
12. Pola nieznalezione = null.`;

async function ocrExtract(buffer, typPliku, filename) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const isPdf = typPliku === "pdf";
  const mediaType = typPliku === "png" ? "image/png" : "image/jpeg";
  const base64 = Buffer.from(buffer).toString("base64");

  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

  let response;
  if (isPdf) {
    response = await client.beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      betas: ["pdfs-2024-09-25"],
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: EXTRACTION_PROMPT }] }],
    });
  } else {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: EXTRACTION_PROMPT }] }],
    });
  }

  const fullText = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n").trim();

  console.log("  RAW OCR:", fullText.substring(0, 500));

  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
}

async function processAttachment(foreignerId, attId, label) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(60)}`);

  const att = await db.fdkAttachment.findUnique({ where: { id: attId } });
  if (!att) {
    console.error(`  Załącznik ${attId} nie znaleziony!`);
    return null;
  }
  console.log(`  Plik: ${att.nazwaPliku} (${att.typPliku})`);
  console.log(`  Opis: ${att.opis ?? "(brak)"}`);

  // Download from Supabase
  console.log("  Pobieram z Supabase...");
  const { data: fileData, error: dlError } = await supabase.storage
    .from(BUCKET)
    .download(att.storagePath);

  if (dlError || !fileData) {
    console.error(`  Download FAILED: ${dlError?.message}`);
    return null;
  }

  const buffer = await fileData.arrayBuffer();
  console.log(`  Pobrano: ${(buffer.byteLength / 1024).toFixed(0)} KB`);

  // Try text extraction for PDFs
  if (att.typPliku === "pdf") {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(Buffer.from(buffer));
      const textLen = (pdfData.text ?? "").replace(/\s/g, "").length;
      console.log(`  Warstwa tekstowa: ${textLen} znaków`);
      if (textLen > 200) {
        console.log(`  Pierwsze 500 zn.: ${pdfData.text.substring(0, 500).replace(/\n/g, " | ")}`);
      }
    } catch {
      console.log("  (brak warstwy tekstowej)");
    }
  }

  // OCR
  console.log("  Uruchamiam OCR...");

  const data = await ocrExtract(buffer, att.typPliku, att.nazwaPliku);
  if (!data) {
    console.error("  OCR nie zwrócił danych!");
    return null;
  }

  console.log("\n  WYNIK OCR:");
  console.log(JSON.stringify(data, null, 2));

  return { att, data };
}

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY — zmiany w bazie" : "DRY RUN — bez zmian"}\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Brak ANTHROPIC_API_KEY!");
    process.exit(1);
  }

  // ========== 1. GIMASHEV (id=44, att=4570) ==========

  // Clear false flag first
  const att4570 = await db.fdkAttachment.findUnique({ where: { id: 4570 } });
  if (att4570?.opis?.startsWith("\u26a0")) {
    console.log(`Gimashev att 4570: fałszywa flaga "${att4570.opis}"`);
    if (DO_APPLY) {
      await db.fdkAttachment.update({ where: { id: 4570 }, data: { opis: null } });
      console.log("  → Flaga USUNIĘTA");
    } else {
      console.log("  → [DRY RUN] Flaga zostanie usunięta z --apply");
    }
  }

  const gimashev = await processAttachment(44, 4570, "GIMASHEV id=44 — Linar_Gimashev_decyzja_17.12.2025_17.12.2028_TRC.pdf");

  if (gimashev && DO_APPLY) {
    const d = gimashev.data;
    const docType = d.detectedType || "KARTA_POBYTU";

    // Find existing base #1053 (from odmowa) — update it with correct data
    const existingBase = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: 44, id: 1053 },
    });

    const baseData = {
      typ: docType,
      dataOd: d.dataOd ? new Date(d.dataOd) : null,
      dataDo: d.dataDo ? new Date(d.dataDo) : null,
      nrDecyzji: d.nrDecyzji || null,
      stanowisko: d.stanowisko || null,
      firma: d.firma || null,
      rodzajUmowy: d.rodzajUmowy || null,
    };
    if (d.wynagrodzenie) {
      const numMatch = d.wynagrodzenie.match(/([0-9]+[.,]?\d*)/);
      if (numMatch) baseData.stawka = parseFloat(numMatch[1].replace(",", "."));
    }

    if (existingBase) {
      await db.fdkEmploymentBase.update({ where: { id: existingBase.id }, data: baseData });
      console.log(`\n  → Zaktualizowano podstawę #${existingBase.id}`);
    } else {
      baseData.foreignerId = 44;
      baseData.status = "BRAK_DANYCH";
      const newBase = await db.fdkEmploymentBase.create({ data: baseData });
      console.log(`\n  → Utworzono nową podstawę #${newBase.id}`);
    }

    await db.fdkChangeLog.create({
      data: {
        foreignerId: 44,
        changedBy: "fix-gimashev-meral",
        field: "scrape",
        oldValue: null,
        newValue: `Naprawiono podstawę (${docType}) z pliku: ${gimashev.att.nazwaPliku}. nrDecyzji=${d.nrDecyzji}, dataDo=${d.dataDo}, stawka=${d.wynagrodzenie}, stanowisko=${d.stanowisko}`,
      },
    });
  }

  // ========== 2. MERAL (id=581, att=4909) ==========

  const meral = await processAttachment(581, 4909, "MERAL id=581 — Decyzja_TRC_Hakan_Meral_do_04.04.2027.png");

  if (meral && DO_APPLY) {
    const d = meral.data;
    const docType = d.detectedType || "KARTA_POBYTU";

    const baseData = {
      foreignerId: 581,
      typ: docType,
      status: "BRAK_DANYCH",
      dataOd: d.dataOd ? new Date(d.dataOd) : null,
      dataDo: d.dataDo ? new Date(d.dataDo) : null,
      nrDecyzji: d.nrDecyzji || null,
      stanowisko: d.stanowisko || null,
      firma: d.firma || null,
      rodzajUmowy: d.rodzajUmowy || null,
    };
    if (d.wynagrodzenie) {
      const numMatch = d.wynagrodzenie.match(/([0-9]+[.,]?\d*)/);
      if (numMatch) baseData.stawka = parseFloat(numMatch[1].replace(",", "."));
    }

    // Check if base already exists for this type
    const existing = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: 581, typ: docType },
    });

    if (existing) {
      const { foreignerId: _fid, status: _st, ...updateFields } = baseData;
      await db.fdkEmploymentBase.update({ where: { id: existing.id }, data: updateFields });
      console.log(`\n  → Zaktualizowano podstawę #${existing.id}`);
    } else {
      const newBase = await db.fdkEmploymentBase.create({ data: baseData });
      console.log(`\n  → Utworzono nową podstawę #${newBase.id}`);
    }

    await db.fdkChangeLog.create({
      data: {
        foreignerId: 581,
        changedBy: "fix-gimashev-meral",
        field: "scrape",
        oldValue: null,
        newValue: `Utworzono/zaktualizowano podstawę (${docType}) z pliku: ${meral.att.nazwaPliku}. nrDecyzji=${d.nrDecyzji}, dataDo=${d.dataDo}, stawka=${d.wynagrodzenie}, stanowisko=${d.stanowisko}`,
      },
    });

    // Update decyzjaPobytowaDo if applicable
    if ((docType === "KARTA_POBYTU" || docType === "BLUE_CARD") && d.dataDo) {
      const foreigner = await db.fdkForeigner.findUnique({ where: { id: 581 } });
      const newDate = new Date(d.dataDo);
      if (!foreigner.decyzjaPobytowaDo || newDate > foreigner.decyzjaPobytowaDo) {
        await db.fdkForeigner.update({ where: { id: 581 }, data: { decyzjaPobytowaDo: newDate } });
        console.log(`  → decyzjaPobytowaDo = ${d.dataDo}`);
      }
    }
  }

  // ========== 3. WERYFIKACJA ==========

  if (DO_APPLY) {
    console.log(`\n${"=".repeat(60)}`);
    console.log("  WERYFIKACJA — SELECT PO ZMIANACH");
    console.log(`${"=".repeat(60)}`);

    console.log("\n--- Gimashev (id=44) podstawy ---");
    const bases44 = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 44 } });
    for (const b of bases44) {
      console.log(JSON.stringify({
        id: b.id, typ: b.typ, nrDecyzji: b.nrDecyzji,
        dataOd: b.dataOd?.toISOString().slice(0, 10),
        dataDo: b.dataDo?.toISOString().slice(0, 10),
        stawka: b.stawka != null ? Number(b.stawka) : null,
        stanowisko: b.stanowisko, firma: b.firma, rodzajUmowy: b.rodzajUmowy,
      }, null, 2));
    }

    console.log("\n--- Meral (id=581) podstawy ---");
    const bases581 = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 581 } });
    for (const b of bases581) {
      console.log(JSON.stringify({
        id: b.id, typ: b.typ, nrDecyzji: b.nrDecyzji,
        dataOd: b.dataOd?.toISOString().slice(0, 10),
        dataDo: b.dataDo?.toISOString().slice(0, 10),
        stawka: b.stawka != null ? Number(b.stawka) : null,
        stanowisko: b.stanowisko, firma: b.firma, rodzajUmowy: b.rodzajUmowy,
      }, null, 2));
    }

    console.log("\n--- Gimashev att 4570 opis ---");
    const att4570after = await db.fdkAttachment.findUnique({ where: { id: 4570 } });
    console.log(`  opis: ${att4570after?.opis ?? "(null — flaga usunięta)"}`);
  }

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
