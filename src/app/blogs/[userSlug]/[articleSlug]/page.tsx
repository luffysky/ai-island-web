import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase";
import { resolveBlog } from "@/lib/blog-resolve";
import { Eye, Calendar, ArrowLeft } from "lucide-react";
import { BlogViewTracker } from "@/components/blog/BlogViewTracker";
import { ReactionBar } from "@/components/blog/ReactionBar";
import { CommentSection } from "@/components/blog/CommentSection";
import { ShareArticleButton } from "@/components/blog/ShareArticleButton";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { sanitizeRichHtml } from "@/lib/rich-html";
import { articleSchema, breadcrumbSchema, jsonLdScript } from "@/lib/seo-jsonld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

async function getArticle(userSlug: string, articleSlug: string) {
  const blog = await resolveBlog(userSlug);
  if (!blog) return null;
  const admin = createSupabaseAdmin();
  const { data: article } = await admin
    .from("user_blog_articles")
    .select("*")
    .eq("user_id", blog.settings.user_id)
    .eq("slug", articleSlug)
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
        <div className="relative w-full h-60 sm:h-80 mb-6 rounded-2xl overflow-hidden">
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
          <span className="text-sm text-accent font-medium">{article.category}</span>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold mt-1 mb-3">{article.title}</h1>
        {article.summary && (
          <p className="text-lg text-fg-muted mb-4">{article.summary}</p>
        )}
        <div className="flex items-center gap-3 text-sm text-fg-muted flex-wrap">
          <span className="flex items-center gap-1">
            {blog.profile?.avatar_url ? (
              <Image
                src={blog.profile.avatar_url}
                alt=""
                width={20}
                height={20}
                unoptimized
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : null}
            {name}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={13} />
            {new Date(article.published_at).toLocaleDateString("zh-TW")}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={13} /> {article.view_count}
          </span>
        </div>
      </header>

      {/* 內文 */}
      <div
        className="prose-custom max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(article.content) }}
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
            <span key={t} className="text-xs px-2 py-1 rounded-full bg-bg-elevated text-fg-muted">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* 作者卡 */}
      <div className="mt-8 p-5 rounded-xl bg-bg-card border border-border flex items-center gap-4">
        {blog.profile?.avatar_url ? (
          <Image
            src={blog.profile.avatar_url}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center font-bold text-black">
            {name[0]}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-bold">{name}</div>
          <Link href={`/blogs/${userSlug}`} className="text-sm text-accent">
            看更多文章 →
          </Link>
        </div>
      </div>

      {/* 留言區 */}
      <CommentSection userSlug={userSlug} articleSlug={articleSlug} />
    </article>
  );
}
