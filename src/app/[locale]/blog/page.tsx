import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { getAllBlogPosts } from "@/lib/blog";
import { BookOpen, Calendar, ArrowRight } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const posts = getAllBlogPosts();

  return (
    <section className="bg-surface py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <BookOpen className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold text-primary md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 text-lg text-ink/60">{t("subtitle")}</p>
        </div>

        {posts.length === 0 ? (
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-primary/10 bg-white p-10 text-center shadow-sm">
            <p className="font-display text-2xl font-bold text-primary">
              {t("comingSoonTitle")}
            </p>
            <p className="mt-3 text-base text-ink/60">
              {t("comingSoonBody")}
            </p>
          </div>
        ) : (
          <div className="mx-auto mt-14 grid max-w-4xl gap-8">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/${locale}/blog/${post.slug}`}
                className="group overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
              >
                <div className="relative h-[220px] w-full overflow-hidden md:h-[280px]">
                  <Image
                    src={post.imageUrl}
                    alt={post.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 800px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-900/50 to-transparent" />
                </div>
                <div className="p-6 md:p-8">
                  <div className="mb-3 flex items-center gap-3 text-xs text-ink/50">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {new Intl.DateTimeFormat("pl-PL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(post.date))}
                    </span>
                    <span>{post.author}</span>
                  </div>
                  <h2 className="font-display text-xl font-extrabold text-primary md:text-2xl">
                    {post.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink/60">
                    {post.description}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent transition-transform group-hover:translate-x-1">
                    Czytaj więcej
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
