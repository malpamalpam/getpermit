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
 * Zwraca null jeśli nie da się wykryć.
 */
function extractLocaleFromReferer(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    const refUrl = new URL(referer);
    // Referer musi być z tego samego hosta
    if (refUrl.host !== request.nextUrl.host) return null;
    const firstSegment = refUrl.pathname.split("/")[1];
    if (firstSegment && LOCALES.includes(firstSegment as never)) {
      return firstSegment;
    }
  } catch {
    // Niepoprawny URL
  }
  return null;
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
    const refLocale = extractLocaleFromReferer(request);
    if (refLocale) {
      const res = NextResponse.next();
      res.cookies.set("NEXT_LOCALE", refLocale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      return res;
    }
    return NextResponse.next();
  }

  // Panel/admin chroniony — sprawdź sesję Supabase
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    // Brak env vars (np. build time) — przepuść, server component zrobi redirect
    return NextResponse.next();
  }

  const response = NextResponse.next();

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
            response.cookies.set(name, value, options);
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

  // Zsynchronizuj cookie NEXT_LOCALE z aktywnym językiem strony (Referer)
  const refLocale = extractLocaleFromReferer(request);
  if (refLocale) {
    response.cookies.set("NEXT_LOCALE", refLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
