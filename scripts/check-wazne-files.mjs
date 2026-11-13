import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// Check Liudvichenka (#116), Skuratovich (#142), Khoo (#52) "wazne" files
for (const fid of [116, 142, 52]) {
  const f = await db.fdkForeigner.findUnique({ where: { id: fid }, select: { imie: true, nazwisko: true } });
  const atts = await db.fdkAttachment.findMany({
    where: { foreignerId: fid, folder: "wazne" },
    select: { id: true, nazwaPliku: true, detectedType: true, kategoria: true, folderManual: true },
    orderBy: { uploadedAt: "asc" },
  });
  console.log(`\n=== ${f.imie} ${f.nazwisko} (#${fid}) — Ważne (${atts.length}) ===`);
  for (const a of atts) {
    console.log(`  [${a.id}] ${a.nazwaPliku} type=${a.detectedType||"-"} kat=${a.kategoria} manual=${a.folderManual}`);
  }
}

// Khoo NIEAKTYWNE bases
const khooBases = await db.fdkEmploymentBase.findMany({
  where: { foreignerId: 52, status: "NIEAKTYWNE" },
  select: { id: true, typ: true, nrDecyzji: true, dataOd: true, dataDo: true, sourceAttachmentId: true, uwagi: true },
  orderBy: { id: "asc" },
});
console.log(`\n=== Khoo (#52) — NIEAKTYWNE bases (${khooBases.length}) ===`);
for (const b of khooBases) {
  console.log(`  #${b.id} ${b.typ} nr=${b.nrDecyzji||"-"} ${b.dataOd?.toISOString().slice(0,10)||"-"}–${b.dataDo?.toISOString().slice(0,10)||"-"} src=${b.sourceAttachmentId||"-"} uwagi=${(b.uwagi||"-").slice(0,60)}`);
}

await db.$disconnect();
