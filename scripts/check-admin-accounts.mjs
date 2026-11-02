import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const db = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMAILS = [
  "m.glapinska@firmadlakazdego.pl",
  "a.lytvynchuk@firmadlakazdego.pl",
  "s.shevchuk@firmadlakazdego.pl",
];

for (const email of EMAILS) {
  console.log(`\n--- ${email} ---`);

  // Check public.users
  const dbUser = await db.user.findFirst({ where: { email } });
  console.log(`  DB: ${dbUser ? `id=${dbUser.id} role=${dbUser.role}` : "NIE ZNALEZIONO"}`);

  // Check Supabase Auth
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.log(`  Auth: ERROR ${error.message}`);
  } else {
    const authUser = data.users.find(u => u.email === email);
    if (authUser) {
      console.log(`  Auth: id=${authUser.id} confirmed=${!!authUser.email_confirmed_at} app_metadata=${JSON.stringify(authUser.app_metadata)}`);
    } else {
      console.log(`  Auth: NIE ZNALEZIONO`);
    }
  }
}

await db.$disconnect();
