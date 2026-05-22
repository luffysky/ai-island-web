import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Eye, ArrowLeft } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveBlog } from "@/lib/blog-resolve";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

async function getSeriesData(userSlug: string, seriesId: string) {
  const blog = await resolveBlog(userSlug);
  if (!blog) return null;

  const admin = createSupabaseAdmin();
  const { data: series } = await admin
    .from("blog_series")
    .select("id, title, description, cover_image, is_completed, user_id")
    .eq("id", seriesId)
    .eq("user_id", blog.settings.user_id)
    .maybeSingle();

  if (!series) return null;

  const { data: articles } = await admin
    .from("user_blog_articles")
    .select(
      "id, title, slug, summary, cover_image, cover_image_position, tags, category, view_count, published_at, series_order",
    )
    .eq("series_id", seriesId)
    .eq("is_public", true)
    .order("series_order", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: true });

  return { blog, series, articles: articles ?? [] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userSlug: string; seriesId: string }>;
}): Promise<Metadata> {
  const { userSlug, seriesId } = await params;
  const data = await getSeriesData(userSlug, seriesId);
  if (!data) return { title: "找不到系列 | AI 島" };
  const name =
    data.blog.profile?.display_name || data.blog.profile?.username || userSlug;
  const title = `${data.series.title} — ${name}`;
  const description =
    data.series.description ?? `${data.series.title}（系列文章）`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/blogs/${userSlug}/series/${seriesId}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      images: data.series.cover_image
        ? [data.series.cover_image]
        : undefined,
    },
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ userSlug: string; seriesId: string }>;
}) {
  const { userSlug, seriesId } = await params;
  const data = await getSeriesData(userSlug, seriesId);
  if (!data) notFound();

  const { blog, series, articles } = data;
  const name =
    blog.profile?.display_name || blog.profile?.username || userSlug;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <Link
            href={`/blogs/${userSlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition mb-6"
          >
            <ArrowLeft size={14} />
            回到 {blog.settings.blog_title || `${name} 的部落格`}
          </Link>

          <div className="flex items-start gap-4">
            {series.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={series.cover_image}
                alt={series.title}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[var(--color-accent)] text-sm">
                  📖 系列文章
                </span>
                {series.is_completed && (
                  <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 text-[11px] rounded-full">
                    已完結
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{series.title}</h1>
              {series.description && (
                <p className="text-sm text-[var(--color-fg-muted)] mt-2 leading-relaxed">
                  {series.description}
                </p>
              )}
              <p className="text-xs text-[var(--color-fg-muted)] mt-2">
                共 {articles.length} 篇文章
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Article list */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {articles.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-fg-muted)]">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm">此系列尚無公開文章</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article, index) => (
              <Link
                key={article.id}
                href={`/blogs/${userSlug}/${article.slug}`}
                className="group flex gap-4 p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-accent)] transition"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent)] text-sm font-bold">
                  {article.series_order ?? index + 1}
                </div>

                {article.cover_image && (
                  <div className="shrink-0 w-20 h-14 rounded-lg overflow-hidden hidden sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{
                        objectPosition:
                          article.cover_image_position ?? "center center",
                      }}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold group-hover:text-[var(--color-accent)] transition line-clamp-2">
                    {article.title}
                  </h2>
                  {article.summary && (
                    <p className="text-sm text-[var(--color-fg-muted)] mt-1 line-clamp-1 leading-relaxed">
                      {article.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-2.5 mt-2 text-[11px] text-[var(--color-fg-muted)]">
                    <span>
                      {new Date(article.published_at).toLocaleDateString(
                        "zh-TW",
                      )}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Eye size={11} /> {article.view_count}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Author info */}
        <div className="mt-12 pt-8 border-t border-[var(--color-border)] flex items-center gap-3">
          {blog.profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blog.profile.avatar_url}
              alt={name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-lg">
              ✍️
            </div>
          )}
          <div>
            <Link
              href={`/blogs/${userSlug}`}
              className="text-sm font-medium hover:text-[var(--color-accent)] transition"
            >
              {name}
            </Link>
            <p className="text-xs text-[var(--color-fg-muted)]">
              {blog.settings.blog_title ?? "部落格"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
