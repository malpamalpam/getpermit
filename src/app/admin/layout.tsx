import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";

async function getCurrentLocale(): Promise<string> {
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

export default async function AdminLayout({
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
