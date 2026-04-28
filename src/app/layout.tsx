import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://getpermit.pl"),
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "getpermit.pl",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// Root layout is a pass-through — <html> and <body> are rendered in [locale]/layout.tsx
// so that the lang attribute can be set dynamically based on the current locale.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
