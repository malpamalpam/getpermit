/**
 * Final verification + fixes:
 * 1. Check Regan document text for actual salary
 * 2. Force deactivate old UA for ALL persons (re-run)
 * 3. Check Burak/Morozov DOSTEP_DYPLOM_PL
 * 4. List all DOSTEP_DYPLOM_PL
 *
 * node scripts/verify-and-fix-final.mjs          # diagnoza
 * node scripts/verify-and-fix-final.mjs --apply  # napraw
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

async function main() {
  console.log(`Tryb: ${DO_APPLY ? "APPLY" : "DIAGNOZA"}\n`);

  // === 1. REGAN — extract raw text from decision PDF ===
  console.log("=== 1. REGAN — fragment dokumentu z wynagrodzeniem ===");
  const reganAtt = await db.fdkAttachment.findFirst({
    where: { foreignerId: 175, nazwaPliku: { contains: "decyzja" }, typPliku: "pdf" },
  });
  if (reganAtt) {
    const { data: fileData } = await supabase.storage.from(BUCKET).download(reganAtt.storagePath);
    if (fileData) {
      const buffer = await fileData.arrayBuffer();
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(Buffer.from(buffer));
      const text = pdfData.text ?? "";
      // Find salary context
      const wynIdx = text.search(/wynagrodzen/i);
      if (wynIdx >= 0) {
        console.log("  Fragment z wynagrodzeniem:");
        console.log(`  "${text.substring(wynIdx - 50, wynIdx + 200).replace(/\n/g, " | ")}"`);
      }
      // Find wymiar/godzin context
      const godIdx = text.search(/godzin|wymiar|100\s*h/i);
      if (godIdx >= 0) {
        console.log("  Fragment z wymiarem:");
        console.log(`  "${text.substring(godIdx - 50, godIdx + 150).replace(/\n/g, " | ")}"`);
      }
      // Show stawka context
      const stawkaIdx = text.search(/21[\s.]*0{3}|21\s*zł|21,00/i);
      if (stawkaIdx >= 0) {
        console.log("  Fragment z '21':");
        console.log(`  "${text.substring(stawkaIdx - 80, stawkaIdx + 120).replace(/\n/g, " | ")}"`);
      }
    }
  }

  // Current Regan base
  const regan421 = await db.fdkEmploymentBase.findUnique({ where: { id: 421 } });
  console.log(`  Aktualna stawka w bazie: ${regan421?.stawka != null ? Number(regan421.stawka) : "-"}`);

  // === 2. ABRAMOVA + ALL — deactivate old UA notifications ===
  console.log("\n=== 2. Deaktywacja starszych ZGLOSZENIE_UA (cała baza) ===");

  const allForeigners = await db.fdkForeigner.findMany({
    include: { employmentBases: { orderBy: { dataOd: "desc" } } },
  });

  let totalDeactivated = 0;
  for (const f of allForeigners) {
    const activeUA = f.employmentBases.filter(
      (b) => b.typ === "ZGLOSZENIE_UA" && b.status === "AKTYWNE"
    );
    if (activeUA.length <= 1) continue;

    // Sort by dataOd desc
    activeUA.sort((a, b) => (b.dataOd?.getTime() ?? 0) - (a.dataOd?.getTime() ?? 0));
    const newest = activeUA[0];
    const older = activeUA.slice(1);

    console.log(`  id=${f.id} ${f.imie} ${f.nazwisko}: ${activeUA.length} aktywnych UA, zachowuję #${newest.id}, deaktywuję ${older.length}`);

    for (const b of older) {
      totalDeactivated++;
      if (DO_APPLY) {
        await db.fdkEmploymentBase.update({
          where: { id: b.id },
          data: { status: "NIEAKTYWNE" },
        });
      }
    }
  }
  console.log(`  Łącznie do deaktywacji: ${totalDeactivated}`);

  // Verify Abramova after fix
  if (DO_APPLY) {
    const abr = await db.fdkEmploymentBase.findMany({
      where: { foreignerId: 223, typ: "ZGLOSZENIE_UA", status: "AKTYWNE" },
    });
    console.log(`  Abramova po fix: ${abr.length} aktywnych UA`);
  }

  // === 3. Burak/Morozov DOSTEP_DYPLOM_PL ===
  console.log("\n=== 3. DOSTEP_DYPLOM_PL — Burak (174) i Morozov (28) ===");
  for (const fid of [174, 28]) {
    const bases = await db.fdkEmploymentBase.findMany({
      where: { foreignerId: fid, typ: "DOSTEP_DYPLOM_PL" },
    });
    const f = await db.fdkForeigner.findUnique({ where: { id: fid }, select: { imie: true, nazwisko: true } });
    if (bases.length > 0) {
      console.log(`  ${f.imie} ${f.nazwisko} (${fid}): MA ${bases.length} DOSTEP_DYPLOM_PL — USUWAM`);
      if (DO_APPLY) {
        for (const b of bases) {
          await db.fdkEmploymentBase.delete({ where: { id: b.id } });
        }
      }
    } else {
      console.log(`  ${f.imie} ${f.nazwisko} (${fid}): brak — OK`);
    }
  }

  // === 4. All DOSTEP_DYPLOM_PL report ===
  console.log("\n=== 4. Raport: wszystkie DOSTEP_DYPLOM_PL ===");
  const allDyplom = await db.fdkEmploymentBase.findMany({
    where: { typ: "DOSTEP_DYPLOM_PL" },
    include: { foreigner: { select: { id: true, imie: true, nazwisko: true, obywatelstwo: true } } },
  });
  console.log(`  Łącznie: ${allDyplom.length}`);
  for (const b of allDyplom) {
    console.log(`  #${b.id} id=${b.foreigner.id} ${b.foreigner.imie} ${b.foreigner.nazwisko} [${b.foreigner.obywatelstwo}] firma="${b.firma}" status=${b.status}`);
  }

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
