/**
 * Prosta baza wiedzy chatbota — wczytywana statycznie z blog postów.
 * MVP RAG bez Supabase/embeddingów: używamy keyword search po zawartości.
 */

import { getAllBlogPosts, type BlogPost } from "@/lib/blog";
import { SERVICE_CATEGORIES, localized, type Service } from "@/lib/services";
import { siteConfig } from "@/config/site";

interface KnowledgeChunk {
  title: string;
  content: string;
  source: string; // URL
  category: "company" | "service" | "blog" | "faq";
}

/** Wyciąga czysty tekst z HTML */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Buduje statyczną bazę wiedzy dla danego locale */
export function buildKnowledgeBase(locale: string): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];

  // 1. Informacje o firmie
  chunks.push({
    title: "O getpermit.pl",
    content: `getpermit.pl to usługa legalizacji pobytu cudzoziemców prowadzona przez ${siteConfig.legalName}. NIP: ${siteConfig.company.nip}. Adres: ${siteConfig.contact.address.street}, ${siteConfig.contact.address.postal} ${siteConfig.contact.address.city}. Kontakt: telefon ${siteConfig.contact.phone}, email ${siteConfig.contact.email}. ${siteConfig.stats.yearsOfExperience}+ lat doświadczenia, ${siteConfig.stats.clientsServed}+ klientów, ${siteConfig.stats.successRate}% skuteczności.`,
    source: siteConfig.url,
    category: "company",
  });

  // 2. Usługi z services.ts
  const allServices: Service[] = SERVICE_CATEGORIES.flatMap((c) => c.services);
  for (const service of allServices) {
    const title = localized(service.title, locale);
    const desc = localized(service.fullDescription, locale);
    const forWhom = localized(service.forWhom, locale);
    const time = localized(service.estimatedTime, locale);

    chunks.push({
      title: `Usługa: ${title}`,
      content: `${title}. ${desc} Dla kogo: ${forWhom} Czas realizacji: ${time}${
        service.price ? `. Cena: od ${service.price}` : ""
      }.`,
      source: `${siteConfig.url}/${locale}/uslugi/${service.slug}`,
      category: "service",
    });
  }

  // 3. Blog posts — dla podanego locale
  const posts: BlogPost[] = getAllBlogPosts(locale);
  for (const post of posts) {
    const content = post.sections
      .map((s) => `${s.heading}: ${stripHtml(s.content)}`)
      .join(" ");

    chunks.push({
      title: post.title,
      content: `${post.description} ${content}`.slice(0, 3000),
      source: `${siteConfig.url}/${locale}/blog/${post.slug}`,
      category: "blog",
    });
  }

  return chunks;
}

/** Prosty keyword search — zlicza występowania słów z zapytania */
export function searchKnowledge(
  query: string,
  chunks: KnowledgeChunk[],
  limit = 3
): KnowledgeChunk[] {
  const queryWords = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2); // odfiltruj krótkie słowa

  if (queryWords.length === 0) return [];

  const scored = chunks.map((chunk) => {
    const haystack = `${chunk.title} ${chunk.content}`.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      // Zlicz wystąpienia
      const matches = haystack.split(word).length - 1;
      score += matches;
      // Bonus za trafienie w tytule
      if (chunk.title.toLowerCase().includes(word)) score += 3;
    }
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}

/** Buduje kontekst RAG dla system prompt */
export function buildContextSnippet(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return "";

  const lines = chunks.map(
    (c, i) => `[${i + 1}] ${c.title}\n${c.content}\nŹródło: ${c.source}`
  );
  return `\n\nKONTEKST Z BAZY WIEDZY:\n${lines.join("\n\n---\n\n")}`;
}
