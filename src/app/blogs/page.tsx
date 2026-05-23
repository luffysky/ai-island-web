import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Search, Eye, PenLine } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "部落格 · AI 島",
  description: "探索 AI 島社群創作者的公開文章與部落格",
};

interface BlogItem {
  userSlug: string;
  blogTitle: string | null;
  blogDesc: string | null;
  authorName: string | null;
  authorAvatar: string | null;
  articleCount: number;
  latestPublishedAt: string | null;
}

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image: string | null;
  tags: string[];
  view_count: number;
  published_at: string;
  user_id: string;
  authorName: string | null;
  blogSlug: string;
}

async function getBlogs(): Promise<BlogItem[]> {
  const admin = createSupabaseAdmin();

  const { data: settings } = await admin
    .from("user_blog_settings")
    .select("user_id, blog_slug, blog_title, blog_desc")
    .eq("is_enabled", true);

  if (!settings || settings.length === 0) return [];

  const userIds = settings.map((s: any) => s.user_id);

  const [{ data: profiles }, { data: articles }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds),
    admin
      .from("user_blog_articles")
      .select("user_id, published_at")
      .in("user_id", userIds)
      .eq("is_public", true)
      .order("published_at", { ascending: false }),
  ]);

  const profileMap = new Map<string, any>();
  for (const p of profiles ?? []) profileMap.set(p.id, p);

  const stats = new Map<string, { count: number; latest: string | null }>();
  for (const a of articles ?? []) {
    const existing = stats.get(a.user_id) ?? { count: 0, latest: null };
    existing.count += 1;
    if (!existing.latest) existing.latest = a.published_at;
    stats.set(a.user_id, existing);
  }

  return settings
    .map((s: any): BlogItem => {
      const profile = profileMap.get(s.user_id);
      const st = stats.get(s.user_id);
      return {
        userSlug: s.blog_slug || s.user_id,
        blogTitle: s.blog_title,
        blogDesc: s.blog_desc,
        authorName: profile?.display_name || profile?.username || null,
        authorAvatar: profile?.avatar_url || null,
        articleCount: st?.count ?? 0,
        latestPublishedAt: st?.latest ?? null,
      };
    })
    .filter((b) => b.articleCount > 0)
    .sort((a, b) => {
      if (!a.latestPublishedAt) return 1;
      if (!b.latestPublishedAt) return -1;
      return (
        new Date(b.latestPublishedAt).getTime() -
        new Date(a.latestPublishedAt).getTime()
      );
    });
}

async function searchArticles(q: string): Promise<SearchResult[]> {
  const admin = createSupabaseAdmin();
  const useFullText = q.length >= 2;
  const tsQuery = q.trim().split(/\s+/).filter(Boolean).join(" & ");

  let { data, error } = await admin
    .from("user_blog_articles")
    .select(
      "id, title, slug, summary, cover_image, tags, view_count, published_at, user_id"
    )
    .eq("is_public", true)
    .textSearch("search_vector", useFullText ? tsQuery : q, {
      config: "simple",
    })
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    const fallback = await admin
      .from("user_blog_articles")
      .select(
        "id, title, slug, summary, cover_image, tags, view_count, published_at, user_id"
      )
      .eq("is_public", true)
      .ilike("title", `%${q}%`)
      .order("published_at", { ascending: false })
      .limit(50);
    data = fallback.data;
  }

  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((a: any) => a.user_id))];
  const [{ data: profiles }, { data: settings }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds),
    admin
      .from("user_blog_settings")
      .select("user_id, blog_slug")
      .in("user_id", userIds),
  ]);

  const nameMap = new Map<string, string | null>();
  for (const p of profiles ?? [])
    nameMap.set(p.id, p.display_name || p.username || null);
  const slugMap = new Map<string, string>();
  for (const s of settings ?? [])
    slugMap.set(s.user_id, s.blog_slug || s.user_id);

  return data.map((a: any) => ({
    ...a,
    authorName: nameMap.get(a.user_id) ?? null,
    blogSlug: slugMap.get(a.user_id) || a.user_id,
  }));
}

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const [blogs, searchResults] = await Promise.all([
    q ? Promise.resolve([] as BlogItem[]) : getBlogs(),
    q ? searchArticles(q) : Promise.resolve([] as SearchResult[]),
  ]);

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">📝 部落格</h1>
          <p className="text-sm text-fg-muted mt-1.5">
            探索 AI 島社群創作者的公開文章與部落格
          </p>
        </div>

        {/* Search */}
        <form action="/blogs" className="mb-8 flex gap-2">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
            />
            <input
              name="q"
              defaultValue={q}
              placeholder="搜尋文章（標題、摘要、標籤）"
              className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-accent text-black font-semibold text-sm flex items-center gap-1"
          >
            <Search size={16} />
            搜尋
          </button>
          {q && (
            <Link
              href="/blogs"
              className="px-4 py-2.5 rounded-lg bg-bg-card border border-border text-sm flex items-center"
            >
              清除
            </Link>
          )}
        </form>

        {/* Search results */}
        {q && (
          <section className="mb-12">
            <h2 className="text-sm text-fg-muted mb-3">
              「{q}」的搜尋結果（{searchResults.length} 篇）
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-16 text-fg-muted bg-bg-card rounded-xl border border-border">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm">找不到符合的文章</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((a) => (
                  <Link
                    key={a.id}
                    href={`/blogs/${a.blogSlug}/${a.slug}`}
                    className="block rounded-xl border border-border bg-bg-card p-4 hover:border-accent transition group flex gap-4"
                  >
                    {a.cover_image && (
                      <Image
                        src={a.cover_image}
                        alt=""
                        width={80}
                        height={80}
                        unoptimized
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold group-hover:text-accent transition line-clamp-1">
                        {a.title}
                      </h3>
                      {a.summary && (
                        <p className="text-sm text-fg-muted line-clamp-2 mt-0.5">
                          {a.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-fg-muted mt-1.5">
                        {a.authorName && <span>{a.authorName}</span>}
                        <span className="flex items-center gap-1">
                          <Eye size={11} /> {a.view_count}
                        </span>
                        <span>
                          {new Date(a.published_at).toLocaleDateString(
                            "zh-TW"
                          )}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Blog list (only when not searching) */}
        {!q && (
          <section className="mb-12">
            {blogs.length === 0 ? (
              <div className="text-center py-24 text-fg-muted bg-bg-card rounded-xl border border-border">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-sm">目前還沒有公開部落格</p>
                <p className="text-xs mt-1">成為第一位作者吧</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blogs.map((blog) => (
                  <Link
                    key={blog.userSlug}
                    href={`/blogs/${blog.userSlug}`}
                    className="group flex items-start gap-4 p-4 sm:p-5 rounded-xl border border-border bg-bg-card hover:border-accent transition relative overflow-hidden"
                  >
                    {/* Avatar */}
                    {blog.authorAvatar ? (
                      <Image
                        src={blog.authorAvatar}
                        alt={blog.authorName ?? ""}
                        width={56}
                        height={56}
                        unoptimized
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-border flex-shrink-0"
                      />
                    ) : (
                      <div className="w-13 h-13 sm:w-14 sm:h-14 flex-shrink-0 rounded-full bg-bg-elevated flex items-center justify-center text-xl">
                        ✍️
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold group-hover:text-accent transition line-clamp-1">
                        {blog.blogTitle ??
                          `${blog.authorName ?? blog.userSlug} 的部落格`}
                      </h2>
                      {blog.authorName && (
                        <p className="text-xs text-fg-muted mt-0.5">
                          {blog.authorName}
                        </p>
                      )}
                      {blog.blogDesc && (
                        <p className="text-sm text-fg-muted mt-1.5 line-clamp-2 leading-relaxed">
                          {blog.blogDesc}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-fg-muted">
                        <span>📝 {blog.articleCount} 篇文章</span>
                        {blog.latestPublishedAt && (
                          <>
                            <span>·</span>
                            <span>
                              最新：
                              {new Date(
                                blog.latestPublishedAt
                              ).toLocaleDateString("zh-TW")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* CTA */}
        <div className="mt-14">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/10 via-accent-2/5 to-bg-card px-6 py-8 sm:px-10 sm:py-10 text-center">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent-2/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="text-3xl mb-3">✍️</div>
              <h2 className="text-lg sm:text-xl font-bold mb-2">
                開始你自己的部落格
              </h2>
              <p className="text-sm text-fg-muted leading-relaxed max-w-md mx-auto mb-6">
                AI 輔助寫作、系列文章、讀者互動、RSS 訂閱，
                <br />
                所有功能 AI 島都幫你準備好了。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/me/blog"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-2 text-black font-semibold text-sm rounded-2xl transition-colors"
                >
                  <PenLine size={16} />
                  免費開始寫作 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
