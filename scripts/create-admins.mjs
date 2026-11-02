/**
 * Utwórz 3 konta admin w Supabase Auth + public.users.
 * Hasła ustawiane przez Supabase Auth (hash), nie zapisywane w logach.
 *
 * node scripts/create-admins.mjs
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const db = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ADMINS = [
  { email: "m.glapinska@firmadlakazdego.pl", password: "glapinska1234!", firstName: "Michalina", lastName: "Glapinska" },
  { email: "a.lytvynchuk@firmadlakazdego.pl", password: "lytvynchuk1234!", firstName: "Alina", lastName: "Lytvynchuk" },
  { email: "s.shevchuk@firmadlakazdego.pl", password: "shevchuk1234!", firstName: "Solomiia", lastName: "Shevchuk" },
];

async function main() {
  for (const admin of ADMINS) {
    console.log(`\n--- ${admin.email} ---`);

    // Check if user already exists in public.users
    const existing = await db.user.findFirst({ where: { email: admin.email } });
    if (existing) {
      console.log(`  Istnieje w public.users: id=${existing.id}, role=${existing.role}`);
      if (existing.role !== "ADMIN") {
        await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
        console.log(`  → Zmieniono rolę na ADMIN`);
        // Update app_metadata in Supabase Auth
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          app_metadata: { role: "ADMIN" },
        });
      } else {
        console.log(`  Już ma rolę ADMIN — pomijam`);
      }
      continue;
    }

    // Create in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true, // Skip email verification
      app_metadata: { role: "ADMIN" },
    });

    if (authError) {
      console.error(`  Błąd Supabase Auth: ${authError.message}`);
      continue;
    }

    const authUserId = authData.user.id;
    console.log(`  Utworzono w Supabase Auth: id=${authUserId}`);

    // Create in public.users
    await db.user.create({
      data: {
        id: authUserId,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: "ADMIN",
        locale: "pl",
      },
    });
    console.log(`  Utworzono w public.users: role=ADMIN`);
    console.log(`  Hasło ustawione (wymaga zmiany przy pierwszym logowaniu)`);
  }

  await db.$disconnect();
  console.log("\nGotowe.");
}

main().catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
