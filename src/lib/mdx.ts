import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export interface ServiceFrontmatter {
  title: string;
  slug: string;
  description: string;
  price: string;
  duration: string;
  icon: string;
  documents: string[];
  faq: { q: string; a: string }[];
}

export interface ServiceDoc {
  frontmatter: ServiceFrontmatter;
  content: string;
}

const CONTENT_ROOT = path.join(process.cwd(), "src", "content");

export async function getServiceDoc(
  locale: string,
  slug: string
): Promise<ServiceDoc | null> {
  const candidates = [
    path.join(CONTENT_ROOT, locale, "services", `${slug}.mdx`),
    path.join(CONTENT_ROOT, "pl", "services", `${slug}.mdx`), // fallback
  ];

  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const { data, content } = matter(raw);
      return {
        frontmatter: data as ServiceFrontmatter,
        content,
      };
    } catch {
      continue;
    }
  }

  return null;
}

export async function getAllServiceSlugs(): Promise<string[]> {
  const dir = path.join(CONTENT_ROOT, "pl", "services");
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}
