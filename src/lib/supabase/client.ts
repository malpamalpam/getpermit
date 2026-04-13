"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Klient Supabase do użycia w Client Components.
 * Singleton — jeden instance per zakładka przeglądarki.
 */
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return browserClient;
}
