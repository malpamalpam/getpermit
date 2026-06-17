import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAllServices } from "@/lib/services";
import { getAllBlogPosts } from "@/lib/blog";
import { siteConfig } from "@/config/site";
import { getLocalizedSlug, SERVICE_BASE_PATH } from "@/lib/service-slugs";
import { getLocalizedBlogSlug } from "@/lib/blog-slugs";

const STATIC_PAGE_PATHS: Record<string, Record<string, string>> = {
  "": { pl: "", en: "", ru: "", uk: "" },
  uslugi: { pl: "/uslugi", en: "/services", ru: "/uslugi", uk: "/poslugy" },
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
  kontakt: 0.8,
  blog: 0.7,
  "polityka-prywatnosci": 0.3,
  regulamin: 0.3,
  cookies: 0.3,
};

const SITE_LAST_MODIFIED = "2025-06-12";

/**
 * Generate sitemap index — one sitemap per locale.
 */
export async function generateSitemaps() {
  return routing.locales.map((locale) => ({ id: locale }));
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  const locale = id;
  const base = siteConfig.url;
  const services = await getAllServices();
  const siteDate = new Date(SITE_LAST_MODIFIED);
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  for (const [key, paths] of Object.entries(STATIC_PAGE_PATHS)) {
    const path = paths[locale] ?? paths.pl;
    entries.push({
      url: `${base}/${locale}${path}`,
      lastModified: siteDate,
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
      lastModified: siteDate,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Employers page
  entries.push({
    url: `${base}/${locale}/${basePath}/${getLocalizedSlug("dla-pracodawcow", locale)}`,
    lastModified: siteDate,
    changeFrequency: "monthly",
    priority: 0.8,
  });

  // Blog posts
  const localePosts = getAllBlogPosts(locale);
  for (const post of localePosts) {
    entries.push({
      url: `${base}/${locale}/blog/${getLocalizedBlogSlug(post.slug, locale)}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
