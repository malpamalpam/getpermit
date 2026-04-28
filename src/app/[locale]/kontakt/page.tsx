import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ContactForm } from "@/components/forms/ContactForm";
import { siteConfig } from "@/config/site";
import { Mail, MapPin, Clock, Phone } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("title"),
    description: t("metaDescription"),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const tInfo = await getTranslations("contact.info");

  return (
    <div className="bg-surface py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-primary/70">{t("subtitle")}</p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-8 lg:grid-cols-5">
          {/* Contact info */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <ContactInfoItem
                icon={<Phone className="h-5 w-5" />}
                label={tInfo("phone")}
                value={siteConfig.contact.phone}
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
              />
              <ContactInfoItem
                icon={<Mail className="h-5 w-5" />}
                label={tInfo("email")}
                value={siteConfig.contact.email}
                href={`mailto:${siteConfig.contact.email}`}
              />
              <ContactInfoItem
                icon={<MapPin className="h-5 w-5" />}
                label={tInfo("address")}
                value={`${siteConfig.contact.address.street}, ${siteConfig.contact.address.postal} ${siteConfig.contact.address.city}`}
              />
              <ContactInfoItem
                icon={<Clock className="h-5 w-5" />}
                label={tInfo("hours")}
                value={tInfo("hoursValue")}
              />
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white p-6 shadow-card md:p-10">
              <ContactForm />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function ContactInfoItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-primary/50">
          {label}
        </div>
        <div className="mt-0.5 font-medium text-primary">{value}</div>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block transition-opacity hover:opacity-80">
        {content}
      </a>
    );
  }
  return content;
}
