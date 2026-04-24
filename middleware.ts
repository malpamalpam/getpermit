import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const LOCALES = routing.locales as readonly string[];
const PANEL_REGEX = new RegExp(`^/panel(?:/|$)`);
const ADMIN_REGEX = new RegExp(`^/admin(?:/|$)`);
const PUBLIC_PANEL_PATHS = ["login", "verify", "callback", "rejestracja", "reset-haslo", "nowe-haslo"];

function isPublicPanelPath(pathname: string): boolean {
  return PUBLIC_PANEL_PATHS.some((p) =>
    pathname.startsWith(`/panel/${p}`)
  );
}

/**
 * Detect the best locale from the browser's Accept-Language header.
 * Falls back to defaultLocale if no supported language is found.
 */
function detectBrowserLocale(request: NextRequest): string {
  const acceptLang = request.headers.get("accept-language");
  if (!acceptLang) return routing.defaultLocale;

  // Parse Accept-Language: "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,pl;q=0.6"
  const langs = acceptLang
    .split(",")
    .map((part) => {
      const [lang, qPart] = part.trim().split(";");
      const q = qPart ? parseFloat(qPart.replace("q=", "")) : 1;
      return { lang: lang.trim().toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of langs) {
    // Exact match
    if (LOCALES.includes(lang)) return lang;
    // Prefix match: "ru-RU" → "ru", "uk-UA" → "uk"
    const prefix = lang.split("-")[0];
    if (LOCALES.includes(prefix)) return prefix;
  }

  return routing.defaultLocale;
}

/**
 * Create a Supabase client for middleware cookie handling.
 * This ensures session cookies are properly refreshed on every request,
 * preventing issues in browsers with strict cookie policies (e.g. Chrome).
 */
function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set on request so downstream server components can read them
            request.cookies.set(name, value);
            // Set on response so browser receives updated cookies
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
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

  // Brak env vars (np. build time) — przepuść, server component zrobi redirect
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  // Public auth pages → handle Supabase cookies (fixes Chrome) + detect locale
  if (isPanelRoute && isPublicPanelPath(pathname)) {
    const lang = request.nextUrl.searchParams.get("lang");
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
    // Priority: explicit ?lang= > cookie > browser Accept-Language > default
    const locale =
      (lang && LOCALES.includes(lang)) ? lang
      : (cookieLocale && LOCALES.includes(cookieLocale)) ? cookieLocale
      : detectBrowserLocale(request);

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("x-panel-locale", locale);
    const response = NextResponse.next({ request: { headers: reqHeaders } });
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 31536000, sameSite: "lax" });

    // Handle Supabase cookie refresh even on public pages (fixes Chrome cookie issues)
    const supabase = createSupabaseMiddlewareClient(request, response);
    await supabase.auth.getUser();

    return response;
  }

  // Panel/admin chroniony — sprawdź sesję Supabase
  const response = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/panel/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
