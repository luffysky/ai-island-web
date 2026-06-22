import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase";
import { resolveBlog } from "@/lib/blog-resolve";
import { Eye, Calendar, ArrowLeft, Clock } from "lucide-react";
import { BlogViewTracker } from "@/components/blog/BlogViewTracker";
import { ReactionBar } from "@/components/blog/ReactionBar";
import { CommentSection } from "@/components/blog/CommentSection";
import { ShareArticleButton } from "@/components/blog/ShareArticleButton";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { SubscribeForm } from "@/components/blog/SubscribeForm";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";
import { estimateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { articleSchema, breadcrumbSchema, jsonLdScript } from "@/lib/seo-jsonld";

// OPT-9 ISR：公開文章每 5 分鐘 revalidate，省掉每次造訪都打 DB（瀏覽數/留言/反應都走 client component、不受影響）
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

async function getArticle(userSlug: string, articleSlug: string) {
  const blog = await resolveBlog(userSlug);
  if (!blog) return null;
  const admin = createSupabaseAdmin();
  const { data: article } = await admin
    .from("user_blog_articles")
    .select("*")
    .eq("user_id", blog.settings.user_id)
    .ilike("slug", articleSlug)
    .eq("is_public", true)
    .maybeSingle();
  if (!article) return null;
  return { blog, article };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userSlug: string; articleSlug: string }>;
}): Promise<Metadata> {
  const { userSlug, articleSlug } = await params;
  const res = await getArticle(userSlug, articleSlug);
  if (!res) return { title: "找不到文章 | AI 島" };

  const { article } = res;
  const title = article.seo_title || article.title;
  const desc = article.seo_desc || article.summary || "";
  return {
    title: `${title} | AI 島部落格`,
    description: desc,
    alternates: { canonical: `${SITE_URL}/blogs/${userSlug}/${articleSlug}` },
    openGraph: {
      title,
      description: desc,
      images: article.cover_image ? [article.cover_image] : undefined,
      type: "article",
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ userSlug: string; articleSlug: string }>;
}) {
  const { userSlug, articleSlug } = await params;
  const res = await getArticle(userSlug, articleSlug);
  if (!res) notFound();

  const { blog, article } = res;
  const name = blog.profile?.display_name || blog.profile?.username || "用戶";
  const articleUrl = `${SITE_URL}/blogs/${userSlug}/${articleSlug}`;

  // 閱讀時間（從內文 HTML 去標籤估）
  const plainText = (article.content || "").replace(/<[^>]+>/g, " ");
  const readMinutes = estimateReadingTime(plainText);

  // 同作者其他文章（文末「更多文章」）
  const adminSb = createSupabaseAdmin();
  const { data: moreArticles } = await adminSb
    .from("user_blog_articles")
    .select("title, slug, summary, cover_image, view_count, published_at")
    .eq("user_id", blog.settings.user_id)
    .eq("is_public", true)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(4);

  // JSON-LD: Article + BreadcrumbList
  const ld = [
    articleSchema({
      headline: article.title,
      description: article.seo_desc || article.summary || article.title,
      url: articleUrl,
      imageUrl: article.cover_image || `${SITE_URL}/og.png`,
      authorName: name,
      authorUrl: `${SITE_URL}/blogs/${userSlug}`,
      publishedAt: article.published_at || article.created_at,
      updatedAt: article.updated_at,
    }),
    breadcrumbSchema([
      { name: "首頁", url: SITE_URL },
      { name: "部落格", url: `${SITE_URL}/blogs` },
      { name: name, url: `${SITE_URL}/blogs/${userSlug}` },
      { name: article.title, url: articleUrl },
    ]),
  ];

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 min-w-0 overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(ld)}
      />
      <ReadingProgress />
      <TableOfContents containerSelector=".prose-custom" />
      {/* 瀏覽數 +1（client、只跑一次）*/}
      <BlogViewTracker articleId={article.id} />

      {/* 麵包屑 */}
      <Link
        href={`/blogs/${userSlug}`}
        className="text-sm text-fg-muted hover:text-fg flex items-center gap-1 mb-6"
      >
        <ArrowLeft size={14} /> {blog.settings.blog_title || `${name} 的部落格`}
      </Link>

      {/* 封面 */}
      {article.cover_image && (
        <div className="relative w-full h-60 sm:h-80 mb-6 rounded-2xl overflow-hidden shadow-xl ring-1 ring-border">
          <Image
            src={article.cover_image}
            alt=""
            fill
            unoptimized
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            style={{ objectPosition: article.cover_image_position || "center center" }}
          />
        </div>
      )}

      {/* 標題區 */}
      <header className="mb-8">
        {article.category && (
          <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-accent bg-accent/10 px-2.5 py-1 rounded-full">
            {article.category}
          </span>
        )}
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.15] tracking-tight mt-3 mb-4">{article.title}</h1>
        {article.summary && (
          <p className="text-lg sm:text-xl text-fg-muted leading-relaxed mb-5">{article.summary}</p>
        )}
        <div className="flex items-center gap-x-4 gap-y-2 text-sm text-fg-muted flex-wrap border-y border-border py-3">
          <span className="flex items-center gap-1.5 font-medium text-fg">
            {blog.profile?.avatar_url ? (
              <Image src={blog.profile.avatar_url} alt="" width={24} height={24} unoptimized className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-[11px] font-bold text-black">{name[0]}</span>
            )}
            {name}
          </span>
          <span className="flex items-center gap-1"><Calendar size={13} />{new Date(article.published_at).toLocaleDateString("zh-TW")}</span>
          <span className="flex items-center gap-1"><Clock size={13} /> {formatReadingTime(readMinutes)}</span>
          <span className="flex items-center gap-1"><Eye size={13} /> {article.view_count}</span>
        </div>
      </header>

      {/* 內文 */}
      <div
        className="prose-custom prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtmlStrict(article.content) }}
      />

      {/* emoji 反應 + 分享 */}
      <div className="flex flex-wrap items-center gap-3 mt-8">
        <ReactionBar userSlug={userSlug} articleSlug={articleSlug} />
        <ShareArticleButton
          title={article.title}
          summary={article.summary}
          author={name}
          url={articleUrl}
        />
      </div>

      {/* 標籤 */}
      {article.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-8 pt-6 border-t border-border">
          {article.tags.map((t: string) => (
            <Link
              key={t}
              href={`/blogs/${userSlug}?tag=${encodeURIComponent(t)}`}
              className="text-xs px-2.5 py-1 rounded-full bg-bg-elevated text-fg-muted hover:bg-accent/10 hover:text-accent transition"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      {/* 作者卡 */}
      <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-bg-card to-bg-elevated border border-border flex items-start gap-4">
        {blog.profile?.avatar_url ? (
          <Image src={blog.profile.avatar_url} alt="" width={56} height={56} unoptimized className="w-14 h-14 rounded-full object-cover ring-2 ring-accent/30" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center font-bold text-xl text-black">{name[0]}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-lg">{name}</div>
          {blog.settings.blog_desc && <p className="text-sm text-fg-muted mt-0.5 line-clamp-2">{blog.settings.blog_desc}</p>}
          <Link href={`/blogs/${userSlug}`} className="inline-block text-sm text-accent font-medium mt-1.5 hover:underline">看更多文章 →</Link>
        </div>
      </div>

      {/* 訂閱 */}
      <div className="mt-6 p-5 rounded-2xl bg-accent/5 border border-accent/20 text-center">
        <div className="font-bold mb-1">📬 喜歡這篇？訂閱 {name} 的新文章</div>
        <p className="text-xs text-fg-muted mb-3">有新文章發布時通知你、不漏接。</p>
        <div className="max-w-sm mx-auto"><SubscribeForm userSlug={userSlug} /></div>
      </div>

      {/* 更多文章 */}
      {moreArticles && moreArticles.length > 0 && (
        <section className="mt-10 pt-8 border-t border-border">
          <h2 className="text-xl font-bold mb-4">📚 {name} 的更多文章</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {moreArticles.map((m: any) => (
              <Link
                key={m.slug}
                href={`/blogs/${userSlug}/${m.slug}`}
                className="group rounded-xl border border-border bg-bg-card overflow-hidden hover:border-accent/50 transition flex flex-col"
              >
                {m.cover_image && (
                  <div className="relative w-full h-32 overflow-hidden">
                    <Image src={m.cover_image} alt="" fill unoptimized sizes="400px" className="object-cover group-hover:scale-105 transition" />
                  </div>
                )}
                <div className="p-3 flex-1">
                  <h3 className="font-bold text-sm line-clamp-2 group-hover:text-accent transition">{m.title}</h3>
                  {m.summary && <p className="text-xs text-fg-muted mt-1 line-clamp-2">{m.summary}</p>}
                  <div className="text-[10px] text-fg-muted mt-2 flex items-center gap-1"><Eye size={10} /> {m.view_count} · {new Date(m.published_at).toLocaleDateString("zh-TW")}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 留言區 */}
      <CommentSection userSlug={userSlug} articleSlug={articleSlug} />
    </article>
  );
}
