import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Khoo /52 employment
  const bases = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 52 }, orderBy: { dataOd: "desc" } });
  console.log("=== Khoo /52 employment bases ===");
  for (const b of bases) {
    console.log(b.id, b.typ, b.status, b.dataOd?.toISOString().slice(0,10)??"-", b.dataDo?.toISOString().slice(0,10)??"-",
      "nr="+(b.nrDecyzji??b.nrOswiadczenia??"-"), "syg="+(b.sygnatura??"-"),
      "stan="+(b.stanowisko?.substring(0,50)??"-"), "umowa="+(b.rodzajUmowy??"-"),
      "firma="+(b.firma?.substring(0,30)??"-"), "src="+(b.sourceAttachmentId??"-"));
  }

  // Khoo /52 residence
  const res = await db.fdkResidenceBasis.findMany({ where: { foreignerId: 52 }, orderBy: { dataOd: "desc" } });
  console.log("\n=== Khoo /52 residence bases ===");
  for (const r of res) {
    console.log(r.id, r.typ, r.status, r.dataOd?.toISOString().slice(0,10)??"-", r.dataDo?.toISOString().slice(0,10)??"-",
      "nr="+(r.nrDecyzji??"-"), "karta="+(r.nrKartyPobytu??"-"), "urzad="+(r.urzad??"-"), "src="+(r.sourceAttachmentId??"-"));
  }

  // Abraham /47
  const ab = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 47, typ: "ZEZWOLENIE_A" } });
  console.log("\n=== Abraham /47 zezwolenia ===");
  for (const b of ab) {
    console.log(b.id, b.dataOd?.toISOString().slice(0,10)??"-", b.dataDo?.toISOString().slice(0,10)??"-",
      "nr="+(b.nrDecyzji??"-"), "syg="+(b.sygnatura??"-"), "src="+(b.sourceAttachmentId??"-"));
  }

  // Abramova /223
  const abr = await db.fdkEmploymentBase.findMany({ where: { foreignerId: 223 }, orderBy: { dataOd: "desc" } });
  console.log("\n=== Abramova /223 employment bases ===");
  for (const b of abr) {
    console.log(b.id, b.typ, b.status, b.dataOd?.toISOString().slice(0,10)??"-", b.dataDo?.toISOString().slice(0,10)??"-",
      "stan="+(b.stanowisko?.substring(0,50)??"-"), "firma="+(b.firma?.substring(0,30)??"-"), "src="+(b.sourceAttachmentId??"-"));
  }

  // Abramova w procedurze
  const abrF = await db.fdkForeigner.findUnique({ where: { id: 223 }, select: { upoDoreczone: true, upoUwagi: true } });
  console.log("\n=== Abramova /223 w procedurze ===");
  console.log("upoDoreczone:", abrF?.upoDoreczone?.toISOString().slice(0,10) ?? "null");
  console.log("upoUwagi:", abrF?.upoUwagi ?? "null");

  // Abraham /47 — all attachments in wazne with zezwolenie
  const abAtts = await db.fdkAttachment.findMany({
    where: { foreignerId: 47, folder: "wazne" },
    select: { id: true, nazwaPliku: true, detectedType: true },
    orderBy: { nazwaPliku: "asc" },
  });
  console.log("\n=== Abraham /47 attachments in wazne ===");
  for (const a of abAtts) {
    console.log(a.id, a.detectedType ?? "null", a.nazwaPliku);
  }

  // Abramova /223 — all attachments
  const abrAtts = await db.fdkAttachment.findMany({
    where: { foreignerId: 223 },
    select: { id: true, nazwaPliku: true, detectedType: true, folder: true },
    orderBy: { nazwaPliku: "asc" },
  });
  console.log("\n=== Abramova /223 all attachments ===");
  for (const a of abrAtts) {
    console.log(a.id, a.folder ?? "null", a.detectedType ?? "null", a.nazwaPliku);
  }

  // Khoo /52 — check specific attachment OCR results
  const khooAtts = await db.fdkAttachment.findMany({
    where: { foreignerId: 52, folder: "wazne" },
    select: { id: true, nazwaPliku: true, detectedType: true },
    orderBy: { nazwaPliku: "asc" },
  });
  console.log("\n=== Khoo /52 attachments in wazne ===");
  for (const a of khooAtts) {
    console.log(a.id, a.detectedType ?? "null", a.nazwaPliku);
  }

  await db.$disconnect();
}

main().catch(console.error);
