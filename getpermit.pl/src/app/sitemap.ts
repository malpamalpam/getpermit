import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAllServices } from "@/lib/services";
import { siteConfig } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const services = await getAllServices();
  const now = new Date();

  const staticPaths = ["", "/uslugi", "/o-nas", "/kontakt", "/blog"];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const p of staticPaths) {
      entries.push({
        url: `${base}/${locale}${p}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: p === "" ? 1 : 0.8,
      });
    }
    for (const service of services) {
      entries.push({
        url: `${base}/${locale}/uslugi/${service.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
