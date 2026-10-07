/**
 * Scrape unprocessed attachments for profile 358 (Murad Aliyev).
 * Key files: decyzja REZYDENT UE, KP 2025-2030, decyzja studia.
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
const db = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CHANGED_BY = "scrape-358-aliyev";

async function main() {
  const f = await db.fdkForeigner.findUnique({
    where: { id: 358 },
    include: { employmentBases: true, attachments: true },
  });

  // Attachments to scrape (skip paszport, opłata, rodo, umowa)
  const toScrape = [711, 712, 714]; // rezydent UE, studia, KP

  for (const attId of toScrape) {
    const att = f.attachments.find(a => a.id === attId);
    if (!att) { console.log(`Załącznik #${attId}: nie znaleziony`); continue; }
    console.log(`\n=== Scrapuję #${attId}: ${att.nazwaPliku} ===`);

    // Check if already scraped
    const existing = f.employmentBases.find(b => b.sourceAttachmentId === attId);
    if (existing) { console.log(`  Już zescrapowany → podstawa #${existing.id}`); continue; }

    // Download and parse
    const { data } = await supabase.storage.from("fdk-attachments").download(att.storagePath);
    if (!data) { console.log("  Nie można pobrać"); continue; }
    const buffer = await data.arrayBuffer();

    // Use parseOswiadczeniePdf with OCR fallback
    const { parseOswiadczeniePdf } = await import("../src/lib/pdf-parser.ts");
    const result = await parseOswiadczeniePdf(buffer, { ocrFallback: true, filename: att.nazwaPliku });

    if (!result || !result.detectedType || result.detectedType === "ODWOLANIE") {
      console.log(`  Parser zwrócił: ${result?.detectedType ?? "null"} — pomijam`);
      continue;
    }

    console.log(`  Typ: ${result.detectedType}`);
    console.log(`  Od: ${result.dataOd ?? "null"}`);
    console.log(`  Do: ${result.dataDo ?? "null"}`);
    console.log(`  Nr: ${result.nrDecyzji ?? "-"}`);
    console.log(`  Wyn: ${result.wynagrodzenie ?? "-"}`);

    // Use document-classifier for proper type + secondary
    const { classifyDocument } = await import("../src/lib/document-classifier.ts");
    const cls = classifyDocument(
      // For OCR results, use detected type info
      `art. 211 rezydent długoterminowy UE`,
      att.nazwaPliku
    );

    // Override type based on filename for known cases
    let finalType = result.detectedType;
    let secondaryType = null;
    const fn = att.nazwaPliku.toLowerCase();

    if (fn.includes("rezydent")) {
      finalType = "OD_REZYDENT_UE";
      console.log(`  → Override typ: OD_REZYDENT_UE (z nazwy pliku)`);
    } else if (fn.includes("kp") && fn.includes("2025") && fn.includes("2030")) {
      finalType = "KARTA_POBYTU";
      console.log(`  → Override typ: KARTA_POBYTU (z nazwy pliku)`);
    } else if (fn.includes("studia")) {
      finalType = "TRC_STUDIA";
      secondaryType = "OD_STUDENT";
      console.log(`  → Override typ: TRC_STUDIA (z nazwy pliku)`);
    }

    // Determine indefinite
    const isIndefinite = ["OD_REZYDENT_UE", "OD_POBYT_STALY", "OD_UCHODZCA", "OD_OCHRONA_UZUP"].includes(finalType);

    // Create base
    const base = await db.fdkEmploymentBase.create({
      data: {
        foreignerId: 358,
        typ: finalType,
        status: isIndefinite ? "AKTYWNE" : (result.dataDo ? "AKTYWNE" : "BRAK_DANYCH"),
        dataOd: result.dataOd ? new Date(result.dataOd) : null,
        dataDo: isIndefinite ? null : (result.dataDo ? new Date(result.dataDo) : null),
        nrDecyzji: result.nrDecyzji ?? null,
        stanowisko: result.stanowisko ?? null,
        firma: result.firma ?? null,
        wynagrodzenie: result.wynagrodzenie ?? null,
        sourceAttachmentId: attId,
      },
    });
    console.log(`  Utworzono podstawę #${base.id} (${finalType})`);

    await db.fdkChangeLog.create({
      data: {
        foreignerId: 358, changedBy: CHANGED_BY, field: "scrape",
        oldValue: null,
        newValue: `Utworzono podstawę #${base.id} (${finalType}) z pliku: ${att.nazwaPliku}`,
      },
    });

    // Create secondary if needed
    if (secondaryType) {
      const sec = await db.fdkEmploymentBase.create({
        data: {
          foreignerId: 358,
          typ: secondaryType,
          status: "AKTYWNE",
          dataOd: result.dataOd ? new Date(result.dataOd) : null,
          dataDo: result.dataDo ? new Date(result.dataDo) : null,
        },
      });
      console.log(`  + secondary #${sec.id} (${secondaryType})`);
    }
  }

  // Update decyzjaPobytowaDo if we added indefinite
  const hasIndefinite = await db.fdkEmploymentBase.findFirst({
    where: { foreignerId: 358, typ: "OD_REZYDENT_UE", status: "AKTYWNE" },
  });
  if (hasIndefinite) {
    await db.fdkForeigner.update({ where: { id: 358 }, data: { decyzjaPobytowaDo: null } });
    console.log(`\nProfil 358: decyzjaPobytowaDo → null (rezydent UE = bezterminowy)`);
  }

  // Show final state
  console.log(`\n=== Stan końcowy profilu 358 ===`);
  const final = await db.fdkForeigner.findUnique({
    where: { id: 358 },
    include: { employmentBases: { orderBy: { id: "asc" } } },
  });
  console.log(`decyzjaPobytowaDo: ${final.decyzjaPobytowaDo?.toISOString().slice(0,10) ?? "null"}`);
  for (const b of final.employmentBases) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} od=${b.dataOd?.toISOString().slice(0,10) ?? "null"} do=${b.dataDo?.toISOString().slice(0,10) ?? "null"} src=${b.sourceAttachmentId ?? "-"}`);
  }

  await db.$disconnect();
}
main().catch(console.error);
