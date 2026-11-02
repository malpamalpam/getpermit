/**
 * Fix Regan #421: stawka 21 (godzinowa) → przelicz na miesięczną
 * Fix Crooks #1241: rescrape z dokumentu decyzji
 *
 * node scripts/fix-regan-crooks.mjs          # diagnoza
 * node scripts/fix-regan-crooks.mjs --apply  # napraw
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

async function ocrExtract(buffer, typPliku, filename) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const isPdf = typPliku === "pdf";
  const mediaType = typPliku === "png" ? "image/png" : "image/jpeg";
  const base64 = Buffer.from(buffer).toString("base64");

  const prompt = `Ten obraz/plik to strona polskiego dokumentu imigracyjnego (decyzja o karcie pobytu).

ZADANIE: Wyciagnij dane i zwroc TYLKO JSON:

{"stanowisko":"...","rodzajUmowy":"...","wynagrodzenie":"...","wymiarCzasu":"...","stawkaMiesieczna":null,"stawkaGodzinowa":null}

ZASADY:
1. Dane bierz WYŁĄCZNIE z SENTENCJI (po "postanawiam"/"orzekam"/"udzielam"). NIGDY z UZASADNIENIA.
2. wynagrodzenie = dokładny cytat z sentencji (np. "za wynagrodzeniem nie niższym niż 4300 zł brutto miesięcznie")
3. Jeśli kwota jest MIESIĘCZNA → stawkaMiesieczna = liczba (np. 4300)
4. Jeśli kwota jest GODZINOWA → stawkaGodzinowa = liczba, stawkaMiesieczna = null
5. wymiarCzasu = np. "100 godzin miesięcznie", "pełny etat"
6. stanowisko = z sentencji ("na stanowisku" lub "rodzaj pracy")
7. rodzajUmowy = np. "umowa o dzieło", "umowa zlecenie", "umowa o pracę" — z sentencji
8. Pola nieznalezione = null.`;

  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

  let response;
  if (isPdf) {
    response = await client.beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      betas: ["pdfs-2024-09-25"],
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
    });
  } else {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
    });
  }

  const fullText = response.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
  console.log("  RAW:", fullText.substring(0, 400));

  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
}

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DIAGNOZA"}\n`);

  // === REGAN #421 ===
  console.log("=== REGAN (id=175) — rescrape att decyzji ===");
  // Find his KP decision attachment
  const reganAtts = await db.fdkAttachment.findMany({
    where: { foreignerId: 175, kategoria: { in: ["glowne", "trc"] } },
  });
  const reganDecision = reganAtts.find((a) => /decyzj|kart.*pobytu/i.test(a.nazwaPliku) && a.typPliku === "pdf");

  if (reganDecision) {
    console.log(`  Załącznik: ${reganDecision.nazwaPliku} (${reganDecision.typPliku})`);
    const { data: fileData } = await supabase.storage.from(BUCKET).download(reganDecision.storagePath);
    if (fileData) {
      const buffer = await fileData.arrayBuffer();
      const data = await ocrExtract(buffer, reganDecision.typPliku, reganDecision.nazwaPliku);
      if (data) {
        console.log("  WYNIK:", JSON.stringify(data, null, 2));
        if (DO_APPLY) {
          const update = {};
          if (data.stawkaMiesieczna) update.stawka = data.stawkaMiesieczna;
          else if (data.stawkaGodzinowa && data.wymiarCzasu) {
            // Przelicz: godzinowa × wymiar
            const hourMatch = data.wymiarCzasu.match(/(\d+)\s*godzin/i);
            if (hourMatch) {
              update.stawka = data.stawkaGodzinowa * parseInt(hourMatch[1], 10);
              update.wynagrodzenie = `${update.stawka} zł/mies. (${data.stawkaGodzinowa} zł/h × ${hourMatch[1]} h)`;
            }
          }
          if (data.rodzajUmowy) update.rodzajUmowy = data.rodzajUmowy;
          if (Object.keys(update).length > 0) {
            console.log("  UPDATE:", update);
            await db.fdkEmploymentBase.update({ where: { id: 421 }, data: update });
            await db.fdkChangeLog.create({
              data: {
                foreignerId: 175,
                changedBy: "fix-regan-crooks",
                field: "employment_base_fix",
                oldValue: "stawka=21",
                newValue: `Poprawiono stawkę z rescrape: ${JSON.stringify(update)}`,
              },
            });
          }
        }
      }
    }
  } else {
    // Try any decision-like file
    console.log("  Brak PDF decyzji, szukam obrazów...");
    const imgDecision = reganAtts.find((a) => /decyzj/i.test(a.nazwaPliku));
    if (imgDecision) {
      console.log(`  Załącznik: ${imgDecision.nazwaPliku} (${imgDecision.typPliku})`);
      const { data: fileData } = await supabase.storage.from(BUCKET).download(imgDecision.storagePath);
      if (fileData) {
        const buffer = await fileData.arrayBuffer();
        const data = await ocrExtract(buffer, imgDecision.typPliku, imgDecision.nazwaPliku);
        if (data) {
          console.log("  WYNIK:", JSON.stringify(data, null, 2));
          if (DO_APPLY && data.stawkaMiesieczna) {
            await db.fdkEmploymentBase.update({ where: { id: 421 }, data: { stawka: data.stawkaMiesieczna, rodzajUmowy: data.rodzajUmowy || null } });
          }
        }
      }
    }
  }

  // === CROOKS #1241 ===
  console.log("\n=== CROOKS (id=183) — rescrape decyzji ===");
  const crooksAtts = await db.fdkAttachment.findMany({
    where: { foreignerId: 183, kategoria: { in: ["glowne", "trc"] } },
  });
  const crooksDecision = crooksAtts.find((a) => /decyzj.*2025.*2028/i.test(a.nazwaPliku));

  if (crooksDecision) {
    console.log(`  Załącznik: ${crooksDecision.nazwaPliku} (${crooksDecision.typPliku})`);
    const { data: fileData } = await supabase.storage.from(BUCKET).download(crooksDecision.storagePath);
    if (fileData) {
      const buffer = await fileData.arrayBuffer();
      const data = await ocrExtract(buffer, crooksDecision.typPliku, crooksDecision.nazwaPliku);
      if (data) {
        console.log("  WYNIK:", JSON.stringify(data, null, 2));
        if (DO_APPLY) {
          const update = {};
          if (data.stawkaMiesieczna) update.stawka = data.stawkaMiesieczna;
          else if (data.stawkaGodzinowa && data.wymiarCzasu) {
            const hourMatch = data.wymiarCzasu.match(/(\d+)\s*godzin/i);
            if (hourMatch) {
              update.stawka = data.stawkaGodzinowa * parseInt(hourMatch[1], 10);
              update.wynagrodzenie = `${update.stawka} zł/mies. (${data.stawkaGodzinowa} zł/h × ${hourMatch[1]} h)`;
            }
          }
          if (data.rodzajUmowy) update.rodzajUmowy = data.rodzajUmowy;
          if (Object.keys(update).length > 0) {
            console.log("  UPDATE:", update);
            await db.fdkEmploymentBase.update({ where: { id: 1241 }, data: update });
            await db.fdkChangeLog.create({
              data: {
                foreignerId: 183,
                changedBy: "fix-regan-crooks",
                field: "employment_base_fix",
                oldValue: "stawka=null, rodzajUmowy=null",
                newValue: `Uzupełniono z rescrape: ${JSON.stringify(update)}`,
              },
            });
          }
        }
      }
    }
  }

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
