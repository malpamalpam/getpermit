import { createClient } from "@supabase/supabase-js";

/**
 * Admin client z service-role key — OMIJA RLS.
 *
 * Używać WYŁĄCZNIE w server-side kodzie (Route Handlers, Server Actions),
 * NIGDY nie importować w Client Components — narazi service-role key
 * na wyciek do klienta.
 *
 * Stosować do operacji wymagających pełnych uprawnień:
 * - tworzenie usera w public.users po magic-link signup
 * - wysyłanie zaproszeń (admin.inviteUserByEmail)
 * - operacje administracyjne ze strony staff
 * - zapisy do AccessLog (insert RLS jest deny by default)
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
