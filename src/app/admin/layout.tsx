import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getPanelLocale } from "@/lib/panel-locale";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getPanelLocale();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen bg-surface">{children}</div>
    </NextIntlClientProvider>
  );
}
