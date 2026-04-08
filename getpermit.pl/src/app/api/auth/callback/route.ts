import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncUserFromAuth } from "@/lib/sync-user";

/**
 * Magic link callback. Supabase generuje link postaci:
 *   {SITE_URL}/api/auth/callback?code=xxx&locale=pl&next=/panel
 *
 * Wymieniamy code na sesję (PKCE), synchronizujemy public.users i przekierowujemy.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const locale = url.searchParams.get("locale") ?? "pl";
  const next = url.searchParams.get("next") ?? "/panel";

  if (!code) {
    return NextResponse.redirect(
      new URL("/panel/login?error=missing_code", request.url)
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchange failed:", error?.message);
    return NextResponse.redirect(
      new URL("/panel/login?error=callback_failed", request.url)
    );
  }

  // Synchronizacja public.users (idempotentna)
  try {
    await syncUserFromAuth(data.user.id, data.user.email!, locale);
  } catch (e) {
    console.error("[auth/callback] user sync failed:", e);
    // Nie blokujemy logowania — sesja Supabase jest ważna; ponowimy sync
    // przy następnym requeście (lib/auth.ts getCurrentUser).
  }

  // Przekierowanie z prefiksem locale, jeśli inny niż domyślny (pl)
  const redirectPath = locale === "pl" ? next : `/${locale}${next}`;
  return NextResponse.redirect(new URL(redirectPath, request.url));
}
