import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPost } from "@/lib/creator-engine/social";
import { ShareButton } from "@/components/share/ShareButton";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet";
const name = (a: any) => a?.display_name || a?.username || "創作者";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post: any = await getPost(id);
  if (!post || post.visibility !== "public") return { title: "貼文 · AI 島", robots: { index: false } };
  const author = name(post.author);
  const title = `${author} 的貼文 · AI 島`;
  const desc = (post.content || "在 AI 島看更多創作").replace(/\s+/g, " ").slice(0, 110);
  // 有作品圖 → 直接拿圖當 OG；沒圖 → 用產生的品牌卡（/api/og）。
  const userImg = post.images?.[0]?.url || post.video_thumbnail_url || undefined;
  const cardSub = (post.content || "在 AI 島創作").replace(/\s+/g, " ").slice(0, 60);
  const ogImg = userImg || `${SITE_URL}/api/og?title=${encodeURIComponent(author + " 的作品")}&subtitle=${encodeURIComponent(cardSub)}`;
  return {
    title, description: desc,
    alternates: { canonical: `/creator-island/p/${id}` },
    robots: { index: false, follow: true },
    openGraph: { title, description: desc, images: [{ url: ogImg, width: 1200, height: 630 }], type: "article", siteName: "AI 島", url: `${SITE_URL}/creator-island/p/${id}` },
    twitter: { card: "summary_large_image", title, description: desc, images: [ogImg] },
  };
}

export default async function PostPermalink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("creator");
  const post: any = await getPost(id);

  if (!post || post.visibility !== "public") {
    return (
      <main className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold">{t("profileNotFound")}</h1>
        <Link href="/creator-island/community" className="inline-block px-5 py-2.5 rounded-full bg-accent text-black font-semibold">{t("profileVisitCommunityFull")}</Link>
      </main>
    );
  }

  return (
    <main className="max-w-[680px] mx-auto px-4 py-10 space-y-5">
      <article className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          {post.author?.avatar_url
            ? <img src={post.author.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            : <div className="w-9 h-9 rounded-full bg-accent/20 grid place-items-center text-sm">{name(post.author)[0]}</div>}
          <div className="font-bold">{name(post.author)}</div>
          {post.type === "reel" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300">{t("profileReel")}</span>}
          <span className="ml-auto text-xs text-fg-muted">{new Date(post.created_at).toLocaleDateString("zh-TW")}</span>
        </div>
        {post.content && <div className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</div>}
        {post.images?.length > 0 && <div className={`grid gap-1 ${post.images.length > 1 ? "grid-cols-2" : ""}`}>{post.images.map((im: any, i: number) => <img key={i} src={im.url} alt="" className="rounded-lg w-full object-cover max-h-96" />)}</div>}
        {post.video_url && <video src={post.video_url} controls className="w-full rounded-lg max-h-[80vh]" />}
        {post.audio_url && <audio src={post.audio_url} controls className="w-full" />}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-fg-muted">❤️ {post.likes_count} · 💬 {post.comments_count}</div>
          <ShareButton
            url={`${SITE_URL}/creator-island/p/${id}`}
            title={`${name(post.author)} 的作品 · AI 島`}
            text={(post.content || "在 AI 島看更多創作").replace(/\s+/g, " ").slice(0, 80)}
          />
        </div>
      </article>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/creator-island/community" className="px-5 py-2.5 rounded-full bg-accent text-black font-semibold hover:opacity-90 transition">🏝️ {t("profileVisitCommunity")}</Link>
        <Link href="/creator-island" className="px-5 py-2.5 rounded-full border border-border hover:bg-bg-elevated transition">{t("profileCreatorIsland")}</Link>
      </div>
    </main>
  );
}
