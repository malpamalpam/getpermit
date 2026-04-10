import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";
import Image from "next/image";
import { Mail, MapPin, ArrowRight } from "lucide-react";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tContact = useTranslations("contact.info");

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-primary/10 bg-primary text-white">
      <Container>
        <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="getpermit.pl"
                width={48}
                height={32}
                className="h-7 w-auto brightness-0 invert md:h-9"
              />
              <span className="font-display text-xl font-bold tracking-tight text-white md:text-2xl">
                get<span className="text-brand">permit</span>.pl
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              {t("tagline")}
            </p>
            <p className="mt-4 text-xs text-white/50">
              {siteConfig.legalName}
              <br />
              NIP: {siteConfig.company.nip}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-brand-light">
              {t("company")}
            </h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/uslugi" className="hover:text-white">
                  {tNav("services")}
                </Link>
              </li>
              <li>
                <Link href="/o-nas" className="hover:text-white">
                  {tNav("about")}
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="hover:text-white">
                  {tNav("contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-brand-light">
              {t("legal")}
            </h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/polityka-prywatnosci" className="hover:text-white">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/regulamin" className="hover:text-white">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white">
                  {t("cookies")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-brand-light">
              {tContact("address")}
            </h3>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-light" />
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="hover:text-white"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-light" />
                <span>
                  {siteConfig.contact.address.city}, {t("country")}
                </span>
              </li>
              <li>
                <Link
                  href="/kontakt"
                  className="inline-flex items-center gap-1 font-medium text-brand-light hover:text-white"
                >
                  {t("contactCta")}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">
          © {year} {siteConfig.legalName}. {t("rights")}
        </div>
      </Container>
    </footer>
  );
}
