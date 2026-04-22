import { cookies, headers } from "next/headers";
import { routing } from "@/i18n/routing";

/**
 * Zwraca aktywny locale dla panelu klienta.
 *
 * Priorytet:
 * 1. Header x-panel-locale (ustawiany przez middleware z ?lang= lub default pl)
 * 2. Cookie NEXT_LOCALE (fallback)
 * 3. Domyślny locale (pl)
 */
export async function getPanelLocale(): Promise<string> {
  try {
    const hdrs = await headers();
    const fromHeader = hdrs.get("x-panel-locale");
    if (fromHeader && routing.locales.includes(fromHeader as never)) {
      return fromHeader;
    }
  } catch {}

  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
    if (fromCookie && routing.locales.includes(fromCookie as never)) {
      return fromCookie;
    }
  } catch {}

  return routing.defaultLocale;
}
