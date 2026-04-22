import { cookies, headers } from "next/headers";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";

function isValidLocale(v: string | null | undefined): v is string {
  return !!v && routing.locales.includes(v as never);
}

/**
 * Zwraca aktywny locale dla panelu klienta.
 *
 * Priorytet:
 * 1. Header `x-panel-locale` ustawiany przez middleware — odzwierciedla
 *    aktywny język strony marketingowej (Referer) lub domyślny (pl)
 * 2. Locale zalogowanego użytkownika z bazy danych
 * 3. Cookie `NEXT_LOCALE` (fallback)
 * 4. Domyślny locale (pl)
 */
export async function getPanelLocale(): Promise<string> {
  // Header ustawiany przez middleware — aktywny język strony
  try {
    const hdrs = await headers();
    const fromHeader = hdrs.get("x-panel-locale");
    if (isValidLocale(fromHeader)) {
      return fromHeader;
    }
  } catch {
    // Ignoruj
  }

  // Dla zalogowanych użytkowników — locale z bazy danych
  try {
    const user = await getCurrentUser();
    if (isValidLocale(user?.locale)) {
      return user.locale;
    }
  } catch {
    // Ignoruj — użytkownik niezalogowany lub błąd sesji
  }

  // Fallback na cookie
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
  if (isValidLocale(fromCookie)) {
    return fromCookie;
  }

  return routing.defaultLocale;
}
