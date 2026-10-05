import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Search for "069" in ANY text field across bases and foreigners
  console.log("=== Szukam '069' we wszystkich polach ===\n");

  const allBases = await db.fdkEmploymentBase.findMany({
    include: { foreigner: { select: { id: true, nazwisko: true, imie: true, nrPaszportu: true } } },
  });

  for (const b of allBases) {
    const fields = { nrDecyzji: b.nrDecyzji, nrOswiadczenia: b.nrOswiadczenia, sygnatura: b.sygnatura, uwagi: b.uwagi, stanowisko: b.stanowisko, firma: b.firma, wynagrodzenie: b.wynagrodzenie, uwagiKp: b.uwagiKp, uwagiUa: b.uwagiUa };
    for (const [key, val] of Object.entries(fields)) {
      if (val && val.toString().trim() === "069") {
        console.log(`  BASE #${b.id} (profil ${b.foreignerId} ${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}): ${key}="${val}"`);
      }
    }
  }

  // Check foreigner fields too
  const foreigners = await db.fdkForeigner.findMany({
    where: { id: { in: [77, 78, 79, 91, 100, 118, 119, 122, 131] } },
  });
  for (const f of foreigners) {
    for (const [key, val] of Object.entries(f)) {
      if (val && typeof val === "string" && val.trim() === "069") {
        console.log(`  FOREIGNER #${f.id} (${f.imie ?? ""} ${f.nazwisko}): ${key}="${val}"`);
      }
    }
  }

  // Also check detailed documents table
  try {
    const docs = await db.fdkDetailedDocument.findMany({
      where: { foreignerId: { in: [77, 78, 79, 91, 100, 118, 119, 122, 131] } },
    });
    for (const d of docs) {
      for (const [key, val] of Object.entries(d)) {
        if (val && typeof val === "string" && val.includes("069")) {
          console.log(`  DOC #${d.id} (profil ${d.foreignerId}): ${key}="${val}"`);
        }
      }
    }
  } catch { console.log("  (brak tabeli fdkDetailedDocument)"); }

  // === SWAP: check profiles 52, 119, 305, 180 for dataOd that looks like expiry ===
  console.log("\n=== Swap check: dataOd > 2027 lub dataOd jako data ważności ===\n");
  for (const id of [52, 119, 305, 180]) {
    const f = await db.fdkForeigner.findUnique({
      where: { id },
      include: { employmentBases: true },
    });
    if (!f) continue;
    for (const b of f.employmentBases) {
      const od = b.dataOd?.toISOString().slice(0,10);
      const _do = b.dataDo?.toISOString().slice(0,10);
      // Flag if dataOd looks suspicious (matches dataDo pattern or is far future)
      if (od && !_do && new Date(od) > new Date("2027-10-05")) {
        console.log(`  SWAP? profil ${id} #${b.id} ${b.typ}: dataOd=${od}, dataDo=null`);
      }
      if (od && _do && od === _do) {
        console.log(`  SAME? profil ${id} #${b.id} ${b.typ}: dataOd=dataDo=${od}`);
      }
    }
  }

  // Global scan: any base with dataOd > 2027-10 and dataDo=null
  console.log("\n=== Global: dataOd > 2027-10 AND dataDo=null ===\n");
  const suspects = await db.fdkEmploymentBase.findMany({
    where: {
      dataOd: { gt: new Date("2027-10-05") },
      dataDo: null,
    },
    include: { foreigner: { select: { id: true, nazwisko: true, imie: true } } },
  });
  for (const b of suspects) {
    console.log(`  profil ${b.foreigner.id} (${b.foreigner.imie ?? ""} ${b.foreigner.nazwisko}) #${b.id} ${b.typ}: dataOd=${b.dataOd?.toISOString().slice(0,10)}, dataDo=null`);
  }
  if (suspects.length === 0) console.log("  Brak podejrzanych.");

  // Check the specific values mentioned: 52=2029-08-12, 119=2028-04-22
  console.log("\n=== Szukam konkretnych dat z audytu ===\n");
  const targetDates = ["2029-08-12", "2028-04-22", "2029", "2028"];
  for (const id of [52, 119, 305, 180]) {
    const bases = await db.fdkEmploymentBase.findMany({ where: { foreignerId: id } });
    for (const b of bases) {
      const od = b.dataOd?.toISOString().slice(0,10) ?? "";
      const _do = b.dataDo?.toISOString().slice(0,10) ?? "";
      if (od.startsWith("2029") || od.startsWith("2028") || _do.startsWith("2029") || _do.startsWith("2028")) {
        console.log(`  profil ${id} #${b.id} ${b.typ} status=${b.status}: od=${od||"null"} do=${_do||"null"}`);
      }
    }
  }

  await db.$disconnect();
}
main().catch(console.error);
