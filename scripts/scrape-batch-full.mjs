/**
 * Batch-scrape all profiles that have attachments > 0 but zero bases.
 * Reuses the same classification/OCR pipeline as scrape-pending.mjs.
 *
 * Usage:
 *   node scripts/scrape-batch-full.mjs                              # plan only
 *   node scripts/scrape-batch-full.mjs --run                        # execute
 *   node scripts/scrape-batch-full.mjs --run --resume               # resume from checkpoint
 *   node scripts/scrape-batch-full.mjs --run --batch 50             # batch size (default 50)
 *   node scripts/scrape-batch-full.mjs --run --report raport-batch-full.csv
 *   node scripts/scrape-batch-full.mjs --no-attachments             # generate CSV of profiles with 0 attachments
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const db = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const BUCKET = "fdk-attachments";
const CHANGED_BY = "scrape-batch-full";
const CHECKPOINT_FILE = "scrape-batch-checkpoint.json";

const args = process.argv.slice(2);
const DO_RUN = args.includes("--run");
const DO_RESUME = args.includes("--resume");
const NO_ATTACHMENTS_MODE = args.includes("--no-attachments");
const reportIdx = args.indexOf("--report");
const REPORT_FILE = reportIdx >= 0 ? args[reportIdx + 1] : "raport-batch-full.csv";
const batchIdx = args.indexOf("--batch");
const BATCH_SIZE = batchIdx >= 0 ? parseInt(args[batchIdx + 1], 10) : 50;

// ==================== CLASSIFICATION RULES (same as scrape-pending) ====================

const SKIP_PATTERNS = [
  /paszport/i, /passport/i,
  /dow[oó]d[\s_]*osobist/i,
  /zdj[eę]ci/i, /photo/i,
  /piecz[aą]tk/i,
  /ankiet/i,
  /rodo/i, /informacja[\s_]*dla[\s_]*osoby[\s_]*fizycznej/i,
  /polityka[\s_]*bezpiecze/i,
  /porozumienie[\s_]*o[\s_]*wsp[oó][lł]administr/i,
  /umowa/i, /umow[aey]/i,
  /za[lł][aą]cznik[\s_]*nr/i,
  /foundation[\s_]*registration/i,
  /kwestionariusz/i,
  /pe[lł]nomocnictw/i,
  /dyplom/i, /certific/i, /tefl/i,
  /legitymac/i,
  /rachun/i,
  /rozw[ią]za/i,
  /op[lł]at/i, /zap[lł]at/i,
  /polisa/i,
  /statut/i,
  /ksi[aą][zż]eczk/i,
  /ks\.?\s*pracy/i,
  /pesel/i,
  /karta[\s_]*polak/i,
  /wiza/i, /visa/i,
  /t[lł]umaczeni/i, /translat/i,
  /WoPC[\s-]*zal/i,
  /urzedowe[\s_]*poswiadczeni/i, /urz[eę]dowe[\s_]*po[sś]wiadczeni/i,
  /za[sś]wiadczeni/i,
  /korekta/i,
  /zestaw[\s_]*trc/i,
  /draft/i,
  /do[sś]wiadczeni/i,
];

const HARD_SKIP_PATTERNS = [
  /wnios[ek]/i,
  /uzupe[lł]nienie|uzupelnienie/i,
  /wezwanie/i,
  /odpowied[źz]/i,
  /potwierdzeni/i,
  /confirmation/i,
  /\bUPO\b/i,
  /po[sś]wiadczenie/i,
  /\bSKM_/i,
  /pismo/i,
  /ponagleni/i,
  /rezerwacj/i,
  /zestaw[\s_]*dokument/i,
  /korespondencj/i,
];

const OCR_WORTH_PATTERNS = [
  /decyzj/i,
  /o[sś]wiadczeni/i,
  /kart[aey][\s_]*pobytu/i,
  /\bKP[\s_]/i, /\bKP_/i,
  /\btrc\b/i,
  /zezwoleni/i,
  /blue[\s_]*card/i,
  /zg[lł]oszeni/i,
  /podjęci/i, /podjeci/i,
  /niepodjęci/i, /niepodjeci/i,
  /PSZ/i, /OPWP/i, /PZC/i,
  /pobyt/i,
  /proceedings/i,
];

const SKIP_FOR_OCR = [
  /wiza/i, /visa/i,
  /karta[\s_]*polak/i,
  /legitymac/i,
];

function classifyFile(fileName, typPliku) {
  const name = fileName.toLowerCase();
  if (name.startsWith("._") || name.startsWith("~$")) return "skip";
  for (const pat of HARD_SKIP_PATTERNS) {
    if (pat.test(fileName)) return "skip";
  }
  for (const pat of SKIP_PATTERNS) {
    if (pat.test(fileName)) {
      const isOcrWorthy = OCR_WORTH_PATTERNS.some((p) => p.test(fileName));
      const isSkipForOcr = SKIP_FOR_OCR.some((p) => p.test(fileName));
      if (isOcrWorthy && !isSkipForOcr && !/rodo|informacja.*fizycznej|polityka.*bezpiecze|porozumienie.*administr/i.test(fileName)) {
        break;
      }
      return "skip";
    }
  }
  const isOcrWorthy = OCR_WORTH_PATTERNS.some((p) => p.test(fileName));
  if (typPliku === "pdf") {
    return isOcrWorthy ? "text_then_ocr" : "text_only";
  }
  if (["jpeg", "jpg", "png"].includes(typPliku)) {
    return isOcrWorthy ? "ocr" : "undecided";
  }
  return "skip";
}

// ==================== NAME MATCHING ====================

function normalizeNameTokens(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ").split(/\s+/).filter(Boolean).sort();
}

function namesMatchTokens(extractedName, profileName) {
  const extracted = normalizeNameTokens(extractedName);
  const profile = normalizeNameTokens(profileName);
  if (extracted.length === 0 || profile.length === 0) return true;
  let matchCount = 0;
  for (const et of extracted) {
    for (const pt of profile) {
      if (et === pt || (et.length >= 3 && pt.length >= 3 && (et.startsWith(pt.substring(0, 3)) || pt.startsWith(et.substring(0, 3))))) {
        matchCount++; break;
      }
    }
  }
  return matchCount > 0;
}

// ==================== JUNK NAME DETECTION ====================

/**
 * Detect OCR-hallucinated "names" that are actually form labels,
 * country names, or other non-person strings.
 * Returns true if the extracted name is junk and should be ignored.
 */
const JUNK_NAME_PATTERNS = [
  // Form labels
  /nazwisk\w*\s+nadawc/i,        // "Nazwisko Nadawcy"
  /imi[eę]\s+i?\s*nazwisk/i,     // "Imię i Nazwisko"
  /nadawc[aey]/i,                 // "Nadawca"
  /podpis\s+osoby/i,             // "Podpis osoby"
  /pe[lł]nomocnik/i,             // "Pełnomocnik" (but not a person name)
  /adresat/i,                     // "Adresat"
  /wnioskodawc/i,                 // "Wnioskodawca"
  /cudzoziemiec/i,                // "Cudzoziemiec"
  /strona\s+post[eę]powan/i,     // "Strona postępowania"
  // Country names / adjectives
  /^republik/i,
  /po[łl]udniow/i,               // "Południowej"
  /federacj/i,                   // "Federacji"
  /rosyjsk/i,
  /rzeczpospolit/i,
  // Generic junk
  /^nr\s+/i,                     // "Nr dokumentu"
  /^data\s+/i,                   // "Data wydania"
  /organ\s+wydaj/i,              // "Organ wydający"
];

function isJunkExtractedName(name) {
  if (!name || name.length < 3) return true;
  // Too short to be a real name
  const words = name.trim().split(/\s+/);
  if (words.length === 1 && words[0].length < 3) return true;
  // Match against junk patterns
  for (const pat of JUNK_NAME_PATTERNS) {
    if (pat.test(name)) return true;
  }
  // All-uppercase single word that looks like a label (e.g. "NADAWCA", "ADRESAT")
  if (words.length === 1 && name === name.toUpperCase() && name.length > 5) return true;
  return false;
}

// ==================== TRC SUBTYPE CLASSIFIER ====================

/** Work-permit base types */
const WORK_BASE_TYPES = new Set([
  "ZEZWOLENIE", "ZEZWOLENIE_A", "ZEZWOLENIE_A_KONT",
  "OSWIADCZENIE", "ZGLOSZENIE_UA", "POWIADOMIENIE_UA",
]);

/** Residence-permit base types */
const RESIDENCE_BASE_TYPES = new Set([
  "KARTA_POBYTU", "TRC_FDK", "TRC_HUMANITARNE", "TRC_POBYT_Z_CUDZ",
  "TRC_MALZONEK_PL", "TRC_STUDIA", "TRC_ABSOLWENT", "TRC_DZIALALNOSC",
  "TRC_BLUE_CARD", "BLUE_CARD",
  "OD_UE", "OD_STUDENT", "OD_POBYT_STALY", "OD_REZYDENT_UE",
  "OD_KARTA_POLAKA", "OD_OCHRONA_UZUP", "OD_UCHODZCA",
  "OD_WIZA_HUMAN", "OD_ABSOLWENT", "OD_UK_WYSTAPIENIE",
]);

/**
 * Classify TRC subtype from sentencja text.
 * Returns a more specific type if identifiable, otherwise KARTA_POBYTU.
 */
function classifyTrcSubtype(sentencja) {
  const s = sentencja.toLowerCase();
  if (/wysoki(?:ch|e)\s+kwalifikacj|niebieska\s+karta|blue\s+card|art\.?\s*127/i.test(s)) return "BLUE_CARD";
  if (/kszta[łl]ceni|studi[aóo]w|student/i.test(s)) return "TRC_STUDIA";
  if (/absolwent/i.test(s)) return "TRC_ABSOLWENT";
  if (/humanitarn/i.test(s)) return "TRC_HUMANITARNE";
  if (/rodzin|ma[łl][żz]on|po[łl][aą]czeni\w*\s+z\s+rodzin/i.test(s)) return "TRC_MALZONEK_PL";
  if (/pobyt\w*\s+z\s+cudzoziemcem|cudzoziemcem\s+zamieszkuj/i.test(s)) return "TRC_POBYT_Z_CUDZ";
  if (/dzia[łl]alno[śs][ćc]\s+gospodarcz/i.test(s)) return "TRC_DZIALALNOSC";
  // Default for unclassified TRC
  return "KARTA_POBYTU";
}

// ==================== JUNK VALUE DETECTION ====================

function isJunkFieldValue(value) {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  if (v.length === 0) return true;
  if (v.endsWith(":")) return true;
  if (/Imi[eę]\s*:|Nazwisko\s*:|rodzaj\s+pracy\s*:|podpis\s+osoby|Wnioskowana\s+liczba|i\s+podpis\s+osoby/i.test(v)) return true;
  const slashCount = (v.match(/\//g) ?? []).length;
  if (slashCount >= 2 && v.length > 40) return true;
  if (/^\s*\/\s*rodzaj\s+pracy/i.test(v)) return true;
  return false;
}

// ==================== BASIC TEXT PARSING ====================

function parseTextBasic(text, filename) {
  const result = {};
  const sentencja = text.split(/UZASADNIENIE/i)[0];

  if (/odwo[łl]anie\s+od\s+decyzji|za[żz]alenie|procedura\s+odwo[łl]awcz/i.test(sentencja)) {
    result.detectedType = "ODWOLANIE";
  } else if (/PSZ[\s-]*OPWP|o[śs]wiadczenie\s+podmiotu\s+.*powierzeni/i.test(sentencja)) {
    result.detectedType = "OSWIADCZENIE";
  } else if (/powiadomi\w*\s+o\s+powierzeni|zg[lł]oszeni\w*\s+(?:o\s+)?powierzeni|powiadomienie\s+PUP/i.test(sentencja)) {
    result.detectedType = "ZGLOSZENIE_UA";
  } else if (/niebieska\s+karta|blue\s+card|wysoki(?:ch|e)\s+kwalifikacj|art\.?\s*127/i.test(sentencja)) {
    result.detectedType = "BLUE_CARD";
  } else if (/kart[aęy]\s+pobytu|zezwoleni[eao]\s+na\s+pobyt\s+czasow/i.test(sentencja)) {
    // Use TRC subtype classifier
    result.detectedType = classifyTrcSubtype(sentencja);
  } else if (/wiz[aęy]\s+(?:krajow|schengeno|typu|nr)|decyzj\w+\s+wizow/i.test(sentencja)) {
    result.detectedType = "WIZA";
  } else if (/zezwoleni[eao]\s+na\s+prac[ęe]/i.test(sentencja)) {
    result.detectedType = "ZEZWOLENIE";
  }

  // Nr oswiadczenia
  const nrOswMatch = sentencja.match(/(?:PZC|OP\.G)[.\s]*\d{4}[.\s]*\d+[.\s]*\w*[.\s]*\d{4}/);
  if (nrOswMatch) result.nrOswiadczenia = nrOswMatch[0].trim();

  // Nr decyzji
  const nrDecMatch = sentencja.match(/(?:DL\.WII?PO|DL\.WIIPO)[.\s]*\d{4}[.\s]*\d+[.\s/]*[\w]*/);
  if (nrDecMatch) {
    result.nrDecyzji = nrDecMatch[0].trim();
  } else {
    const wscMatch = sentencja.match(/WSC[\w-]*[.\s]*\d{4}[.\s]*\d+[.\s]*\d{4}/);
    if (wscMatch) result.nrDecyzji = wscMatch[0].trim();
  }

  // Dates
  const datePattern = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/g;
  const dates = [];
  let m;
  while ((m = datePattern.exec(sentencja)) !== null) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1980 && y <= 2040) {
      dates.push(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  if (dates.length >= 2) {
    dates.sort();
    result.dataOd = dates[0];
    result.dataDo = dates[dates.length - 1];
  } else if (dates.length === 1) {
    result.dataOd = dates[0];
  }

  // Name
  const COUNTRY_WORDS = /^(?:Federacji|Rosyjskiej|Ukrainy|Indii|Turcji|Gruzji|Armenii|Mołdawii|Białorusi|Uzbekistanu|Kazachstanu|Republiki|Ludowej|Socjalistycznej)$/;
  const nameMatch = sentencja.match(/(?:cudzoziemcowi|cudzoziemca|obywatel(?:owi|a)?)\s*(?:[-–:]\s*)?([A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+)\s+([A-ZŻŹĆĄŚĘŁÓŃ][a-ząćęłńóśźż]+)/);
  if (nameMatch) {
    const w1 = nameMatch[1].trim();
    const w2 = nameMatch[2].trim();
    if (!COUNTRY_WORDS.test(w1) && !COUNTRY_WORDS.test(w2)) {
      result.imie = w1;
      result.nazwisko = w2;
    }
  }

  // Wynagrodzenie
  const wynMatch = sentencja.match(/(?:wynagrodzeni\w+|stawk\w+)\s+(?:nie\s+ni[zż]sz\w+\s+ni[zż]\s+)?(\d[\d\s,.]+)\s*(?:z[lł]|PLN)/i);
  if (wynMatch) {
    result.wynagrodzenie = wynMatch[1].replace(/\s/g, "").trim() + " PLN brutto";
  }

  // Stanowisko
  const stanMatch = sentencja.match(/stanowisk\w+[:\s]+([^\n,]+)/i);
  if (stanMatch) result.stanowisko = stanMatch[1].trim();

  // Firma
  const firmaMatch = sentencja.match(/(?:na rzecz|podmiot\w*)[:\s]+([^\n]+?)(?:\s*,\s*(?:ul|NIP|KRS|REGON))/i);
  if (firmaMatch) result.firma = firmaMatch[1].trim();

  // Obywatelstwo
  const obywMatch = sentencja.match(/obywatelstw\w+[:\s]+([A-ZŻŹĆĄŚĘŁÓŃa-ząćęłńóśźż]+)/i);
  if (obywMatch) {
    let cit = obywMatch[1].trim();
    if (cit.length > 2) result.obywatelstwo = cit;
  }

  return result;
}

// ==================== OCR VIA ANTHROPIC ====================

async function ocrExtract(buffer, isImage, isPdf, filename, apiKey, typPliku) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const maxBytes = isImage ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
  if (buffer.byteLength > maxBytes) {
    console.log(`    [OCR] Za duzy: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB (limit ${isImage ? "10" : "25"} MB)`);
    return null;
  }

  const base64 = Buffer.from(buffer).toString("base64");
  const useHaiku = !isPdf && buffer.byteLength > 2 * 1024 * 1024;
  const model = useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";

  const extractionPrompt = `Ten obraz/plik to strona polskiego dokumentu imigracyjnego. Obraz moze byc OBROCONY.

ZADANIE: Wyciagnij dane i zwroc TYLKO JSON:

{"detectedType":"...","imie":"...","nazwisko":"...","dataUrodzenia":"YYYY-MM-DD","obywatelstwo":"kraj","nrPaszportu":"...","dataOd":"YYYY-MM-DD","dataDo":"YYYY-MM-DD","stanowisko":"...","rodzajUmowy":"...","firma":"...","nrDecyzji":"...","nrOswiadczenia":"...","wynagrodzenie":"...","wymiarCzasu":"...","celPobytu":"..."}

ZASADY:
1. Dokument: NAGLOWEK -> SENTENCJA -> UZASADNIENIE. Dane bierz WYLACZNIE z SENTENCJI (po "postanawiam"/"orzekam"/"udzielam"). NIGDY z UZASADNIENIA.
2. DECYZJA II INSTANCJI (Szef Urzedu do Spraw Cudzoziemcow, "uchylam i udzielam"):
   - nrDecyzji = sygnatura z NAGLOWKA tej decyzji (np. DL.WIIPO.xxxx), NIE numer uchylonej decyzji (np. WSC-...).
   - Wszystkie dane (daty, wynagrodzenie, stanowisko, firma) TYLKO z czesci po "udzielam zezwolenia" w SENTENCJI.
   - dataDo = data "do dnia" z sentencji udzielenia.
   - dataOd = data wydania decyzji z naglowka.
   - IGNORUJ wszystkie numery, daty i kwoty wymienione w uzasadnieniu lub w czesci "uchylam".
3. dataOd = data wydania z naglowka. dataDo = "do dnia" z sentencji.
4. wynagrodzenie = TYLKO z sentencji ("za wynagrodzeniem nie nizszym niz X zl brutto").
5. firma = PELNA nazwa z sentencji ("na rzecz podmiotu NAZWA").
6. nrDecyzji = sygnatura z naglowka (pod nazwa organu).
7. detectedType:
   - "wysokie kwalifikacje"/art.127 W SENTENCJI -> BLUE_CARD
   - "udzielam zezwolenia na pobyt" -> KARTA_POBYTU
   - "zezwolenie na prace" -> ZEZWOLENIE
   - formularz PSZ-OPWP -> OSWIADCZENIE
   - "powiadomienie o powierzeniu pracy" / "zgloszenie o powierzeniu pracy" (UA) -> ZGLOSZENIE_UA (nie maja dataDo = null)
8. obywatelstwo: TYLKO kraj (NIE "Federacji Rosyjskiej" -> pisz "Rosja").
9. stanowisko: z sentencji ("na stanowisku" lub "rodzaj pracy").
10. wymiarCzasu: np. "100 godzin miesiecznie", "pelny etat" -> z sentencji.
11. rodzajUmowy: np. "umowa o dzielo", "umowa zlecenie" -> z sentencji.
12. OSWIADCZENIE: nrOswiadczenia = PZC/OP.G numer.
13. celPobytu: CEL z sentencji dla decyzji pobytowych (np. "praca", "studia", "laczenie z rodzina", "dzialalnosc gospodarcza", "pobyt z cudzoziemcem", "humanitarny"). Tylko dla kart pobytu/TRC.
14. Pola nieznalezione = null.`;

  const mediaType = typPliku === "png" ? "image/png" : "image/jpeg";

  try {
    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };

    let response;
    if (isPdf) {
      response = await client.beta.messages.create({
        model,
        max_tokens: 2048,
        betas: ["pdfs-2024-09-25"],
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: extractionPrompt }] }],
      });
    } else {
      response = await client.messages.create({
        model,
        max_tokens: 2048,
        messages: [{ role: "user", content: [contentBlock, { type: "text", text: extractionPrompt }] }],
      });
    }

    const fullText = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n").trim();

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);
    const result = {};

    if (data.detectedType && ["OSWIADCZENIE", "ZEZWOLENIE", "KARTA_POBYTU", "BLUE_CARD", "ODWOLANIE", "ZGLOSZENIE_UA", "WIZA"].includes(data.detectedType)) {
      result.detectedType = data.detectedType;
    }
    if (data.imie && typeof data.imie === "string") result.imie = data.imie.trim();
    if (data.nazwisko && typeof data.nazwisko === "string") result.nazwisko = data.nazwisko.trim();
    if (data.dataUrodzenia && /^\d{4}-\d{2}-\d{2}$/.test(data.dataUrodzenia)) result.dataUrodzenia = data.dataUrodzenia;
    if (data.obywatelstwo && typeof data.obywatelstwo === "string") {
      let cit = data.obywatelstwo.trim().replace(/\s+(zezwolenie|pobyt|prac|decyzj|czasow|kart|na|do|dnia|terytorium).*$/i, "").trim();
      if (cit.length > 1) result.obywatelstwo = cit;
    }
    if (data.nrPaszportu && typeof data.nrPaszportu === "string") result.nrPaszportu = data.nrPaszportu.trim();
    if (data.dataOd && /^\d{4}-\d{2}-\d{2}$/.test(data.dataOd)) result.dataOd = data.dataOd;
    if (data.dataDo && /^\d{4}-\d{2}-\d{2}$/.test(data.dataDo)) result.dataDo = data.dataDo;
    if (data.stanowisko && typeof data.stanowisko === "string") result.stanowisko = data.stanowisko.trim();
    if (data.rodzajUmowy && typeof data.rodzajUmowy === "string") result.rodzajUmowy = data.rodzajUmowy.trim();
    if (data.firma && typeof data.firma === "string") result.firma = data.firma.trim();
    if (data.nrDecyzji && typeof data.nrDecyzji === "string") result.nrDecyzji = data.nrDecyzji.trim();
    if (data.nrOswiadczenia && typeof data.nrOswiadczenia === "string") result.nrOswiadczenia = data.nrOswiadczenia.trim();
    if (data.wynagrodzenie && typeof data.wynagrodzenie === "string") {
      let wyn = data.wynagrodzenie.trim().replace(/\s+\d+\.\s*$/, "").replace(/\.\s*$/, "").trim();
      if (wyn.length > 2) result.wynagrodzenie = wyn;
    }
    // celPobytu — for TRC subtype classification from OCR
    if (data.celPobytu && typeof data.celPobytu === "string") {
      result.celPobytu = data.celPobytu.trim();
    }

    const hasAnyData = result.dataOd || result.dataDo || result.nazwisko || result.imie
      || result.stanowisko || result.nrPaszportu || result.nrDecyzji || result.wynagrodzenie;

    return hasAnyData ? result : null;

  } catch (err) {
    const msg = err.message || "";
    console.error(`    [OCR ERROR] ${filename}: ${msg}`);

    // Abort on auth/billing errors
    if (/401|authentication_error|API key/i.test(msg)) {
      throw new Error(`ANTHROPIC_API_KEY niewazny — przerwij i napraw klucz. ${msg}`);
    }
    if (/402|credit.balance.too.low|insufficient.*funds|billing/i.test(msg)) {
      throw new Error(`API_CREDIT_LOW — brak srodkow. ${msg}`);
    }
    if (/429|rate.limit|too.many.requests/i.test(msg)) {
      throw new Error(`API_RATE_LIMIT — za duzo zapytan. ${msg}`);
    }
    // Don't abort on file-size / validation errors — just skip the file
    if (/exceeds.*maximum|too.large|image.size/i.test(msg)) {
      console.log(`    [SKIP-SIZE] ${filename}: za duzy dla API`);
      return null;
    }
    if (/5\d\d|server.error|overloaded/i.test(msg)) {
      throw new Error(`API_SERVER_ERROR — blad serwera Anthropic. ${msg}`);
    }

    return null;
  }
}

/**
 * Refine KARTA_POBYTU to a specific TRC subtype using celPobytu from OCR.
 */
function refineTrcType(detectedType, celPobytu, sentencjaOrText) {
  if (detectedType !== "KARTA_POBYTU") return detectedType;

  // If we got celPobytu from OCR, use it
  if (celPobytu) {
    const cel = celPobytu.toLowerCase();
    if (/wysoki.*kwalifikacj|niebieska.*karta|blue.*card/i.test(cel)) return "BLUE_CARD";
    if (/studi|kszta[łl]ceni|student/i.test(cel)) return "TRC_STUDIA";
    if (/absolwent/i.test(cel)) return "TRC_ABSOLWENT";
    if (/humanitarn/i.test(cel)) return "TRC_HUMANITARNE";
    if (/rodzin|ma[łl][żz]on|po[łl][aą]czeni/i.test(cel)) return "TRC_MALZONEK_PL";
    if (/cudzoziemcem|pobyt.*z.*cudz/i.test(cel)) return "TRC_POBYT_Z_CUDZ";
    if (/dzia[łl]alno[śs][ćc].*gospodarcz/i.test(cel)) return "TRC_DZIALALNOSC";
    if (/prac[aey]/i.test(cel)) return "KARTA_POBYTU"; // TRC w celu pracy = default
  }

  // Fallback: try from sentencja text
  if (sentencjaOrText) {
    return classifyTrcSubtype(sentencjaOrText);
  }

  return "KARTA_POBYTU";
}

// ==================== PROCESS SINGLE ATTACHMENT ====================

async function processAttachment(att, mode, foreigner) {
  const personName = `${foreigner.imie ?? ""} ${foreigner.nazwisko}`.trim();
  const result = {
    attachmentId: att.id,
    plik: att.nazwaPliku,
    decyzja: mode,
    scrapeResult: "",
    typDokumentu: "",
    uwagi: "",
    skipReason: "",
    createdWorkBase: false,
    createdResidenceBase: false,
  };

  try {
    // Download from Supabase
    const { data: fileData, error: dlError } = await supabase.storage
      .from(BUCKET)
      .download(att.storagePath);

    if (dlError || !fileData) {
      result.scrapeResult = "error";
      result.uwagi = `Download failed: ${dlError?.message}`;
      console.log(`  [ERROR] ${att.nazwaPliku}: download failed`);
      return result;
    }

    const buffer = await fileData.arrayBuffer();
    let parsed = null;
    let rawSentencja = null;

    // Step 1: Try text extraction for PDFs
    if (att.typPliku === "pdf" && (mode === "text_only" || mode === "text_then_ocr")) {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(Buffer.from(buffer));
        const meaningfulLength = (pdfData.text ?? "").replace(/\s/g, "").length;

        if (meaningfulLength >= 200) {
          rawSentencja = pdfData.text.split(/UZASADNIENIE/i)[0];
          parsed = parseTextBasic(pdfData.text, att.nazwaPliku);
          if (parsed && parsed.detectedType) {
            console.log(`  [TEXT] ${att.nazwaPliku} -> ${parsed.detectedType}`);
          } else if (mode === "text_only") {
            result.scrapeResult = "text_no_data";
            result.uwagi = `Tekst (${meaningfulLength} zn.) — brak rozpoznanego typu`;
            return result;
          }
        } else if (mode === "text_only") {
          result.scrapeResult = "text_no_data";
          result.uwagi = `Za malo tekstu (${meaningfulLength} zn.)`;
          return result;
        }
      } catch (e) {
        if (mode === "text_only") {
          result.scrapeResult = "error";
          result.uwagi = `PDF parse error: ${e.message}`;
          return result;
        }
      }
    }

    // Step 2: OCR if needed
    if (!parsed || !parsed.detectedType) {
      if (mode === "text_only") {
        result.scrapeResult = "text_no_data";
        return result;
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        result.scrapeResult = "error";
        result.uwagi = "Brak ANTHROPIC_API_KEY";
        return result;
      }

      const isPdf = att.typPliku === "pdf";
      const isImage = ["jpeg", "jpg", "png"].includes(att.typPliku);

      parsed = await ocrExtract(buffer, isImage, isPdf, att.nazwaPliku, apiKey, att.typPliku);
      if (!parsed) {
        // Retry once
        console.log(`  [RETRY] ${att.nazwaPliku}`);
        parsed = await ocrExtract(buffer, isImage, isPdf, att.nazwaPliku, apiKey, att.typPliku);
        if (!parsed) {
          result.scrapeResult = "error";
          result.uwagi = "OCR nie zwrocil danych";
          console.log(`  [RETRY-FAIL] ${att.nazwaPliku}`);
          return result;
        }
      }
      console.log(`  [OCR] ${att.nazwaPliku} -> ${parsed.detectedType || "?"}`);
    }

    // Refine TRC subtype
    if (parsed.detectedType === "KARTA_POBYTU") {
      parsed.detectedType = refineTrcType(parsed.detectedType, parsed.celPobytu, rawSentencja);
      if (parsed.detectedType !== "KARTA_POBYTU") {
        console.log(`    [TRC] Podtyp: ${parsed.detectedType}`);
      }
    }

    result.typDokumentu = parsed.detectedType || "";

    // Step 3: Name match — pelnomocnik != strona
    const extractedFullName = `${parsed.imie ?? ""} ${parsed.nazwisko ?? ""}`.trim();
    const KNOWN_AGENTS = ["stanko", "antoshka", "glapinska", "glapińska", "lytvynchuk"];
    if (extractedFullName.length > 2 && personName.length > 2 && foreigner.nazwisko !== "Nowy" && !isJunkExtractedName(extractedFullName)) {
      if (!namesMatchTokens(extractedFullName, personName)) {
        // Check if it's a known agent (pelnomocnik) — if so, document belongs to the foreigner
        const isAgent = KNOWN_AGENTS.some(a => extractedFullName.toLowerCase().includes(a));
        if (!isAgent) {
          await db.fdkAttachment.update({
            where: { id: att.id },
            data: { opis: `\u26a0 Dokument innej osoby: ${extractedFullName}` },
          });
          await db.fdkChangeLog.create({
            data: {
              foreignerId: att.foreignerId,
              changedBy: CHANGED_BY,
              field: "scrape",
              oldValue: null,
              newValue: `Scrape ${att.nazwaPliku}: INNA OSOBA (${extractedFullName}) — podstawa NIE utworzona. Profil: ${personName}.`,
            },
          });
          result.scrapeResult = "different_person";
          result.uwagi = `Inna osoba: ${extractedFullName}`;
          console.log(`  [INNA OSOBA] ${att.nazwaPliku}: ${extractedFullName} != ${personName}`);
          return result;
        }
        console.log(`  [PELNOMOCNIK] ${att.nazwaPliku}: ${extractedFullName} = agent, kontynuuję`);
      }
    }

    // Step 4: Auto-fill empty fields
    const updateData = {};
    if (parsed.imie && !foreigner.imie) updateData.imie = parsed.imie;
    if (parsed.nazwisko && foreigner.nazwisko === "Nowy") updateData.nazwisko = parsed.nazwisko;
    if (parsed.dataUrodzenia && !foreigner.dataUrodzenia) updateData.dataUrodzenia = new Date(parsed.dataUrodzenia);
    if (parsed.obywatelstwo && !foreigner.obywatelstwo) updateData.obywatelstwo = parsed.obywatelstwo;
    if (parsed.nrPaszportu && !foreigner.nrPaszportu) updateData.nrPaszportu = parsed.nrPaszportu;

    if (Object.keys(updateData).length > 0) {
      await db.fdkForeigner.update({ where: { id: att.foreignerId }, data: updateData });
      for (const [key, value] of Object.entries(updateData)) {
        await db.fdkChangeLog.create({
          data: {
            foreignerId: att.foreignerId,
            changedBy: CHANGED_BY,
            field: key,
            oldValue: null,
            newValue: value instanceof Date ? value.toISOString().slice(0, 10) : String(value),
          },
        });
      }
    }

    // Junk validation
    if (parsed.nrOswiadczenia && !/\d/.test(parsed.nrOswiadczenia)) parsed.nrOswiadczenia = null;
    if (parsed.nrDecyzji && !/\d/.test(parsed.nrDecyzji)) parsed.nrDecyzji = null;
    if (parsed.stanowisko && isJunkFieldValue(parsed.stanowisko)) parsed.stanowisko = null;
    if (parsed.firma && isJunkFieldValue(parsed.firma)) parsed.firma = null;
    if (parsed.rodzajUmowy && isJunkFieldValue(parsed.rodzajUmowy)) parsed.rodzajUmowy = null;

    // Guard: no dates AND no document number
    const hasUsefulData = parsed.dataOd || parsed.dataDo || parsed.nrDecyzji || parsed.nrOswiadczenia;
    if (!hasUsefulData) {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: att.foreignerId,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: `Scrape ${att.nazwaPliku}: nieczytelny/formularz — brak dat i numeru dokumentu. Podstawa NIE utworzona.`,
        },
      });
      result.scrapeResult = "nieczytelny_formularz";
      result.uwagi = "Brak dat i numeru";
      return result;
    }

    // Skip ODWOLANIE
    if (parsed.detectedType === "ODWOLANIE") {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: att.foreignerId,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: `Rozpoznano odwolanie w pliku: ${att.nazwaPliku}. Podstawa NIE utworzona.`,
        },
      });
      result.scrapeResult = "ok";
      return result;
    }

    // No type detected
    if (!parsed.detectedType) {
      await db.fdkChangeLog.create({
        data: {
          foreignerId: att.foreignerId,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: `Scrape ${att.nazwaPliku}: nierozpoznany typ dokumentu — podstawa NIE utworzona.`,
        },
      });
      result.scrapeResult = "nierozpoznany_typ";
      result.uwagi = "Nierozpoznany typ";
      return result;
    }

    const docType = parsed.detectedType;

    // WIZA — update foreigner, no base
    if (docType === "WIZA" && parsed.dataDo) {
      if (!foreigner.wizaDo || new Date(parsed.dataDo) > foreigner.wizaDo) {
        await db.fdkForeigner.update({
          where: { id: att.foreignerId },
          data: { wizaDo: new Date(parsed.dataDo) },
        });
      }
      await db.fdkChangeLog.create({
        data: {
          foreignerId: att.foreignerId,
          changedBy: CHANGED_BY,
          field: "scrape",
          oldValue: null,
          newValue: `Rozpoznano wize w pliku: ${att.nazwaPliku}. wizaDo=${parsed.dataDo}.`,
        },
      });
      result.scrapeResult = "ok";
      result.typDokumentu = "WIZA";
      return result;
    }

    // Step 5: Create/update base — dedup by document number
    let existingBase = null;
    if (docType === "OSWIADCZENIE" && parsed.nrOswiadczenia) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: att.foreignerId, typ: docType, nrOswiadczenia: parsed.nrOswiadczenia },
      });
    } else if (docType !== "OSWIADCZENIE" && parsed.nrDecyzji) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: { foreignerId: att.foreignerId, typ: docType, nrDecyzji: parsed.nrDecyzji },
      });
    }
    if (!existingBase && parsed.dataOd && parsed.dataDo) {
      existingBase = await db.fdkEmploymentBase.findFirst({
        where: {
          foreignerId: att.foreignerId,
          typ: docType,
          dataOd: new Date(parsed.dataOd),
          dataDo: new Date(parsed.dataDo),
        },
      });
    }

    const baseData = {
      foreignerId: att.foreignerId,
      typ: docType,
      status: "BRAK_DANYCH",
      dataOd: parsed.dataOd ? new Date(parsed.dataOd) : null,
      dataDo: parsed.dataDo ? new Date(parsed.dataDo) : null,
      rodzajUmowy: parsed.rodzajUmowy || null,
      stanowisko: parsed.stanowisko || null,
      firma: parsed.firma || null,
    };

    if (docType === "OSWIADCZENIE") {
      baseData.nrOswiadczenia = parsed.nrOswiadczenia || null;
      baseData.nrDecyzji = null;
    } else {
      baseData.nrDecyzji = parsed.nrDecyzji || null;
      baseData.nrOswiadczenia = null;
    }

    if (parsed.wynagrodzenie) {
      const numMatch = parsed.wynagrodzenie.match(/([0-9]+[.,]?\d*)/);
      if (numMatch) {
        baseData.stawka = parseFloat(numMatch[1].replace(",", "."));
      }
    }

    let baseId;
    if (existingBase) {
      const updateFields = {};
      for (const [key, value] of Object.entries(baseData)) {
        if (key === "foreignerId") continue;
        if (value !== null && value !== undefined) updateFields[key] = value;
      }
      await db.fdkEmploymentBase.update({ where: { id: existingBase.id }, data: updateFields });
      baseId = existingBase.id;
    } else {
      const base = await db.fdkEmploymentBase.create({ data: baseData });
      baseId = base.id;
    }

    await db.fdkChangeLog.create({
      data: {
        foreignerId: att.foreignerId,
        changedBy: CHANGED_BY,
        field: "scrape",
        oldValue: null,
        newValue: `${existingBase ? "Zaktualizowano" : "Utworzono"} podstawe #${baseId} (${docType}) z pliku: ${att.nazwaPliku}`,
      },
    });

    // Track whether this was a work or residence base
    if (WORK_BASE_TYPES.has(docType)) result.createdWorkBase = true;
    if (RESIDENCE_BASE_TYPES.has(docType)) result.createdResidenceBase = true;

    // Handle residence permits — update foreigner fields
    if (RESIDENCE_BASE_TYPES.has(docType) && parsed.dataDo) {
      const dataDo = new Date(parsed.dataDo);
      if (!foreigner.decyzjaPobytowaDo || dataDo > foreigner.decyzjaPobytowaDo) {
        await db.fdkForeigner.update({
          where: { id: att.foreignerId },
          data: { decyzjaPobytowaDo: dataDo },
        });
      }
    }

    const partial = !parsed.dataOd || !parsed.dataDo || !parsed.detectedType;
    result.scrapeResult = partial ? "partial" : "ok";
    return result;

  } catch (err) {
    const msg = err.message || "";
    // Re-throw API errors to abort the entire run
    if (/ANTHROPIC_API_KEY|API_CREDIT_LOW|API_RATE_LIMIT|API_SERVER_ERROR/i.test(msg)) throw err;
    result.scrapeResult = "error";
    result.uwagi = msg;
    console.error(`  [ERROR] ${att.nazwaPliku}: ${msg}`);
    return result;
  }
}

// ==================== ONLY-NEWEST UA NOTIFICATION ACTIVE ====================

/**
 * After processing a profile, ensure only the newest ZGLOSZENIE_UA / POWIADOMIENIE_UA
 * is AKTYWNE; older ones are set to NIEAKTYWNE.
 */
async function enforceNewestUaOnly(foreignerId) {
  const uaBases = await db.fdkEmploymentBase.findMany({
    where: {
      foreignerId,
      typ: { in: ["ZGLOSZENIE_UA", "POWIADOMIENIE_UA"] },
    },
    orderBy: { dataOd: "desc" },
  });

  if (uaBases.length <= 1) return;

  // Newest one stays as-is (or becomes AKTYWNE)
  const [newest, ...older] = uaBases;
  if (newest.status !== "AKTYWNE") {
    await db.fdkEmploymentBase.update({
      where: { id: newest.id },
      data: { status: "AKTYWNE" },
    });
  }

  for (const base of older) {
    if (base.status === "AKTYWNE" || base.status === "BRAK_DANYCH") {
      await db.fdkEmploymentBase.update({
        where: { id: base.id },
        data: { status: "NIEAKTYWNE" },
      });
    }
  }
}

// ==================== MAIN ====================

async function main() {
  // ------ MODE: Generate no-attachments list ------
  if (NO_ATTACHMENTS_MODE) {
    console.log("\n=== Profile bez zadnego zalacznika ===\n");

    const profiles = await db.fdkForeigner.findMany({
      include: { _count: { select: { attachments: true } } },
      orderBy: { nazwisko: "asc" },
    });

    const noAtt = profiles.filter((p) => p._count.attachments === 0);

    console.log(`Znaleziono ${noAtt.length} profili bez zalacznikow.\n`);

    const csvLines = ["id;nazwisko;imie;uwagi"];
    for (const p of noAtt) {
      const uwagi = p.id === 949 ? "TESTOWY? (Stepien id=949, 0 zalacznikow)" : "";
      if (p.id === 949) {
        console.log(`  [!] Profil #949 Stepien — wyglada na testowy. Nie usuwam.`);
      }
      csvLines.push(
        [p.id, p.nazwisko, p.imie ?? "", uwagi]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(";")
      );
    }

    const outFile = "raport-brak-zalacznikow.csv";
    fs.writeFileSync(outFile, csvLines.join("\n"), "utf-8");
    console.log(`\nZapisano: ${outFile} (${noAtt.length} profili)`);
    await db.$disconnect();
    return;
  }

  // ------ MODE: Batch scrape ------
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  BATCH SCRAPE — profile z zalacznikami, bez podstaw`);
  console.log(`  Tryb: ${DO_RUN ? "WYKONANIE" : "PLAN (bez scrapowania)"}`);
  console.log(`  Batch: ${BATCH_SIZE} profili`);
  console.log(`${"=".repeat(60)}\n`);

  // Load checkpoint
  let checkpointData = { processedProfileIds: [], processedAttIds: [], abortedAt: null };
  if (DO_RESUME && fs.existsSync(CHECKPOINT_FILE)) {
    checkpointData = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf-8"));
    console.log(`Wznowienie — ${checkpointData.processedProfileIds.length} profili juz przetworzonych.\n`);
  }
  const doneProfileIds = new Set(checkpointData.processedProfileIds || []);
  const doneAttIds = new Set(checkpointData.processedAttIds || []);

  // Find already-scraped attachment filenames (from previous runs including scrape-pending)
  const scrapeLogs = await db.fdkChangeLog.findMany({
    where: { field: "scrape" },
    select: { newValue: true },
  });
  const scrapedFileNames = new Set();
  for (const log of scrapeLogs) {
    const match = log.newValue?.match(/pliku[: ]+(.+?)$/);
    if (match) scrapedFileNames.add(match[1].trim());
  }
  const flaggedAttachments = await db.fdkAttachment.findMany({
    where: { opis: { startsWith: "\u26a0" } },
    select: { id: true },
  });
  const flaggedIds = new Set(flaggedAttachments.map((a) => a.id));
  console.log(`Juz zescrapowanych (z logow): ${scrapedFileNames.size}, oflagowanych: ${flaggedIds.size}\n`);

  // Query: profiles with attachments > 0 and 0 bases
  const allProfiles = await db.fdkForeigner.findMany({
    include: {
      _count: {
        select: {
          attachments: true,
          employmentBases: true,
        },
      },
      attachments: {
        where: {
          kategoria: { in: ["glowne", "trc"] },
          typPliku: { in: ["pdf", "jpeg", "jpg", "png"] },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { nazwisko: "asc" },
  });

  const targetProfiles = allProfiles.filter(
    (p) => p._count.attachments > 0 && p._count.employmentBases === 0 && !doneProfileIds.has(p.id),
  );

  console.log(`Wszystkich profili: ${allProfiles.length}`);
  console.log(`Z zalacznikami > 0 i 0 podstaw: ${targetProfiles.length}`);

  // Order: K first, then L-S, then A-J
  const letterOrder = (name) => {
    const first = (name || "").toUpperCase().charAt(0);
    // K=0, L=1, ..., S=8, T=9, ..., Z=15, A=16, B=17, ..., J=25
    const code = first.charCodeAt(0);
    if (code >= 75 && code <= 90) return code - 75; // K(75)->0 .. Z(90)->15
    if (code >= 65 && code <= 74) return code - 65 + 16; // A(65)->16 .. J(74)->25
    return 50;
  };
  targetProfiles.sort((a, b) => {
    const la = letterOrder(a.nazwisko);
    const lb = letterOrder(b.nazwisko);
    if (la !== lb) return la - lb;
    return (a.nazwisko || "").localeCompare(b.nazwisko || "", "pl");
  });

  // Print per-letter summary
  const byLetter = {};
  for (const p of targetProfiles) {
    const letter = (p.nazwisko || "?").toUpperCase().charAt(0);
    byLetter[letter] = (byLetter[letter] || 0) + 1;
  }
  console.log(`\nPer litera:`);
  for (const [letter, count] of Object.entries(byLetter).sort((a, b) => letterOrder(a[0]) - letterOrder(b[0]))) {
    console.log(`  ${letter}: ${count}`);
  }

  // Classify all attachments to estimate cost
  let totalToProcess = 0;
  let totalOcrEstimate = 0;
  for (const profile of targetProfiles) {
    for (const att of profile.attachments) {
      if (scrapedFileNames.has(att.nazwaPliku) || flaggedIds.has(att.id) || doneAttIds.has(att.id)) continue;
      const classification = classifyFile(att.nazwaPliku, att.typPliku);
      if (classification === "skip") continue;
      totalToProcess++;
      if (classification === "ocr") totalOcrEstimate++;
      if (classification === "text_then_ocr") totalOcrEstimate += 0.3;
    }
  }

  const estCost = Math.ceil(totalOcrEstimate) * 0.05;
  console.log(`\nZalacznikow do przetworzenia: ~${totalToProcess}`);
  console.log(`Szacowany koszt OCR: ~$${estCost.toFixed(2)}\n`);

  if (!DO_RUN) {
    console.log(`Uruchom z --run aby rozpoczac scrapowanie.\n`);
    await db.$disconnect();
    return;
  }

  // ==================== EXECUTION ====================

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ROZPOCZYNAM SCRAPOWANIE`);
  console.log(`${"=".repeat(60)}\n`);

  // CSV report — append mode
  const csvExists = fs.existsSync(REPORT_FILE);
  if (!csvExists) {
    fs.writeFileSync(REPORT_FILE, "id;nazwisko;imie;liczba_zalacznikow;podstawy_pracy;podstawy_pobytu;pliki_pominiete\n", "utf-8");
  }

  const processedProfileIds = new Set(doneProfileIds);
  const processedAttIds = new Set(doneAttIds);

  function saveCheckpoint(abortReason) {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({
      processedProfileIds: [...processedProfileIds],
      processedAttIds: [...processedAttIds],
      abortedAt: abortReason || null,
      timestamp: new Date().toISOString(),
    }, null, 2), "utf-8");
  }

  let batchCount = 0;
  let totalProcessed = 0;
  const batchSummary = {};
  let aborted = false;

  for (const profile of targetProfiles) {
    if (aborted) break;

    const personName = `${profile.imie ?? ""} ${profile.nazwisko}`.trim();
    console.log(`\n--- [${totalProcessed + 1}/${targetProfiles.length}] ${personName} (id=${profile.id}, ${profile.attachments.length} zal.) ---`);

    let workBasesCreated = 0;
    let residenceBasesCreated = 0;
    const skippedFiles = [];

    for (const att of profile.attachments) {
      if (aborted) break;

      // Skip already processed
      if (scrapedFileNames.has(att.nazwaPliku) || flaggedIds.has(att.id) || processedAttIds.has(att.id)) {
        skippedFiles.push(`${att.nazwaPliku} (juz_zescrapowany)`);
        continue;
      }

      const classification = classifyFile(att.nazwaPliku, att.typPliku);
      if (classification === "skip") {
        skippedFiles.push(`${att.nazwaPliku} (skip-lista)`);
        continue;
      }
      if (classification === "undecided") {
        skippedFiles.push(`${att.nazwaPliku} (nierozstrzygniety)`);
        continue;
      }

      try {
        const result = await processAttachment(att, classification, profile);
        processedAttIds.add(att.id);

        if (result.createdWorkBase) workBasesCreated++;
        if (result.createdResidenceBase) residenceBasesCreated++;

        if (result.scrapeResult === "different_person") {
          skippedFiles.push(`${att.nazwaPliku} (inna_osoba: ${result.uwagi})`);
        } else if (result.scrapeResult === "nieczytelny_formularz") {
          skippedFiles.push(`${att.nazwaPliku} (nieczytelny)`);
        } else if (result.scrapeResult === "nierozpoznany_typ") {
          skippedFiles.push(`${att.nazwaPliku} (nierozpoznany_typ)`);
        } else if (result.scrapeResult === "text_no_data") {
          skippedFiles.push(`${att.nazwaPliku} (OCR_brak_danych)`);
        } else if (result.scrapeResult === "error") {
          skippedFiles.push(`${att.nazwaPliku} (error: ${result.uwagi})`);
        }
      } catch (err) {
        // API error — abort run, preserve checkpoint
        console.error(`\n  [ABORT] ${err.message}`);
        saveCheckpoint(err.message);
        aborted = true;
        break;
      }
    }

    // Enforce only newest UA notification active
    if (!aborted) {
      await enforceNewestUaOnly(profile.id);
    }

    // Record profile as done
    processedProfileIds.add(profile.id);
    saveCheckpoint(aborted ? "in_progress" : null);
    totalProcessed++;

    // Track per-letter stats
    const letter = (profile.nazwisko || "?").toUpperCase().charAt(0);
    if (!batchSummary[letter]) batchSummary[letter] = { total: 0, workBases: 0, residenceBases: 0 };
    batchSummary[letter].total++;
    batchSummary[letter].workBases += workBasesCreated;
    batchSummary[letter].residenceBases += residenceBasesCreated;

    // Append to CSV
    const skippedStr = skippedFiles.join(" | ");
    const csvLine = [
      profile.id,
      profile.nazwisko,
      profile.imie ?? "",
      profile._count.attachments,
      workBasesCreated,
      residenceBasesCreated,
      skippedStr,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");
    fs.appendFileSync(REPORT_FILE, csvLine + "\n", "utf-8");

    console.log(`  => praca: +${workBasesCreated}, pobyt: +${residenceBasesCreated}, pominiete: ${skippedFiles.length}`);

    batchCount++;
    if (batchCount >= BATCH_SIZE && !aborted) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`  BATCH ${BATCH_SIZE} UKONCZONY — przetworzone: ${totalProcessed}/${targetProfiles.length}`);
      console.log(`  Kontynuuje...`);
      console.log(`${"=".repeat(60)}`);
      batchCount = 0;
    }
  }

  // ==================== FINAL SUMMARY ====================

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  PODSUMOWANIE`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Przetworzonych profili: ${totalProcessed}/${targetProfiles.length}`);
  if (aborted) {
    console.log(`  STATUS: PRZERWANY (checkpoint zachowany)`);
    console.log(`  Wznow: node scripts/scrape-batch-full.mjs --run --resume`);
  } else {
    console.log(`  STATUS: ZAKONCZONY`);
  }

  console.log(`\n  Per litera:`);
  for (const [letter, stats] of Object.entries(batchSummary).sort((a, b) => a[0].localeCompare(b[0], "pl"))) {
    console.log(`    ${letter}: ${stats.total} profili, praca: +${stats.workBases}, pobyt: +${stats.residenceBases}`);
  }

  console.log(`\n  Raport: ${REPORT_FILE}`);

  // Clean up checkpoint only on full success
  if (!aborted && fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
    console.log(`  Checkpoint usuniety (pelny bieg zakonczony).`);
  }

  console.log();
  await db.$disconnect();
}

// ==================== RUN ====================

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
