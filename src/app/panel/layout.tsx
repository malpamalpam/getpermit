import type { ReactNode } from "react";
import { Inter, Manrope } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getPanelLocale } from "@/lib/panel-locale";

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

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getPanelLocale();
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
