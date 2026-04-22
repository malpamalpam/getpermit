import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";

/**
 * Layout panelu klienta. Żyje POZA [locale] folderze, więc samodzielnie
 * dostarcza next-intl context (locale + messages).
 *
 * Priorytet locale:
 * 1. Header x-panel-locale (ustawiany przez middleware z ?lang= param)
 * 2. Cookie NEXT_LOCALE (ustawiane przez next-intl na stronach marketingowych)
 * 3. Domyślny locale (pl)
 */
async function getCurrentLocale(): Promise<string> {
  // Header z middleware — natychmiastowy, rozwiązuje problem opóźnienia cookie
  const hdrs = await headers();
  const fromHeader = hdrs.get("x-panel-locale");
  if (fromHeader && routing.locales.includes(fromHeader as never)) {
    return fromHeader;
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("NEXT_LOCALE")?.value;
  if (fromCookie && routing.locales.includes(fromCookie as never)) {
    return fromCookie;
  }
  return routing.defaultLocale;
}

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getCurrentLocale();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen bg-surface">{children}</div>
    </NextIntlClientProvider>
  );
}
