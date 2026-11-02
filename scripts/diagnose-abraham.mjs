import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const f = await db.fdkForeigner.findUnique({
  where: { id: 47 },
  include: {
    employmentBases: { orderBy: { dataOd: "desc" } },
    residenceBases: { orderBy: { dataOd: "desc" } },
    attachments: { select: { id: true, nazwaPliku: true, folder: true, detectedType: true, opis: true }, orderBy: { uploadedAt: "asc" } },
    changeLogs: { where: { field: "scrape" }, orderBy: { changedAt: "desc" }, take: 50 },
  },
});

console.log(`\n=== Daniel Abraham (#47) ===\n`);

console.log("--- Podstawy zatrudnienia ---");
for (const b of f.employmentBases) {
  const nr = b.nrDecyzji || b.nrOswiadczenia || "(brak)";
  console.log(`  #${b.id} ${b.typ} [${b.status}] ${b.dataOd?.toISOString().slice(0,10)||"-"}–${b.dataDo?.toISOString().slice(0,10)||"-"} nr=${nr} src=${b.sourceAttachmentId||"-"} firma=${b.firma||"-"} stanowisko=${(b.stanowisko||"-").slice(0,40)}`);
}

console.log("\n--- Podstawy pobytu ---");
for (const b of f.residenceBases) {
  console.log(`  #${b.id} ${b.typ} [${b.status}] ${b.dataOd?.toISOString().slice(0,10)||"-"}–${b.dataDo?.toISOString().slice(0,10)||"-"} nr=${b.nrDecyzji||"(brak)"} src=${b.sourceAttachmentId||"-"}`);
}

console.log("\n--- Załączniki ---");
for (const a of f.attachments) {
  const opis = a.opis ? ` — ${a.opis.slice(0,80)}` : "";
  console.log(`  [${a.id}] ${a.nazwaPliku} folder=${a.folder||"-"} type=${a.detectedType||"-"}${opis}`);
}

// Look for WP/zezwolenie files
console.log("\n--- Pliki z 'zezwolenie' lub 'WP' lub '2024' w nazwie ---");
for (const a of f.attachments) {
  if (/zezwoleni|WRP|work.?permit|\bWP\b/i.test(a.nazwaPliku) || /2024/i.test(a.nazwaPliku)) {
    console.log(`  [${a.id}] ${a.nazwaPliku} folder=${a.folder||"-"} type=${a.detectedType||"-"}`);
  }
}

console.log("\n--- Ostatnie logi scrapowania ---");
for (const l of f.changeLogs.slice(0, 10)) {
  console.log(`  ${l.changedAt.toISOString().slice(0,16)} ${l.newValue?.slice(0,120)}`);
}

await db.$disconnect();
