import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { type Service, localized } from "@/lib/services";

export function ServiceCard({ service }: { service: Service }) {
  const t = useTranslations("services");
  const locale = useLocale();

  const title = localized(service.title, locale);
  const desc = localized(service.shortDescription, locale);

  return (
    <Link
      href={{ pathname: "/uslugi/[slug]", params: { slug: service.slug } }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-primary p-8 transition-all hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_12px_40px_rgba(37,99,235,0.25)]"
    >
      {/* Top accent bar on hover */}
      <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-accent to-brand transition-transform group-hover:scale-x-100" />

      <h3 className="font-display text-lg font-bold text-white md:text-xl">
        {title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-white/60">
        {desc}
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        {service.price ? (
          <span className="text-sm">
            <span className="text-white/40">{t("from")}</span>{" "}
            <span className="font-bold text-brand-light">{service.price}</span>
          </span>
        ) : (
          <span className="text-sm text-white/40">&nbsp;</span>
        )}
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-400 transition-transform group-hover:translate-x-1">
          {t("viewDetails")}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
