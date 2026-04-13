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
                  {siteConfig.contact.address.street}, {siteConfig.contact.address.postal} {siteConfig.contact.address.city}
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

        <div className="flex flex-col items-center gap-4 border-t border-white/10 py-6">
          <div className="flex items-center gap-5">
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-white/50 transition-colors hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white/50 transition-colors hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123s-.012 3.056-.06 4.122c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06s-3.056-.012-4.122-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
              </svg>
            </a>
            <a
              href={siteConfig.social.telegram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="text-white/50 transition-colors hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012.056 0h-.112zM17.9 8.03c-.027.277-.18 1.96-.4 3.57l-1.3 5.53s-.098.43-.455.45c-.357.02-.594-.23-.594-.23l-2.66-2.14-1.29-.62 2.22-1.87s2.38-2.16 2.48-2.45c.012-.036-.02-.054-.058-.038-.15.06-3.11 1.98-5.79 3.66l-1.7-.55-2.43-.77s-.37-.14-.41-.43c-.03-.29.42-.44.42-.44l9.78-3.84s.8-.36.8.23z" />
              </svg>
            </a>
          </div>
          <div className="text-xs text-white/50">
            © {year} {siteConfig.legalName}. {t("rights")}
          </div>
        </div>
      </Container>
    </footer>
  );
}
