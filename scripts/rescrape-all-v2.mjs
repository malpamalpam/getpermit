/**
 * Rescrape ALL existing bases — re-process source attachments with parser v2.
 * Applies: article-based classification, dual base creation, indefinite status,
 * date source rules, UKR protection flag.
 *
 * Does NOT delete existing bases — only updates types and creates missing secondary bases.
 *
 * Usage:
 *   node scripts/rescrape-all-v2.mjs                          # dry-run (plan only)
 *   node scripts/rescrape-all-v2.mjs --run                    # execute
 *   node scripts/rescrape-all-v2.mjs --run --resume           # resume from checkpoint
 *   node scripts/rescrape-all-v2.mjs --run --only 280,63,190  # specific profile IDs
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const db = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = "fdk-attachments";
const CHANGED_BY = "rescrape-all-v2";
const CHECKPOINT_FILE = "rescrape-v2-checkpoint.json";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const DO_RESUME = args.includes("--resume");
const onlyIdx = args.indexOf("--only");
const ONLY_IDS = onlyIdx >= 0 ? args[onlyIdx + 1].split(",").map(Number) : null;
const REPORT_FILE = "raport-rescrape-v2.csv";

// ==================== RESIDENCE / WORK BASE TYPES ====================
const WORK_BASE_TYPES = new Set([
  "ZEZWOLENIE", "ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT",
  "OSWIADCZENIE", "ZGLOSZENIE_UA", "POWIADOMIENIE_UA",
]);
const RESIDENCE_BASE_TYPES = new Set([
  "KARTA_POBYTU", "TRC_FDK", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ",
  "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC",
  "TRC_BLUE_CARD", "BLUE_CARD",
  "OD_UE", "OD_STUDENT", "OD_POBYT_STALY", "OD_REZYDENT_UE",
  "OD_KARTA_POLAKA", "OD_OCHRONA_UZUP", "OD_UCHODZCA",
  "OD_WIZA_HUMAN", "OD_ABSOLWENT", "OD_UK_WYSTAPIENIE",
]);

// ==================== CLASSIFIER (inline — matches document-classifier.ts) ====================
function classifyFromText(sentencja) {
  const result = { type: null, secondaryType: null, isIndefinite: false, dateSource: "issue_date", setsUkrProtection: false };
  const artMatch = sentencja.match(/art(?:yku[łl])?\.\s*(\d+)/i);
  const art = artMatch ? artMatch[1] : null;

  if (/odwo[łl]anie\s+od\s+decyzji|za[żz]alenie/i.test(sentencja)) {
    result.type = "ODWOLANIE"; return result;
  }
  if (/status(?:u)?\s+uchod[źz]c/i.test(sentencja)) {
    if (/odmówi[ćc].*uchod[źz]c/i.test(sentencja) && /udzi[eę]li[ćc].*ochrony\s+uzupe[łl]niaj/i.test(sentencja)) {
      result.type = "OD_OCHRONA_UZUP";
    } else {
      result.type = "OD_UCHODZCA";
    }
    result.isIndefinite = true; return result;
  }
  if (/ochrony?\s+uzupe[łl]niaj/i.test(sentencja)) {
    result.type = "OD_OCHRONA_UZUP"; result.isIndefinite = true; return result;
  }
  if (/PSZ[\s-]*OP[WP]C|PSZ[\s-]*OPWP|PSZ[\s-]*ZOPP|o[śs]wiadczenie\s+podmiotu\s+.*powierzeni/i.test(sentencja)) {
    result.type = "OSWIADCZENIE"; result.dateSource = "annotation"; return result;
  }
  if (/powiadomi\w*\s+o\s+powierzeni|zg[lł]oszeni\w*\s+(?:o\s+)?powierzeni|PSZ[\s-]*PPWPU/i.test(sentencja)) {
    result.type = "POWIADOMIENIE_UA"; result.setsUkrProtection = true; return result;
  }
  if (/pobyt(?:u)?\s+sta[łl]e(?:go)?/i.test(sentencja) || art === "195" || art === "201") {
    result.type = "OD_POBYT_STALY"; result.isIndefinite = true; return result;
  }
  if (/rezydent\w*\s+d[łl]ugoterminow/i.test(sentencja) || art === "211" || art === "218") {
    result.type = "OD_REZYDENT_UE"; result.isIndefinite = true; return result;
  }
  if (/niebieska\s+karta|blue\s+card|wysoki(?:ch|e)\s+kwalifikacj|art\.?\s*127/i.test(sentencja)) {
    result.type = "TRC_BLUE_CARD"; result.secondaryType = "ZEZWOLENIE_A"; return result;
  }
  if (/zarejestrowani\w*\s+pobytu\s+obywatel/i.test(sentencja) || /dyrektywa?\s+2004\/38/i.test(sentencja)) {
    if (/art\.?\s*50\s+TUE|umow[aey]\s+wyst[aą]pieni/i.test(sentencja)) {
      result.type = "OD_UK_WYSTAPIENIE";
    } else {
      result.type = "OD_UE";
    }
    return result;
  }
  if (/kart[aęy]\s+pobytu|zezwoleni[eao]\s+na\s+pobyt\s+czasow|udzi[eę]l\w+\s+zezwoleni\w+\s+na\s+pobyt/i.test(sentencja)) {
    if (art === "114" || /na\s+rzecz|podmiot\w*[:\s]/i.test(sentencja)) {
      result.type = "TRC_FDK"; result.secondaryType = "ZEZWOLENIE_A";
      if (/art\.?\s*3\s+ust\.?\s*5\s+pkt\.?\s*2/i.test(sentencja)) result.secondaryType = "OD_ABSOLWENT";
      if (/art\.?\s*22\s+ust/i.test(sentencja)) { result.secondaryType = null; result.setsUkrProtection = true; }
    } else if (art === "127") {
      result.type = "TRC_BLUE_CARD"; result.secondaryType = "ZEZWOLENIE_A";
    } else if (art === "144" || /studi[aóo]w|kszta[łl]ceni/i.test(sentencja)) {
      result.type = "TRC_STUDIA"; result.secondaryType = "OD_STUDENT";
    } else if (art === "158" || /ma[łl][żz]on/i.test(sentencja)) {
      result.type = "TRC_MALZONEK_PL";
    } else if (art === "159" || /rodzin|po[łl][aą]czeni\w*\s+z\s+rodzin/i.test(sentencja)) {
      result.type = "TRC_POBYT_Z_CUDZ";
    } else if (/humanitarn/i.test(sentencja) || (art === "186" && /pkt\.?\s*9/i.test(sentencja))) {
      result.type = "TRC_HUMANITARNE";
    } else if (art === "186" && /pkt\.?\s*6/i.test(sentencja)) {
      result.type = "TRC_FDK"; result.secondaryType = "OD_POBYT_STALY";
    } else if (/dzia[łl]alno[śs]/i.test(sentencja)) {
      result.type = "TRC_DZIALALNOSC";
    } else {
      result.type = "KARTA_POBYTU";
    }
    return result;
  }
  if (/zezwoleni[eao]\s+na\s+prac[ęe]/i.test(sentencja)) {
    result.type = "ZEZWOLENIE_A"; result.dateSource = "od_do_clause";
    if (/art\.?\s*3\s+ust\.?\s*5\s+pkt\.?\s*2/i.test(sentencja)) result.secondaryType = "OD_ABSOLWENT";
    return result;
  }
  return result;
}

// ==================== MAIN ====================
async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  RESCRAPE ALL v2 — article classifier + dual base`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Load checkpoint
  let doneIds = new Set();
  if (DO_RESUME && fs.existsSync(CHECKPOINT_FILE)) {
    doneIds = new Set(JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf-8")).done || []);
    console.log(`Wznowienie — ${doneIds.size} profili juz przetworzonych.\n`);
  }

  // Get all scrape logs to find source attachment filenames → base IDs
  const scrapeLogs = await db.fdkChangeLog.findMany({
    where: { field: "scrape", newValue: { contains: "pliku:" } },
    select: { foreignerId: true, newValue: true },
  });

  // Build: foreignerId → [{baseId, fileName}]
  const baseSourceMap = new Map();
  for (const log of scrapeLogs) {
    const m = log.newValue?.match(/podstaw[eę]\s+#(\d+)\s+\(([^)]+)\)\s+z\s+pliku:\s+(.+)$/);
    if (!m) continue;
    const baseId = parseInt(m[1], 10);
    const fileName = m[3].trim();
    if (!baseSourceMap.has(log.foreignerId)) baseSourceMap.set(log.foreignerId, []);
    baseSourceMap.get(log.foreignerId).push({ baseId, fileName, baseType: m[2] });
  }

  // Get profiles to process
  let profileIds;
  if (ONLY_IDS) {
    profileIds = ONLY_IDS;
  } else {
    const profiles = await db.fdkForeigner.findMany({
      where: { hidden: false },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    profileIds = profiles.map(p => p.id);
  }

  console.log(`Profili do przetworzenia: ${profileIds.length}\n`);

  const csvLines = ["id;nazwisko;imie;akcja;stary_typ;nowy_typ;secondary_type;plik"];
  let totalUpdated = 0;
  let totalSecondary = 0;
  let totalIndefinite = 0;
  let processed = 0;

  for (const foreignerId of profileIds) {
    if (doneIds.has(foreignerId)) continue;

    const foreigner = await db.fdkForeigner.findUnique({
      where: { id: foreignerId },
      include: {
        employmentBases: true,
        attachments: { where: { typPliku: "pdf" } },
      },
    });
    if (!foreigner) continue;

    const personName = `${foreigner.imie ?? ""} ${foreigner.nazwisko}`.trim();
    const sources = baseSourceMap.get(foreignerId) || [];

    let profileChanged = false;

    // For each existing base, try to find source attachment and reclassify
    for (const base of foreigner.employmentBases) {
      // Find source file
      const source = sources.find(s => s.baseId === base.id);
      if (!source) continue;

      // Find attachment by filename
      const att = foreigner.attachments.find(a => a.nazwaPliku === source.fileName);
      if (!att) continue;

      // Download and parse
      let text = null;
      try {
        const { data: fileData } = await supabase.storage.from(BUCKET).download(att.storagePath);
        if (!fileData) continue;
        const buffer = await fileData.arrayBuffer();
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(Buffer.from(buffer));
        const meaningful = (pdfData.text ?? "").replace(/\s/g, "").length;
        if (meaningful < 200) continue;
        text = pdfData.text;
      } catch { continue; }

      const sentencja = text.split(/UZASADNIENIE/i)[0];
      const cls = classifyFromText(sentencja);

      if (!cls.type || cls.type === "ODWOLANIE") continue;

      // Check if type should change
      const oldType = base.typ;
      const newType = cls.type;
      const shouldUpdate = oldType !== newType && newType !== "KARTA_POBYTU"; // don't downgrade to generic

      if (shouldUpdate) {
        console.log(`  [${personName}] #${base.id}: ${oldType} → ${newType} (art.${cls.type})`);
        if (DO_RUN) {
          const updateData = { typ: newType };
          if (cls.isIndefinite) {
            updateData.status = "AKTYWNE";
            updateData.dataDo = null;
          }
          await db.fdkEmploymentBase.update({ where: { id: base.id }, data: updateData });
          await db.fdkChangeLog.create({
            data: { foreignerId, changedBy: CHANGED_BY, field: "employment_base_reclassify",
              oldValue: `#${base.id} ${oldType}`, newValue: `→ ${newType} (rescrape v2, article classifier)` },
          });
        }
        csvLines.push([foreignerId, foreigner.nazwisko, foreigner.imie ?? "", "reclassify", oldType, newType, "", source.fileName].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
        totalUpdated++;
        profileChanged = true;
      }

      // Check if indefinite needs fixing
      if (cls.isIndefinite && base.dataDo) {
        console.log(`  [${personName}] #${base.id}: indefinite — removing dataDo`);
        if (DO_RUN) {
          await db.fdkEmploymentBase.update({ where: { id: base.id }, data: { status: "AKTYWNE", dataDo: null } });
        }
        totalIndefinite++;
        profileChanged = true;
      }

      // Create secondary base if missing
      if (cls.secondaryType) {
        const hasSecondary = foreigner.employmentBases.some(b =>
          b.typ === cls.secondaryType && (
            (b.nrDecyzji && b.nrDecyzji === base.nrDecyzji) ||
            (b.dataOd?.getTime() === base.dataOd?.getTime() && b.dataDo?.getTime() === base.dataDo?.getTime())
          )
        );
        // Also check if ANY base of that type exists for this foreigner
        const hasAnyOfType = foreigner.employmentBases.some(b => b.typ === cls.secondaryType);

        if (!hasSecondary && !hasAnyOfType) {
          console.log(`  [${personName}] +${cls.secondaryType} (secondary from #${base.id})`);
          if (DO_RUN) {
            const secBase = await db.fdkEmploymentBase.create({
              data: {
                foreignerId,
                typ: cls.secondaryType,
                status: cls.isIndefinite ? "AKTYWNE" : (base.status === "AKTYWNE" ? "AKTYWNE" : "BRAK_DANYCH"),
                dataOd: base.dataOd,
                dataDo: cls.isIndefinite ? null : base.dataDo,
                stanowisko: base.stanowisko,
                firma: base.firma,
                rodzajUmowy: base.rodzajUmowy,
                nrDecyzji: base.nrDecyzji,
                wynagrodzenie: base.wynagrodzenie,
                stawka: base.stawka,
              },
            });
            await db.fdkChangeLog.create({
              data: { foreignerId, changedBy: CHANGED_BY, field: "scrape",
                oldValue: null, newValue: `Utworzono dodatkowa podstawe #${secBase.id} (${cls.secondaryType}) z rescrape v2` },
            });
          }
          csvLines.push([foreignerId, foreigner.nazwisko, foreigner.imie ?? "", "secondary", "", cls.secondaryType, base.typ, source.fileName].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
          totalSecondary++;
          profileChanged = true;
        }
      }

      // UKR protection
      if (cls.setsUkrProtection && !foreigner.ochronaCzasowaUkr && DO_RUN) {
        await db.fdkForeigner.update({ where: { id: foreignerId }, data: { ochronaCzasowaUkr: true } });
      }

      // Update residence
      if (RESIDENCE_BASE_TYPES.has(newType || oldType) && base.dataDo && DO_RUN) {
        const dataDo = base.dataDo;
        if (!foreigner.decyzjaPobytowaDo || dataDo > foreigner.decyzjaPobytowaDo) {
          await db.fdkForeigner.update({ where: { id: foreignerId }, data: { decyzjaPobytowaDo: dataDo } });
        }
      }
      if (cls.isIndefinite && RESIDENCE_BASE_TYPES.has(newType || oldType) && DO_RUN) {
        await db.fdkForeigner.update({ where: { id: foreignerId }, data: { decyzjaPobytowaDo: new Date("2099-12-31") } });
      }
    }

    if (profileChanged) {
      processed++;
      if (processed % 50 === 0) console.log(`  ... ${processed} profili zmienionych`);
    }

    doneIds.add(foreignerId);
    if (DO_RUN && processed % 20 === 0) {
      fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ done: [...doneIds] }), "utf-8");
    }
  }

  // Write report
  fs.writeFileSync(REPORT_FILE, csvLines.join("\n"), "utf-8");

  // Cleanup checkpoint
  if (DO_RUN && fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`  Reklasyfikowane: ${totalUpdated}`);
  console.log(`  Dodane secondary: ${totalSecondary}`);
  console.log(`  Indefinite poprawione: ${totalIndefinite}`);
  console.log(`  Raport: ${REPORT_FILE}`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
