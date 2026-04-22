import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";

/**
 * Zwraca aktywny locale dla panelu klienta.
 *
 * Priorytet:
 * 1. Locale zalogowanego użytkownika z bazy danych (ustawiany przy logowaniu
 *    na podstawie aktywnego języka strony oraz w ustawieniach profilu)
 * 2. Cookie `NEXT_LOCALE` (ustawiane przez next-intl middleware na stronach
 *    marketingowych — fallback dla niezalogowanych stron panelu)
 * 3. Domyślny locale (pl)
 */
export async function getPanelLocale(): Promise<string> {
  // Dla zalogowanych użytkowników — locale z bazy danych
  try {
    const user = await getCurrentUser();
    if (user?.locale && routing.locales.includes(user.locale as never)) {
      return user.locale;
    }
  } catch {
    // Ignoruj — użytkownik niezalogowany lub błąd sesji
  }

  // Fallback na cookie (strony publiczne panelu: login, rejestracja itp.)
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
  if (fromCookie && routing.locales.includes(fromCookie as never)) {
    return fromCookie;
  }

  return routing.defaultLocale;
}
