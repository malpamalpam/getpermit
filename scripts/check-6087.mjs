import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Check what base was created from attachment 6087
  const bases = await db.fdkEmploymentBase.findMany({
    where: { sourceAttachmentId: 6087 },
    select: { id: true, typ: true, status: true, foreignerId: true },
  });
  console.log("Podstawy z sourceAttachmentId=6087:");
  for (const b of bases) {
    console.log(`  #${b.id} ${b.typ} status=${b.status} profil=${b.foreignerId}`);
  }

  // Check attachment details
  const att = await db.fdkAttachment.findUnique({ where: { id: 6087 } });
  console.log(`\nZałącznik #6087: "${att?.nazwaPliku}" (profil ${att?.foreignerId})`);

  // This is "Cudzoziemiec - Stan sprawy_pobytowej_POMORSKI.pdf" — status check from voivodeship
  // NOT a decision document, should NOT create any base

  await db.$disconnect();
}
main().catch(console.error);
