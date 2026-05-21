import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase";
import { resolveBlog } from "@/lib/blog-resolve";
import { Eye, Calendar, Rss } from "lucide-react";
import { SubscribeForm } from "@/components/blog/SubscribeForm";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userSlug: string }>;
}): Promise<Metadata> {
  const { userSlug } = await params;
  const blog = await resolveBlog(userSlug);
  if (!blog) return { title: "找不到部落格 | AI 島" };

  const name = blog.profile?.display_name || blog.profile?.username || "用戶";
  const title = blog.settings.blog_title || `${name} 的部落格`;
  return {
    title: `${title} | AI 島`,
    description: blog.settings.blog_desc || `${name} 在 AI 島的部落格`,
    alternates: {
      canonical: `${SITE_URL}/blogs/${userSlug}`,
      types: { "application/rss+xml": `${SITE_URL}/blogs/${userSlug}/feed.xml` },
    },
    openGraph: { title, description: blog.settings.blog_desc ?? "" },
  };
}

export default async function BlogHomePage({
  params,
}: {
  params: Promise<{ userSlug: string }>;
}) {
  const { userSlug } = await params;
  const blog = await resolveBlog(userSlug);
  if (!blog) notFound();

  const admin = createSupabaseAdmin();
  const { data: articles } = await admin
    .from("user_blog_articles")
    .select("id, title, slug, summary, cover_image, tags, category, view_count, published_at")
    .eq("user_id", blog.settings.user_id)
    .eq("is_public", true)
    .order("published_at", { ascending: false });

  const name = blog.profile?.display_name || blog.profile?.username || "用戶";
  const title = blog.settings.blog_title || `${name} 的部落格`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* 部落格 Header */}
      <header className="mb-10 text-center">
        {blog.profile?.avatar_url ? (
          <img src={blog.profile.avatar_url} alt="" className="w-20 h-20 rounded-full mx-auto mb-3" />
        ) : (
          <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] flex items-center justify-center text-3xl font-bold text-black">
            {name[0]}
          </div>
        )}
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        {blog.settings.blog_desc && (
          <p className="text-[var(--color-fg-muted)] max-w-xl mx-auto">{blog.settings.blog_desc}</p>
        )}
        <p className="text-xs text-[var(--color-fg-muted)] mt-2">by {name}</p>
        {/* RSS 連結 */}
        <a
          href={`/blogs/${userSlug}/feed.xml`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] mt-2"
        >
          <Rss size={12} /> RSS 訂閱源
        </a>
      </header>

      {/* 訂閱表單 */}
      <div className="mb-8">
        <SubscribeForm userSlug={userSlug} />
      </div>

      {/* 文章列表 */}
      {!articles || articles.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-fg-muted)]">
          這個部落格還沒有公開的文章
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/blogs/${userSlug}/${a.slug}`}
              className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden hover:border-[var(--color-accent)] transition group"
            >
              {a.cover_image && (
                <img src={a.cover_image} alt="" className="w-full h-44 object-cover" />
              )}
              <div className="p-5">
                {a.category && (
                  <span className="text-xs text-[var(--color-accent)] font-medium">{a.category}</span>
                )}
                <h2 className="text-xl font-bold mt-1 mb-2 group-hover:text-[var(--color-accent)] transition">
                  {a.title}
                </h2>
                {a.summary && (
                  <p className="text-sm text-[var(--color-fg-muted)] line-clamp-2 mb-3">{a.summary}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-[var(--color-fg-muted)]">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(a.published_at).toLocaleDateString("zh-TW")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} /> {a.view_count}
                  </span>
                  {a.tags?.length > 0 && (
                    <span className="flex gap-1">
                      {a.tags.slice(0, 3).map((t: string) => (
                        <span key={t} className="px-1.5 py-0.5 rounded-full bg-[var(--color-bg-elevated)]">#{t}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
