import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Klient Supabase do użycia w Server Components, Server Actions i Route Handlers.
 * Sesję czyta i zapisuje przez Next.js cookies (HTTP-only).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as CookieOptions);
            });
          } catch {
            // setAll wywołane z Server Component — można zignorować, bo refresh
            // tokena obsłuży middleware.
          }
        },
      },
    }
  );
}
