import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase.auth.admin.listUsers({ perPage: 50 });

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log(`Total users: ${data.users.length}\n`);
data.users.forEach((u) => {
  console.log(`ID:        ${u.id}`);
  console.log(`Email:     ${u.email}`);
  console.log(`Confirmed: ${u.email_confirmed_at ? "YES" : "NO"}`);
  console.log(`Role:      ${u.role}`);
  console.log(`AppMeta:   ${JSON.stringify(u.app_metadata)}`);
  console.log(`Created:   ${u.created_at}`);
  console.log("---");
});
