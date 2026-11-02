/**
 * Find profiles with "rezydent" attachment but no OD_REZYDENT_UE base.
 * Also find "pobyt stały" attachments without OD_POBYT_STALY.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("=== Profile z załącznikiem 'rezydent UE' bez podstawy OD_REZYDENT_UE ===\n");

  const attachments = await db.fdkAttachment.findMany({
    where: {
      nazwaPliku: { contains: "rezydent", mode: "insensitive" },
      typPliku: "pdf",
    },
    select: { id: true, foreignerId: true, nazwaPliku: true },
  });

  const foreignerIds = [...new Set(attachments.map(a => a.foreignerId))];

  for (const fid of foreignerIds) {
    const hasBase = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: fid, typ: { in: ["OD_REZYDENT_UE", "DOSTEP_REZYDENT_UE"] } },
    });
    if (!hasBase) {
      const f = await db.fdkForeigner.findUnique({ where: { id: fid }, select: { id: true, imie: true, nazwisko: true } });
      const atts = attachments.filter(a => a.foreignerId === fid);
      console.log(`  profil ${fid} (${f?.imie ?? ""} ${f?.nazwisko}) — BRAK OD_REZYDENT_UE`);
      for (const a of atts) console.log(`    #${a.id} ${a.nazwaPliku}`);
    }
  }

  // Also check "pobyt stały" / "pobyt staly"
  console.log("\n=== Profile z załącznikiem 'pobyt stały' bez OD_POBYT_STALY ===\n");
  const stalAtt = await db.fdkAttachment.findMany({
    where: {
      OR: [
        { nazwaPliku: { contains: "pobyt_staly", mode: "insensitive" } },
        { nazwaPliku: { contains: "pobyt stały", mode: "insensitive" } },
        { nazwaPliku: { contains: "pobyt_stały", mode: "insensitive" } },
        { nazwaPliku: { contains: "pobyt staly", mode: "insensitive" } },
        { nazwaPliku: { contains: "długoterminow", mode: "insensitive" } },
      ],
      typPliku: "pdf",
    },
    select: { id: true, foreignerId: true, nazwaPliku: true },
  });

  const stalIds = [...new Set(stalAtt.map(a => a.foreignerId))];
  for (const fid of stalIds) {
    const hasBase = await db.fdkEmploymentBase.findFirst({
      where: { foreignerId: fid, typ: { in: ["OD_POBYT_STALY", "DOSTEP_POBYT_STALY", "OD_REZYDENT_UE", "DOSTEP_REZYDENT_UE"] } },
    });
    if (!hasBase) {
      const f = await db.fdkForeigner.findUnique({ where: { id: fid }, select: { id: true, imie: true, nazwisko: true } });
      const atts = stalAtt.filter(a => a.foreignerId === fid);
      console.log(`  profil ${fid} (${f?.imie ?? ""} ${f?.nazwisko}) — BRAK OD_POBYT_STALY/OD_REZYDENT_UE`);
      for (const a of atts) console.log(`    #${a.id} ${a.nazwaPliku}`);
    }
  }

  await db.$disconnect();
}
main().catch(console.error);
