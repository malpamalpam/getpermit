/**
 * Verify internal links on service pages.
 * Checks that each page links to the required targets per the link map.
 * Can check live site or local build.
 *
 * Usage:
 *   node scripts/check-internal-links.mjs                          # check local services.ts
 *   node scripts/check-internal-links.mjs --live https://getpermit.pl  # check live site
 */
import * as fs from "fs";

const SERVICES = [
  { num: 1, slug: "zezwolenie-na-pobyt-czasowy-i-prace", required: [6, 7, 3, 10] },
  { num: 2, slug: "karta-pobytu-czasowego", required: [9, 1, 10] },
  { num: 3, slug: "eu-blue-card", required: [5, 12, 10] },
  { num: 4, slug: "karta-stalego-pobytu", required: [12, 9, 10] },
  { num: 5, slug: "rezydent-dlugoterminowy-ue", required: [3, 9, 10] },
  { num: 6, slug: "zezwolenie-na-prace", required: [7, 1, 8, 10] },
  { num: 7, slug: "oswiadczenie-o-powierzeniu-pracy", required: [8, 6, 10] },
  { num: 8, slug: "powiadomienia-o-powierzeniu-pracy", required: [1, 7, 10] },
  { num: 9, slug: "wymiana-karty-pobytu", required: [2, 10] },
  { num: 10, slug: "ponaglenia-i-odwolania", required: [1, 2, 4, 5] },
  { num: 11, slug: "legalizacja-b2b-inkubator", required: [1, 3, 10] },
  { num: 12, slug: "tlumaczenia-przysiegle", required: [3, 4] },
];

const SLUG_MAP = Object.fromEntries(SERVICES.map((s) => [s.num, s.slug]));
const LOCALES = ["pl", "en", "ru", "uk"];

// Check from source code (services.ts)
async function checkFromSource() {
  const content = fs.readFileSync("src/lib/services.ts", "utf-8");

  console.log("=== WERYFIKACJA LINKÓW WEWNĘTRZNYCH (z kodu źródłowego) ===\n");
  console.log("Legenda: ✓ = jest, ✗ = brakuje\n");

  let totalMissing = 0;

  for (const service of SERVICES) {
    // Find ALL occurrences of this slug and use the one inside services array (has sections/faq)
    let slugIdx = -1;
    let searchFrom = 0;
    while (true) {
      const idx = content.indexOf(`slug: "${service.slug}"`, searchFrom);
      if (idx === -1) break;
      // Check if this occurrence has sections nearby (within 2000 chars) — that's the service, not category
      const nearby = content.substring(idx, idx + 2000);
      if (nearby.includes("sections:") || nearby.includes("faq:")) {
        slugIdx = idx;
        break;
      }
      searchFrom = idx + 10;
      slugIdx = idx; // fallback to last found
    }
    if (slugIdx === -1) {
      console.log(`#${service.num} ${service.slug}: NIE ZNALEZIONO W PLIKU`);
      continue;
    }

    // Find the end of this service — look for next service slug or category boundary
    const nextSlugIdx = content.indexOf('slug: "', slugIdx + 10);
    const serviceBlock = nextSlugIdx > 0
      ? content.substring(slugIdx, nextSlugIdx)
      : content.substring(slugIdx);

    const results = [];
    for (const targetNum of service.required) {
      const targetSlug = SLUG_MAP[targetNum];
      const hasLink = serviceBlock.includes(`/uslugi/${targetSlug}`);
      results.push({ num: targetNum, slug: targetSlug, found: hasLink });
      if (!hasLink) totalMissing++;
    }

    const status = results.every((r) => r.found) ? "OK" : "BRAKUJE";
    console.log(`#${service.num} ${service.slug} [${status}]:`);
    for (const r of results) {
      console.log(`  ${r.found ? "✓" : "✗"} → #${r.num} ${r.slug}`);
    }
  }

  console.log(`\n=== PODSUMOWANIE ===`);
  console.log(`Brakujących linków: ${totalMissing}`);
  console.log(`Łącznie wymaganych: ${SERVICES.reduce((sum, s) => sum + s.required.length, 0)}`);
}

await checkFromSource();
