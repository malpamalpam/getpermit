import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAllServices } from "@/lib/services";
import { getAllBlogPosts } from "@/lib/blog";
import { siteConfig } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const services = await getAllServices();
  const blogPosts = getAllBlogPosts();
  const now = new Date();

  const staticPages: Array<{
    path: string;
    priority: number;
    changeFrequency: "weekly" | "monthly";
  }> = [
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/uslugi", priority: 0.9, changeFrequency: "monthly" },
    { path: "/o-nas", priority: 0.8, changeFrequency: "monthly" },
    { path: "/kontakt", priority: 0.8, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/polityka-prywatnosci", priority: 0.3, changeFrequency: "monthly" },
    { path: "/regulamin", priority: 0.3, changeFrequency: "monthly" },
    { path: "/cookies", priority: 0.3, changeFrequency: "monthly" },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${base}/${locale}${page.path}`,
        lastModified: now,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
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
    for (const post of blogPosts) {
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
