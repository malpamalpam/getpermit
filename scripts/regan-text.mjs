import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const db = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const att = await db.fdkAttachment.findFirst({
  where: { foreignerId: 175, nazwaPliku: { contains: "decyzja" }, typPliku: "pdf" },
});
console.log(`Plik: ${att.nazwaPliku}`);

const { data } = await supabase.storage.from("fdk-attachments").download(att.storagePath);
const buffer = await data.arrayBuffer();
const pdfParse = (await import("pdf-parse")).default;
const pdf = await pdfParse(Buffer.from(buffer));
const text = pdf.text;

// Print full text around "wynagrodz" and around numbers like 21
const lines = text.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (/wynagrodz|21[\s.,]*0{2,3}|21\s*z[łl]|godzin|wymiar|100\s*h/i.test(lines[i])) {
    console.log(`L${i}: ${lines[i].trim()}`);
  }
}

// Also print 500 chars around first "wynagrodz"
const idx = text.search(/wynagrodz/i);
if (idx >= 0) {
  console.log("\n--- KONTEKST ---");
  console.log(text.substring(idx - 100, idx + 400));
}

await db.$disconnect();
