import type { ReactNode } from "react";
import { Inter, Manrope } from "next/font/google";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

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
    <html lang={locale} className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen bg-surface" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
