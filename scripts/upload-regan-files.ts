import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_DIR = "C:\\Users\\gstep\\Desktop\\Joseph_Saul_Regan";
const BUCKET = "fdk-attachments";

// Map folder → kategoria
function getKategoria(filePath: string): string {
  const rel = path.relative(BASE_DIR, filePath);
  if (rel.startsWith("WP 2023")) return "wp_2023";
  if (rel.startsWith("WP 2024")) return "wp_2024";
  if (rel.startsWith("TRC 2024")) return "trc_2024";
  return "glowne";
}

// Readable display name
function displayName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTypPliku(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase().replace(".", "");
  if (ext === "jpg") return "jpeg";
  return ext || "bin";
}

const SKIP_FILES = new Set(["Thumbs.db", "panel_sprawy_fdk.html", "PROMPT_VSC_SPRAWY_FDK.md", "Joseph_Regan_dane_dokumenty.xlsx"]);
const SKIP_EXTENSIONS = new Set([".7z", ".fillupxml", ".db"]);

async function main() {
  // Find Regan in DB
  const regan = await db.fdkForeigner.findFirst({
    where: { nazwisko: "Regan", imie: { contains: "Joseph" } },
  });
  if (!regan) {
    console.error("Regan not found in DB! Run seed first.");
    process.exit(1);
  }
  console.log(`Found Regan: id=${regan.id}\n`);

  // Delete existing seed attachments (no real files)
  const deleted = await db.fdkAttachment.deleteMany({ where: { foreignerId: regan.id } });
  console.log(`Deleted ${deleted.count} old attachment records.\n`);

  // Collect all files
  const files: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        if (SKIP_FILES.has(entry.name)) continue;
        if (SKIP_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
        files.push(full);
      }
    }
  }
  walk(BASE_DIR);
  console.log(`Found ${files.length} files to upload.\n`);

  let success = 0;
  let failed = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const kategoria = getKategoria(filePath);
    const typPliku = getTypPliku(fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fileBuffer.length;

    // Sanitize storage path
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${regan.id}/${kategoria}/${Date.now()}_${safeName}`;

    // Determine MIME type
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    const mime = mimeMap[typPliku] ?? "application/octet-stream";

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mime,
        upsert: false,
      });

    if (error) {
      console.error(`  FAIL: ${fileName} — ${error.message}`);
      failed++;
      continue;
    }

    // Save metadata to DB
    await db.fdkAttachment.create({
      data: {
        foreignerId: regan.id,
        kategoria,
        nazwaWyswietlana: displayName(fileName),
        nazwaPliku: fileName,
        opis: null,
        typPliku,
        storagePath,
        rozmiarBytes: fileSize,
      },
    });

    console.log(`  OK: [${kategoria}] ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`);
    success++;
  }

  console.log(`\nDone! ${success} uploaded, ${failed} failed.`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
