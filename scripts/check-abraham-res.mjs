import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const res = await db.fdkResidenceBasis.findMany({ where: { foreignerId: 47 } });
console.log("Residence bases for Abraham (#47):", JSON.stringify(res, null, 2));

const emp = await db.fdkEmploymentBase.findMany({
  where: { foreignerId: 47, status: { not: "NIEAKTYWNE" } },
  select: { id: true, typ: true, status: true, nrDecyzji: true, dataOd: true, dataDo: true, sourceAttachmentId: true },
});
console.log("\nEmployment bases (active):", JSON.stringify(emp, null, 2));

// Check foreigner fields
const f = await db.fdkForeigner.findUnique({
  where: { id: 47 },
  select: { decyzjaPobytowaDo: true, typDokumentuPobytowego: true, upoDoreczone: true, wProcesie: true },
});
console.log("\nForeigner fields:", JSON.stringify(f, null, 2));

await db.$disconnect();
