import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Cookie } from "lucide-react";

export const metadata = {
  title: "Polityka cookies",
  robots: { index: true, follow: true },
};

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Container className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Cookie className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold text-primary md:text-5xl">
          Polityka cookies
        </h1>
        <p className="mt-5 text-lg text-ink/60">
          Używamy wyłącznie ciasteczek niezbędnych do funkcjonowania serwisu i
          panelu klienta. Nie używamy ciasteczek marketingowych ani analitycznych
          stron trzecich.
        </p>

        <div className="mt-10 space-y-4 text-base leading-relaxed text-ink/80">
          <h2 className="font-display text-xl font-bold text-primary">
            Jakie ciasteczka używamy?
          </h2>
          <ul className="space-y-2 pl-6">
            <li className="list-disc">
              <strong>Ciasteczka sesyjne</strong> — utrzymują Cię zalogowanego
              w panelu klienta (Supabase Auth).
            </li>
            <li className="list-disc">
              <strong>NEXT_LOCALE</strong> — zapamiętuje Twój wybrany język
              interfejsu.
            </li>
            <li className="list-disc">
              <strong>getpermit-cookie-consent</strong> — zapamiętuje Twoją
              akceptację tego komunikatu (localStorage).
            </li>
          </ul>
        </div>
      </div>
    </Container>
  );
}
