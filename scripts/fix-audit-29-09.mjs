/**
 * Audit fix 29.09 — 4 klasy problemów:
 * 1. Fałszywe flagi "inna osoba" (cyrylica, kraje, etykiety) → zdejmij + rescrapuj
 * 2. Prawdziwe flagi cudzych dokumentów → CSV dla działu
 * 3. Daty od>do (swap) + bazy bez żadnej daty
 * 4. Duplikaty numerów dokumentów (dedupe)
 *
 * Usage:
 *   node scripts/fix-audit-29-09.mjs              # dry-run
 *   node scripts/fix-audit-29-09.mjs --run         # execute
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const db = new PrismaClient();
const CHANGED_BY = "fix-audit-29-09";
const DO_RUN = process.argv.includes("--run");

const JUNK_NAME_RE = [/nazwisk\w*\s+nadawc/i, /imi[eę]\s+i?\s*nazwisk/i, /nadawc[aey]/i, /podpis\s+osoby/i, /pe[lł]nomocnik/i, /adresat/i, /wnioskodawc/i, /cudzoziemiec/i, /strona\s+post[eę]powan/i, /lub\s+imion/i, /^pan[aiu]?\s+/i, /^republik/i, /po[łl]udniow/i, /federacj/i, /rosyjsk/i, /rzeczpospolit/i, /wielk\w+\s+brytan/i, /zjednoczon\w+\s+kr[oó]lestw/i, /stan[yó]\s+zjednoczon/i, /ameryk/i, /zimbabwe/i, /armeni/i, /^ukrain/i, /^indie\b|^indii\b/i, /^nr\s+/i, /^data\s+/i, /organ\s+wydaj/i];

const CYR_MAP = {"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"kh","ц":"ts","ч":"ch","ш":"sh","щ":"shch","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya"};
function translitCyrillic(text) { return text.split("").map(c => { const l = c.toLowerCase(); return CYR_MAP[l] !== undefined ? CYR_MAP[l] : c; }).join(""); }
function hasCyrillic(text) { return /[\u0400-\u04FF]/.test(text); }

function normalizeTokens(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-_]/g, " ").split(/\s+/).filter(Boolean).sort();
}
function tokensMatch(a, b) {
  const ta = normalizeTokens(a);
  const tb = normalizeTokens(b);
  if (ta.length === 0 || tb.length === 0) return true;
  let m = 0;
  for (const t of ta) { for (const p of tb) { if (t === p || (t.length >= 3 && p.length >= 3 && (t.startsWith(p.substring(0,3)) || p.startsWith(t.substring(0,3))))) { m++; break; } } }
  return m > 0;
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  AUDIT FIX 29.09`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "DRY-RUN"}`);
  console.log(`${"=".repeat(60)}\n`);

  // ===================================================================
  // 1. Fałszywe flagi
  // ===================================================================
  console.log("--- 1. Fałszywe flagi 'inna osoba' ---");
  const flagged = await db.fdkAttachment.findMany({
    where: { opis: { startsWith: "\u26a0" } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });
  let falseFlags = 0;
  let trueFlags = 0;
  const trueFlagList = [];

  for (const att of flagged) {
    const match = att.opis.match(/Dokument innej osoby:\s*(.+)/);
    if (!match) continue;
    let extractedName = match[1].trim();
    const profileName = `${att.foreigner.imie ?? ""} ${att.foreigner.nazwisko}`.trim();

    // Check junk patterns
    const isJunk = JUNK_NAME_RE.some(p => p.test(extractedName));

    // Check Cyrillic transliteration match
    let isCyrillicMatch = false;
    if (hasCyrillic(extractedName)) {
      const translit = translitCyrillic(extractedName);
      if (tokensMatch(translit, profileName)) {
        isCyrillicMatch = true;
      }
    }

    if (isJunk || isCyrillicMatch) {
      console.log(`  [FALSE] #${att.id} [${profileName}] ${att.nazwaPliku} → "${extractedName}" (${isJunk ? "junk" : "cyrillic match"})`);
      falseFlags++;
      if (DO_RUN) {
        await db.fdkAttachment.update({ where: { id: att.id }, data: { opis: null } });
      }
    } else {
      trueFlags++;
      trueFlagList.push({
        attachmentId: att.id,
        foreignerId: att.foreigner.id,
        profileName,
        fileName: att.nazwaPliku,
        extractedName,
      });
    }
  }
  console.log(`  Fałszywe flagi zdjęte: ${falseFlags}`);
  console.log(`  Prawdziwe flagi (cudze dokumenty): ${trueFlags}\n`);

  // ===================================================================
  // 2. CSV cudzych dokumentów
  // ===================================================================
  console.log("--- 2. CSV cudzych dokumentów ---");
  if (trueFlagList.length > 0) {
    // Check if extracted person exists in DB
    const allForeigners = await db.fdkForeigner.findMany({ select: { id: true, imie: true, nazwisko: true } });
    const csvLines = ["attachment_id;foreigner_id;profil;plik;wykryta_osoba;znaleziony_profil;propozycja"];
    for (const flag of trueFlagList) {
      // Try to find the extracted person in DB
      const foundMatch = allForeigners.find(f => {
        const fn = `${f.imie ?? ""} ${f.nazwisko}`.trim();
        return tokensMatch(flag.extractedName, fn);
      });
      const proposal = foundMatch ? `Przenieś na profil id=${foundMatch.id} (${foundMatch.imie} ${foundMatch.nazwisko})` : "Osoba nie znaleziona w bazie";
      csvLines.push([flag.attachmentId, flag.foreignerId, flag.profileName, flag.fileName, flag.extractedName, foundMatch ? `id=${foundMatch.id}` : "-", proposal].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    }
    fs.writeFileSync("raport-cudze-dokumenty.csv", csvLines.join("\n"), "utf-8");
    console.log(`  Raport: raport-cudze-dokumenty.csv (${trueFlagList.length} pozycji)\n`);
  }

  // ===================================================================
  // 3. Daty od > do (swap)
  // ===================================================================
  console.log("--- 3. Daty od > do ---");
  const swapBases = await db.fdkEmploymentBase.findMany({
    where: { dataOd: { not: null }, dataDo: { not: null } },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
  });
  let swapCount = 0;
  for (const b of swapBases) {
    if (b.dataOd && b.dataDo && b.dataOd > b.dataDo) {
      const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
      const od = b.dataOd.toISOString().slice(0, 10);
      const doo = b.dataDo.toISOString().slice(0, 10);
      console.log(`  #${b.id} [${name}] ${od} > ${doo} → SWAP`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.update({ where: { id: b.id }, data: { dataOd: b.dataDo, dataDo: b.dataOd } });
      }
      swapCount++;
    }
  }
  console.log(`  Zamienione: ${swapCount}\n`);

  // ===================================================================
  // 4. Duplikaty numerów dokumentów
  // ===================================================================
  console.log("--- 4. Duplikaty numerów dokumentów ---");
  // Find bases with same foreignerId + typ + nrDecyzji (or nrOswiadczenia)
  const allBases = await db.fdkEmploymentBase.findMany({
    where: { OR: [{ nrDecyzji: { not: null } }, { nrOswiadczenia: { not: null } }] },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true } } },
    orderBy: [{ foreignerId: "asc" }, { typ: "asc" }, { id: "asc" }],
  });

  const seen = new Map(); // key → base (keep the more complete one)
  let dedupCount = 0;
  for (const b of allBases) {
    const nr = b.nrDecyzji || b.nrOswiadczenia || "";
    if (!nr) continue;
    const key = `${b.foreignerId}|${b.typ}|${nr}`;
    if (seen.has(key)) {
      const existing = seen.get(key);
      const name = `${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}`.trim();
      // Keep the one with more data (more non-null fields)
      const countFields = (base) => [base.dataOd, base.dataDo, base.stanowisko, base.firma, base.wynagrodzenie].filter(Boolean).length;
      const keepId = countFields(b) > countFields(existing) ? b.id : existing.id;
      const deleteId = keepId === b.id ? existing.id : b.id;
      console.log(`  [DEDUP] ${name}: #${deleteId} duplikat #${keepId} (${b.typ} nr=${nr})`);
      if (DO_RUN) {
        await db.fdkEmploymentBase.delete({ where: { id: deleteId } });
        await db.fdkChangeLog.create({
          data: { foreignerId: b.foreignerId, changedBy: CHANGED_BY, field: "employment_base_delete",
            oldValue: `#${deleteId}`, newValue: `Dedupe — duplikat #${keepId} (${b.typ} nr=${nr})` },
        });
      }
      dedupCount++;
      // Update seen with the kept one
      seen.set(key, countFields(b) > countFields(existing) ? b : existing);
    } else {
      seen.set(key, b);
    }
  }
  console.log(`  Usunięte duplikaty: ${dedupCount}\n`);

  // Summary
  console.log(`${"=".repeat(60)}`);
  console.log(`  Fałszywe flagi: ${falseFlags}`);
  console.log(`  Cudze dokumenty (CSV): ${trueFlags}`);
  console.log(`  Daty od>do swap: ${swapCount}`);
  console.log(`  Duplikaty nr: ${dedupCount}`);
  console.log(`${"=".repeat(60)}\n`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
