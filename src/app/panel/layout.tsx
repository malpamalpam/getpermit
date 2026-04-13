import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";

/**
 * Layout panelu klienta. Żyje POZA [locale] folderze, więc samodzielnie
 * dostarcza next-intl context (locale + messages). Locale czyta z cookie
 * `NEXT_LOCALE` ustawianego przez next-intl middleware na pozostałych stronach.
 */
async function getCurrentLocale(): Promise<string> {
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
