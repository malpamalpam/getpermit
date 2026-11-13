/**
 * Bulk restore residence bases for all foreigners with valid permit but 0 bases.
 *
 * Strategy:
 *   For each affected foreigner:
 *   1. Look for TRC employment bases with full period (dataOd+dataDo) — use those directly
 *   2. If none, check fdk_attachments for TRC type — re-scrape to extract data
 *   3. Last resort: create skeleton from decyzjaPobytowaDo flat field (no nrDecyzji)
 *
 * Usage:
 *   node scripts/restore-residence-bases.mjs           # dry run + report
 *   node scripts/restore-residence-bases.mjs --apply   # apply
 *   node scripts/restore-residence-bases.mjs --apply --skip-scrape  # skip OCR
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const SKIP_SCRAPE = process.argv.includes("--skip-scrape");
const BUCKET = "fdk-attachments";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TRC_EMP_TYPES = [
  "TRC_FDK", "TRC_INNY_PRACODAWCA", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ",
  "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC",
  "TRC_INNE_OKOLICZNOSCI", "TRC_BLUE_CARD", "KARTA_POBYTU", "BLUE_CARD",
];

const OCR_PROMPT = `Ten obraz to strona polskiego dokumentu imigracyjnego (decyzja pobytowa lub karta pobytu).

ZADANIE: Wyciagnij dane i zwroc TYLKO JSON:
{"detectedType":"TRC_FDK","dataOd":"YYYY-MM-DD","dataDo":"YYYY-MM-DD","nrDecyzji":"...","urzad":"...","nrKartyPobytu":"..."}

ZASADY:
1. dataOd = data z naglowka decyzji lub data wydania karty.
2. dataDo = "do dnia" z sentencji lub data waznosci karty.
3. nrDecyzji = sygnatura z naglowka (WSC-..., DL.WIPO..., SC-...). Dla kart pobytu = nr na karcie (RS/RR...).
4. urzad = organ wydajacy ("Wojewoda Mazowiecki" itp.).
5. detectedType: TRC_FDK / TRC_INNY_PRACODAWCA / TRC_BLUE_CARD / TRC_HUMANITARNE / TRC_STUDIA / TRC_ABSOLWENT / TRC_POBYT_Z_CUDZ / TRC_MALZONEK_PL / TRC_DZIALALNOSC / TRC_INNE_OKOLICZNOSCI / KARTA_POBYTU.

Pola nieznalezione = null.`;

async function rescrapeForResidence(att) {
  try {
    const { data: fileData, error } = await supabase.storage.from(BUCKET).download(att.sciezkaPliku);
    if (error || !fileData) return null;
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const ext = att.nazwaPliku.split(".").pop()?.toLowerCase() ?? "pdf";
    const mimeMap = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
    const mediaType = mimeMap[ext] ?? "application/pdf";
    const base64 = buffer.toString("base64");
    const isPdf = mediaType === "application/pdf";
    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

    const response = isPdf
      ? await anthropic.beta.messages.create({ model: "claude-sonnet-4-6", max_tokens: 512, betas: ["pdfs-2024-09-25"], messages: [{ role: "user", content: [contentBlock, { type: "text", text: OCR_PROMPT }] }] })
      : await anthropic.messages.create({ model: "claude-sonnet-4-6", max_tokens: 512, messages: [{ role: "user", content: [contentBlock, { type: "text", text: OCR_PROMPT }] }] });

    const rawText = response.content.find((c) => c.type === "text")?.text ?? "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function main() {
  console.log(`=== RESTORE RESIDENCE BASES === ${APPLY ? "APPLY" : "DRY RUN"}${SKIP_SCRAPE ? " --skip-scrape" : ""}\n`);

  const now = new Date();

  // Find all foreigners with valid permit but 0 residence bases
  const affected = await db.fdkForeigner.findMany({
    where: { decyzjaPobytowaDo: { gt: now } },
    select: {
      id: true, imie: true, nazwisko: true, decyzjaPobytowaDo: true,
      _count: { select: { residenceBases: true } },
    },
    orderBy: { decyzjaPobytowaDo: "desc" },
  });
  const toFix = affected.filter((f) => f._count.residenceBases === 0);

  console.log(`Affected: ${toFix.length} foreigners (of ${affected.length} with valid permit)\n`);

  const report = [];
  let createdFromBase = 0, createdFromScrape = 0, createdFromFlat = 0, skipped = 0;

  for (const f of toFix) {
    const name = `${f.imie ?? ""} ${f.nazwisko}`.trim();

    // Strategy 1: TRC employment base with full period
    const trcBases = await db.fdkEmploymentBase.findMany({
      where: {
        foreignerId: f.id,
        typ: { in: TRC_EMP_TYPES },
        dataOd: { not: null },
        dataDo: { not: null },
      },
      orderBy: { dataDo: "desc" },
    });

    if (trcBases.length > 0) {
      const best = trcBases[0]; // most recent
      const entry = {
        id: f.id, name,
        strategy: "from_employment_base",
        typ: best.typ, dataOd: best.dataOd?.toISOString().slice(0,10),
        dataDo: best.dataDo?.toISOString().slice(0,10),
        nrDecyzji: best.nrDecyzji, urzad: best.urzad,
      };
      report.push(entry);
      console.log(`  /${f.id} ${name} → [EMP] ${best.typ} ${entry.dataOd}–${entry.dataDo} nr=${best.nrDecyzji ?? "-"}`);
      if (APPLY) {
        await db.fdkResidenceBasis.create({
          data: {
            foreignerId: f.id,
            typ: best.typ,
            status: "AKTYWNE",
            dataOd: best.dataOd,
            dataDo: best.dataDo,
            nrDecyzji: best.nrDecyzji ?? null,
            urzad: best.urzad ?? null,
            sourceAttachmentId: best.sourceAttachmentId ?? null,
          },
        });
        createdFromBase++;
      }
      continue;
    }

    // Strategy 2: TRC attachment → re-scrape
    if (!SKIP_SCRAPE) {
      const trcAtt = await db.fdkAttachment.findFirst({
        where: {
          foreignerId: f.id,
          detectedType: { in: TRC_EMP_TYPES },
          folder: "wazne",
        },
        orderBy: { id: "desc" },
      });
      if (trcAtt) {
        console.log(`  /${f.id} ${name} → [OCR] att #${trcAtt.id} ${trcAtt.nazwaPliku}`);
        const parsed = await rescrapeForResidence(trcAtt);
        if (parsed && parsed.detectedType && (parsed.dataOd || parsed.dataDo)) {
          const entry = {
            id: f.id, name,
            strategy: "from_scrape",
            typ: parsed.detectedType, dataOd: parsed.dataOd,
            dataDo: parsed.dataDo, nrDecyzji: parsed.nrDecyzji, urzad: parsed.urzad,
          };
          report.push(entry);
          console.log(`    → ${parsed.detectedType} ${parsed.dataOd}–${parsed.dataDo} nr=${parsed.nrDecyzji ?? "-"}`);
          if (APPLY) {
            await db.fdkResidenceBasis.create({
              data: {
                foreignerId: f.id,
                typ: parsed.detectedType,
                status: "AKTYWNE",
                dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
                dataDo: parsed.dataDo ? new Date(parsed.dataDo) : null,
                nrDecyzji: parsed.nrDecyzji ?? null,
                urzad: parsed.urzad ?? null,
                nrKartyPobytu: parsed.nrKartyPobytu ?? null,
                sourceAttachmentId: trcAtt.id,
              },
            });
            createdFromScrape++;
          }
          continue;
        }
      }
    }

    // Strategy 3: flat field — skeleton only (no nr, no urzad)
    // Use decyzjaPobytowaDo as dataDo; dataOd unknown — leave null
    const entry = {
      id: f.id, name,
      strategy: "from_flat_field",
      typ: "KARTA_POBYTU", dataOd: null,
      dataDo: f.decyzjaPobytowaDo?.toISOString().slice(0,10),
      nrDecyzji: null, urzad: null,
    };
    report.push(entry);
    console.log(`  /${f.id} ${name} → [FLAT] KARTA_POBYTU do ${entry.dataDo} (brak nr/urzad)`);
    if (APPLY) {
      await db.fdkResidenceBasis.create({
        data: {
          foreignerId: f.id,
          typ: "KARTA_POBYTU",
          status: "BRAK_DANYCH",
          dataOd: null,
          dataDo: f.decyzjaPobytowaDo,
          nrDecyzji: null,
          urzad: null,
        },
      });
      createdFromFlat++;
    }
  }

  // Final verification
  if (APPLY) {
    const stillMissing = await db.fdkForeigner.count({
      where: {
        decyzjaPobytowaDo: { gt: now },
        residenceBases: { none: {} },
      },
    });
    console.log(`\n=== RESULT ===`);
    console.log(`  Created from employment base: ${createdFromBase}`);
    console.log(`  Created from re-scrape:       ${createdFromScrape}`);
    console.log(`  Created from flat field:      ${createdFromFlat}`);
    console.log(`  Still missing:                ${stillMissing}`);
  }

  // Write report
  const rows = ["id,name,strategy,typ,dataOd,dataDo,nrDecyzji,urzad"];
  for (const r of report) {
    rows.push(`${r.id},"${r.name}",${r.strategy},${r.typ ?? ""},${r.dataOd ?? ""},${r.dataDo ?? ""},${r.nrDecyzji ?? ""},${r.urzad ?? ""}`);
  }
  writeFileSync("raport-r9-residence-restore.csv", rows.join("\n"));
  console.log(`\nRaport: raport-r9-residence-restore.csv (${report.length} wierszy)`);

  if (!APPLY) console.log("\n--- DRY RUN. Uruchom z --apply. ---");
  await db.$disconnect();
}

main().catch(console.error);
