/**
 * Script to download Unsplash images and save them locally.
 * Run: node scripts/download-images.mjs
 *
 * After running, update src/lib/service-images.ts to use local paths.
 */

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const IMAGES = {
  "zezwolenie-na-prace-getpermit.jpg": "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1440&q=80&auto=format&fm=jpg",
  "oswiadczenie-o-powierzeniu-pracy-getpermit.jpg": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1440&q=80&auto=format&fm=jpg",
  "karta-pobytu-czasowego-getpermit.jpg": "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=1440&q=80&auto=format&fm=jpg",
  "zezwolenie-pobyt-czasowy-i-praca-getpermit.jpg": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1440&q=80&auto=format&fm=jpg",
  "eu-blue-card-getpermit.jpg": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1440&q=80&auto=format&fm=jpg",
  "wymiana-karty-pobytu-getpermit.jpg": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1440&q=80&auto=format&fm=jpg",
  "rezydent-dlugoterminowy-ue-getpermit.jpg": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1440&q=80&auto=format&fm=jpg",
  "karta-stalego-pobytu-getpermit.jpg": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1440&q=80&auto=format&fm=jpg",
  "ponaglenia-i-odwolania-getpermit.jpg": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1440&q=80&auto=format&fm=jpg",
  "tlumaczenia-przysiegle-getpermit.jpg": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1440&q=80&auto=format&fm=jpg",
  "obywatelstwo-polskie-getpermit.jpg": "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1440&q=80&auto=format&fm=jpg",
  "uslugi-dla-pracodawcow-getpermit.jpg": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1440&q=80&auto=format&fm=jpg",
};

const OUT_DIR = path.resolve("public/images/services");

async function main() {
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  for (const [filename, url] of Object.entries(IMAGES)) {
    const outPath = path.join(OUT_DIR, filename);
    if (existsSync(outPath)) {
      console.log(`[skip] ${filename} already exists`);
      continue;
    }
    console.log(`[download] ${filename} ...`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(outPath, buffer);
      console.log(`[ok] ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error(`[error] ${filename}: ${err.message}`);
    }
  }

  console.log("\nDone! Now update src/lib/service-images.ts to use /images/services/ paths.");
}

main();
