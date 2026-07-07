import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase";
import { resolveBlog } from "@/lib/blog-resolve";
import { Eye, Calendar, Rss, BookOpen, ChevronDown } from "lucide-react";
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
  const [{ data: articles }, { data: seriesRows }] = await Promise.all([
    admin
      .from("user_blog_articles")
      .select("id, title, slug, summary, cover_image, tags, category, view_count, published_at, series_id, series_order")
      .eq("user_id", blog.settings.user_id)
      .eq("is_public", true)
      .order("published_at", { ascending: false }),
    admin.from("blog_series").select("id, title").eq("user_id", blog.settings.user_id),
  ]);

  const name = blog.profile?.display_name || blog.profile?.username || "用戶";
  const title = blog.settings.blog_title || `${name} 的部落格`;

  // 依系列分組：有 series_id 的收進系列（可展開收合）、其餘放「其他文章」
  const seriesTitle = new Map<string, string>((seriesRows ?? []).map((s: any) => [s.id, s.title]));
  const bySeries = new Map<string, any[]>();
  const loose: any[] = [];
  for (const a of (articles ?? [])) {
    if (a.series_id && seriesTitle.has(a.series_id)) {
      if (!bySeries.has(a.series_id)) bySeries.set(a.series_id, []);
      bySeries.get(a.series_id)!.push(a);
    } else loose.push(a);
  }
  // 系列內依 series_order（沒有就用時間），系列本身依最新文章排序
  for (const arr of bySeries.values()) arr.sort((x, y) => (x.series_order ?? 999) - (y.series_order ?? 999) || (x.published_at < y.published_at ? 1 : -1));
  const seriesGroups = [...bySeries.entries()].sort((a, b) => {
    const la = a[1][0]?.published_at ?? "", lb = b[1][0]?.published_at ?? "";
    return lb < la ? -1 : 1;
  });

  // 卡片（無系列的文章用）
  const ArticleCard = (a: any) => (
    <Link key={a.id} href={`/blogs/${userSlug}/${a.slug}`} className="block surface overflow-hidden hover-lift group">
      {a.cover_image && (
        <div className="relative w-full h-44"><Image src={a.cover_image} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 768px" className="object-cover" /></div>
      )}
      <div className="p-5">
        {a.category && <span className="text-xs text-accent font-medium">{a.category}</span>}
        <h2 className="text-xl font-bold mt-1 mb-2 group-hover:text-accent transition">{a.title}</h2>
        {a.summary && <p className="text-sm text-fg-muted line-clamp-2 mb-3">{a.summary}</p>}
        <div className="flex items-center gap-3 text-xs text-fg-muted">
          <span className="flex items-center gap-1"><Calendar size={12} />{new Date(a.published_at).toLocaleDateString("zh-TW")}</span>
          <span className="flex items-center gap-1"><Eye size={12} /> {a.view_count}</span>
        </div>
      </div>
    </Link>
  );
  // 系列內的精簡列
  const SeriesRow = (a: any, n: number) => (
    <Link key={a.id} href={`/blogs/${userSlug}/${a.slug}`} className="flex items-start gap-3 px-4 py-3 hover:bg-bg-elevated/60 transition group">
      <span className="shrink-0 w-6 h-6 rounded-full bg-accent/12 text-accent text-xs font-bold grid place-items-center mt-0.5">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm group-hover:text-accent transition line-clamp-1">{a.title}</div>
        {a.summary && <div className="text-xs text-fg-muted line-clamp-1 mt-0.5">{a.summary}</div>}
      </div>
      <span className="shrink-0 text-[11px] text-fg-muted inline-flex items-center gap-1 mt-0.5"><Eye size={11} /> {a.view_count}</span>
    </Link>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* 部落格 Header */}
      <header className="mb-10 text-center">
        {blog.profile?.avatar_url ? (
          <Image
            src={blog.profile.avatar_url}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-3xl font-bold text-black">
            {name[0]}
          </div>
        )}
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        {blog.settings.blog_desc && (
          <p className="text-fg-muted max-w-xl mx-auto">{blog.settings.blog_desc}</p>
        )}
        <p className="text-xs text-fg-muted mt-2">by {name}</p>
        {/* RSS 連結 */}
        <a
          href={`/blogs/${userSlug}/feed.xml`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-accent mt-2"
        >
          <Rss size={12} /> RSS 訂閱源
        </a>
      </header>

      {/* 訂閱表單 */}
      <div className="mb-8">
        <SubscribeForm userSlug={userSlug} />
      </div>

      {/* 文章列表：系列用展開/收合分組、其餘平鋪 */}
      {!articles || articles.length === 0 ? (
        <div className="text-center py-16 text-fg-muted">
          這個部落格還沒有公開的文章
        </div>
      ) : (
        <div className="space-y-5">
          {seriesGroups.map(([sid, arr]) => (
            <details key={sid} open className="surface overflow-hidden group/s">
              <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none list-none hover:bg-bg-elevated/50">
                <span className="font-bold inline-flex items-center gap-2">
                  <BookOpen size={16} className="text-accent" /> {seriesTitle.get(sid)}
                  <span className="text-xs font-normal text-fg-muted">· {arr.length} 篇</span>
                </span>
                <ChevronDown size={16} className="text-fg-muted transition-transform group-open/s:rotate-180" />
              </summary>
              <div className="border-t border-border divide-y divide-border/60">
                {arr.map((a, i) => SeriesRow(a, i + 1))}
              </div>
            </details>
          ))}

          {loose.length > 0 && (
            <div className="space-y-4">
              {seriesGroups.length > 0 && <h2 className="text-sm font-bold text-fg-muted pt-2">其他文章</h2>}
              {loose.map((a) => ArticleCard(a))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
