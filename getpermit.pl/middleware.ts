import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const LOCALES = routing.locales;
// Regex do rozpoznania ścieżek panelu — z opcjonalnym prefiksem locale.
const PANEL_REGEX = new RegExp(`^/(?:(?:${LOCALES.join("|")})/)?panel(?:/|$)`);
const ADMIN_REGEX = new RegExp(`^/(?:(?:${LOCALES.join("|")})/)?admin(?:/|$)`);
// Strony auth które nie wymagają sesji (nie redirect-uj zalogowanego z login)
const PUBLIC_PANEL_PATHS = ["login", "verify", "callback"];

function isPublicPanelPath(pathname: string): boolean {
  // Zdejmij ewentualny prefix locale
  const withoutLocale = pathname.replace(
    new RegExp(`^/(?:${LOCALES.join("|")})`),
    ""
  );
  // /panel/login, /panel/verify, /panel/callback
  return PUBLIC_PANEL_PATHS.some((p) =>
    withoutLocale.startsWith(`/panel/${p}`)
  );
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPanelRoute = PANEL_REGEX.test(pathname);
  const isAdminRoute = ADMIN_REGEX.test(pathname);

  // Dla ścieżek MARKETINGOWYCH — przepuść przez next-intl (locale routing).
  // Panel/admin OMIJA next-intl middleware całkowicie, bo ich routes żyją
  // poza [locale] folder w App Routerze i nie są zarejestrowane w pathnames.
  if (!isPanelRoute && !isAdminRoute) {
    return intlMiddleware(request);
  }

  // Public auth pages — przepuść bez sprawdzania sesji.
  if (isPanelRoute && isPublicPanelPath(pathname)) {
    return NextResponse.next();
  }

  // Sprawdzenie sesji Supabase + auto-refresh tokenu.
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    // Nie zalogowany — redirect na login z zachowaniem return URL
    const loginUrl = new URL("/panel/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role check dla /admin robi się w server component przez requireStaff()
  // (świeży odczyt z public.users, zawsze aktualny). Middleware tylko sprawdza
  // czy user jest zalogowany — to wystarczy.

  return response;
}

export const config = {
  matcher: [
    // Wyklucz: api, _next, _vercel, statyczne pliki
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
