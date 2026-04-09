import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const LOCALES = routing.locales;
const PANEL_REGEX = new RegExp(`^/panel(?:/|$)`);
const ADMIN_REGEX = new RegExp(`^/admin(?:/|$)`);
const PUBLIC_PANEL_PATHS = ["login", "verify", "callback"];

function isPublicPanelPath(pathname: string): boolean {
  return PUBLIC_PANEL_PATHS.some((p) =>
    pathname.startsWith(`/panel/${p}`)
  );
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPanelRoute = PANEL_REGEX.test(pathname);
  const isAdminRoute = ADMIN_REGEX.test(pathname);

  // Strony marketingowe (w tym `/`) → next-intl middleware
  if (!isPanelRoute && !isAdminRoute) {
    return intlMiddleware(request);
  }

  // Public auth pages → przepuść bez auth check
  if (isPanelRoute && isPublicPanelPath(pathname)) {
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

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
