import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://getpermit.pl"),
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "getpermit.pl",
    images: [{ url: "/logo.jpg", width: 600, height: 400, alt: "getpermit.pl" }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let lang = "pl";
  try {
    lang = await getLocale();
  } catch {
    // Panel/admin routes don't have intl context — fallback to pl
  }

  return (
    <html lang={lang} className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        {/* Ensure lang is correct even if SSR falls back to pl */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.lang=location.pathname.match(/^\\/(pl|en|ru|uk)/)?.[1]||'pl'`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K7N4WHMH');`,
          }}
        />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K7N4WHMH"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
