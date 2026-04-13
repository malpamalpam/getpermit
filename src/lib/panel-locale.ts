import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";

/**
 * Czyta aktywny locale z cookie `NEXT_LOCALE` (ustawianego przez next-intl
 * middleware na stronach marketingowych). Używane w server components panelu,
 * które żyją poza [locale] folderze.
 */
export async function getPanelLocale(): Promise<string> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
  if (fromCookie && routing.locales.includes(fromCookie as never)) {
    return fromCookie;
  }
  return routing.defaultLocale;
}
