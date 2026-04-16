import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAllServices } from "@/lib/services";
import { getAllBlogPosts } from "@/lib/blog";
import { siteConfig } from "@/config/site";
import { getLocalizedSlug, SERVICE_BASE_PATH } from "@/lib/service-slugs";

/** Localized static page paths */
const STATIC_PAGE_PATHS: Record<string, Record<string, string>> = {
  "": { pl: "", en: "", ru: "", uk: "" },
  uslugi: { pl: "/uslugi", en: "/services", ru: "/uslugi", uk: "/poslugy" },
  "o-nas": { pl: "/o-nas", en: "/about", ru: "/o-nas", uk: "/pro-nas" },
  kontakt: { pl: "/kontakt", en: "/contact", ru: "/kontakty", uk: "/kontakty" },
  blog: { pl: "/blog", en: "/blog", ru: "/blog", uk: "/blog" },
  "polityka-prywatnosci": {
    pl: "/polityka-prywatnosci",
    en: "/privacy-policy",
    ru: "/politika-konfidentsialnosti",
    uk: "/polityka-konfidentsijnosti",
  },
  regulamin: { pl: "/regulamin", en: "/terms", ru: "/pravila", uk: "/pravyla" },
  cookies: { pl: "/cookies", en: "/cookies", ru: "/cookies", uk: "/cookies" },
};

const STATIC_PRIORITIES: Record<string, number> = {
  "": 1.0,
  uslugi: 0.9,
  "o-nas": 0.8,
  kontakt: 0.8,
  blog: 0.7,
  "polityka-prywatnosci": 0.3,
  regulamin: 0.3,
  cookies: 0.3,
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const services = await getAllServices();
  const blogPosts = getAllBlogPosts();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    // Static pages
    for (const [key, paths] of Object.entries(STATIC_PAGE_PATHS)) {
      const path = paths[locale] ?? paths.pl;
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified: now,
        changeFrequency: key === "" || key === "blog" ? "weekly" : "monthly",
        priority: STATIC_PRIORITIES[key] ?? 0.5,
      });
    }

    // Services
    const basePath = SERVICE_BASE_PATH[locale] ?? "uslugi";
    for (const service of services) {
      const localizedSlug = getLocalizedSlug(service.slug, locale);
      entries.push({
        url: `${base}/${locale}/${basePath}/${localizedSlug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    // Dedykowana podstrona "Dla pracodawców"
    entries.push({
      url: `${base}/${locale}/${basePath}/${getLocalizedSlug("dla-pracodawcow", locale)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    });

    // Blog posts
    const localePosts = getAllBlogPosts(locale);
    for (const post of localePosts) {
      entries.push({
        url: `${base}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
