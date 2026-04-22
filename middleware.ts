import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const LOCALES = routing.locales;
const PANEL_REGEX = new RegExp(`^/panel(?:/|$)`);
const ADMIN_REGEX = new RegExp(`^/admin(?:/|$)`);
const PUBLIC_PANEL_PATHS = ["login", "verify", "callback", "rejestracja", "reset-haslo", "nowe-haslo"];

function isPublicPanelPath(pathname: string): boolean {
  return PUBLIC_PANEL_PATHS.some((p) =>
    pathname.startsWith(`/panel/${p}`)
  );
}

/**
 * Wyciąga locale z URL Referer (np. /pl/kontakt → pl, /en/services → en).
 */
function extractLocaleFromReferer(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    const refUrl = new URL(referer);
    if (refUrl.host !== request.nextUrl.host) return null;
    const firstSegment = refUrl.pathname.split("/")[1];
    if (firstSegment && LOCALES.includes(firstSegment as never)) {
      return firstSegment;
    }
  } catch {}
  return null;
}

/** Czy Referer pochodzi z panelu/admina (nawigacja wewnątrz panelu)? */
function isRefererFromPanel(request: NextRequest): boolean {
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    const refUrl = new URL(referer);
    if (refUrl.host !== request.nextUrl.host) return false;
    return PANEL_REGEX.test(refUrl.pathname) || ADMIN_REGEX.test(refUrl.pathname);
  } catch {}
  return false;
}

/** Czyta NEXT_LOCALE cookie jeśli zawiera poprawny locale. */
function validCookieLocale(request: NextRequest): string | null {
  const v = request.cookies.get("NEXT_LOCALE")?.value;
  return v && LOCALES.includes(v as never) ? v : null;
}

/**
 * Ustala locale dla tras panelu:
 * 1. Referer ze strony marketingowej (np. /pl/kontakt → pl)
 * 2. Cookie NEXT_LOCALE — ale tylko przy nawigacji wewnątrz panelu
 *    (cookie mogło być ustawione przez middleware przy poprzednim request)
 * 3. Domyślny locale (pl)
 */
function resolvePanelLocale(request: NextRequest): string {
  return extractLocaleFromReferer(request)
    ?? (isRefererFromPanel(request) ? validCookieLocale(request) : null)
    ?? routing.defaultLocale;
}

/**
 * Tworzy response dla tras panelu/admina z:
 * - request header `x-panel-locale` (natychmiast widoczny w server components)
 * - cookie `NEXT_LOCALE` (persystentne dla przyszłych requestów)
 */
function panelResponse(request: NextRequest, locale: string, init?: { cookies?: Array<{ name: string; value: string; options?: Record<string, unknown> }> }): NextResponse {
  const headers = new Headers(request.headers);
  headers.set("x-panel-locale", locale);
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // Przepisz dodatkowe cookies (np. z Supabase)
  if (init?.cookies) {
    for (const c of init.cookies) {
      response.cookies.set(c.name, c.value, c.options);
    }
  }
  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const code = request.nextUrl.searchParams.get("code");

  // Supabase recovery/magic link redirect — przechwytujemy `code` na root URL
  // i przekierowujemy na /api/auth/callback
  if (code && (pathname === "/" || LOCALES.some((l) => pathname === `/${l}`))) {
    const callbackUrl = new URL("/api/auth/callback", request.url);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("next", "/panel/nowe-haslo");
    return NextResponse.redirect(callbackUrl);
  }

  const isPanelRoute = PANEL_REGEX.test(pathname);
  const isAdminRoute = ADMIN_REGEX.test(pathname);

  // Strony marketingowe (w tym `/`) → next-intl middleware
  if (!isPanelRoute && !isAdminRoute) {
    return intlMiddleware(request);
  }

  // Public auth pages → przepuść bez auth check, ale zsynchronizuj locale
  if (isPanelRoute && isPublicPanelPath(pathname)) {
    return panelResponse(request, resolvePanelLocale(request));
  }

  // Panel/admin chroniony — sprawdź sesję Supabase
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    // Brak env vars (np. build time) — przepuść, server component zrobi redirect
    return NextResponse.next();
  }

  // Tymczasowy response do obsługi cookies Supabase
  const tempResponse = NextResponse.next();
  const supabaseCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseCookies.push({ name, value, options });
            tempResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/panel/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return panelResponse(request, resolvePanelLocale(request), { cookies: supabaseCookies });
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
