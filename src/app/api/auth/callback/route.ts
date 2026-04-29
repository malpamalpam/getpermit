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
  let syncedUser;
  try {
    syncedUser = await syncUserFromAuth(data.user.id, data.user.email!, locale);
  } catch (e) {
    console.error("[auth/callback] user sync failed:", e);
  }

  // Ustaw cookie NEXT_LOCALE na locale z profilu użytkownika
  const userLocale = syncedUser?.locale ?? locale;

  // Admin/Staff → /admin, klient → /panel
  const targetPath = syncedUser && (syncedUser.role === "ADMIN" || syncedUser.role === "STAFF")
    ? "/admin"
    : next;
  const redirectUrl = new URL(
    userLocale === "pl" ? targetPath : `/${userLocale}${targetPath}`,
    request.url
  );
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("NEXT_LOCALE", userLocale, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });
  return response;
}
