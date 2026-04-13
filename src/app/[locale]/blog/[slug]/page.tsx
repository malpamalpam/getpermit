import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { getBlogPostBySlug, getAllBlogPosts } from "@/lib/blog";
import { routing } from "@/i18n/routing";
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  List,
} from "lucide-react";

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return routing.locales.flatMap((locale) =>
    posts.map((post) => ({ locale, slug: post.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      images: [{ url: post.imageUrl, width: 1200, height: 630, alt: post.imageAlt }],
    },
  };
}

function estimateReadingTime(sections: Array<{ content: string }>): number {
  const totalChars = sections.reduce((acc, s) => acc + s.content.replace(/<[^>]+>/g, "").length, 0);
  return Math.max(3, Math.round(totalChars / 1200));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const readingTime = estimateReadingTime(post.sections);

  return (
    <article className="bg-white">
      {/* Hero image */}
      <div className="relative h-[300px] w-full overflow-hidden bg-primary-800 md:h-[420px]">
        <Image
          src={post.imageUrl}
          alt={post.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 via-primary-900/40 to-transparent" />
        <Container className="relative flex h-full items-end pb-10 md:pb-14">
          <div className="max-w-3xl">
            <Link
              href={`/${locale}/blog`}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Blog
            </Link>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-white md:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {new Intl.DateTimeFormat("pl-PL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(post.date))}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" aria-hidden="true" />
                {post.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {readingTime} min czytania
              </span>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-12 md:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_280px]">
          {/* Content */}
          <div className="min-w-0">
            {/* Mobile TOC */}
            <details className="mb-10 rounded-2xl border border-primary/10 bg-surface p-5 lg:hidden">
              <summary className="flex cursor-pointer items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-primary/60">
                <List className="h-4 w-4" aria-hidden="true" />
                Spis treści
              </summary>
              <nav className="mt-4">
                <ol className="space-y-2 text-sm">
                  {post.toc.map((item, i) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex gap-2 text-primary/70 transition-colors hover:text-accent"
                      >
                        <span className="flex-shrink-0 text-accent/60">{i + 1}.</span>
                        <span>{item.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </details>

            {post.sections.map((section) => (
              <section key={section.id} id={section.id} className="mb-10 scroll-mt-24">
                <h2 className="mb-4 font-display text-2xl font-extrabold text-primary md:text-3xl">
                  {section.heading}
                </h2>
                <div
                  className="prose-content text-base leading-relaxed text-ink/80 [&_a]:text-accent [&_a]:underline [&_details]:my-3 [&_details]:rounded-xl [&_details]:border [&_details]:border-primary/10 [&_details]:bg-surface [&_details]:p-4 [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-primary [&_li]:ml-5 [&_li]:list-disc [&_li]:py-1 [&_p]:mb-4 [&_strong]:font-semibold [&_strong]:text-primary [&_summary]:cursor-pointer [&_summary]:font-medium [&_summary]:text-primary [&_ul]:mb-4"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </section>
            ))}

            <div className="mt-12 border-t border-primary/10 pt-8">
              <Link
                href={`/${locale}/blog`}
                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Wróć do bloga
              </Link>
            </div>
          </div>

          {/* Table of Contents sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-primary/10 bg-surface p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-primary/60">
                <List className="h-4 w-4" aria-hidden="true" />
                Spis treści
              </h3>
              <nav>
                <ol className="space-y-2 text-sm">
                  {post.toc.map((item, i) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex gap-2 text-primary/70 transition-colors hover:text-accent"
                      >
                        <span className="flex-shrink-0 text-accent/60">
                          {i + 1}.
                        </span>
                        <span>{item.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </aside>
        </div>
      </Container>
    </article>
  );
}
