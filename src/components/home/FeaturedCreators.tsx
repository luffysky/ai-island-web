import Link from "next/link";
import { Sparkles, Heart, MessageCircle } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type FeaturedPost = {
  id: string;
  type: string;
  title: string | null;
  content: string;
  images: { url: string }[] | null;
  video_thumbnail_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

async function getFeatured(): Promise<FeaturedPost[]> {
  try {
    const admin = createSupabaseAdmin();
    // 只撈最近 60 天的公開已發佈貼文，讚多者優先、其次時間新
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const { data } = await admin
      .from("ci_posts")
      .select(
        "id, type, title, content, images, video_thumbnail_url, likes_count, comments_count, created_at, author:profiles!ci_posts_user_id_fkey(username, display_name, avatar_url)"
      )
      .eq("status", "published")
      .eq("visibility", "public")
      .gte("created_at", since)
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6);
    return (data as any[]) ?? [];
  } catch {
    return [];
  }
}

const authorName = (a: FeaturedPost["author"]) => a?.display_name || a?.username || "創作者";

export async function FeaturedCreators() {
  const posts = await getFeatured();
  // 真沒作品就整區不顯示（graceful empty state — 首頁不放空殼）
  if (posts.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-16 border-b border-border">
      <h2 className="text-3xl font-bold mb-2 inline-flex w-full items-center justify-center gap-2 reveal">
        <Sparkles size={28} className="text-accent" /> 創作者精選
      </h2>
      <p className="text-center text-fg-muted mb-8 reveal">島民們最近的公開作品，點進去看看</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((p, idx) => {
          const cover = p.images?.[0]?.url || p.video_thumbnail_url || null;
          const snippet = (p.title || p.content || "").replace(/\s+/g, " ").slice(0, 90);
          return (
            <Link
              key={p.id}
              href={`/creator-island/p/${p.id}`}
              className={`group flex flex-col surface hover-lift overflow-hidden reveal ${idx < 3 ? `reveal-d${idx + 1}` : ""}`}
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="w-full aspect-[16/10] object-cover" />
              ) : (
                <div className="w-full aspect-[16/10] bg-gradient-to-br from-accent/10 to-accent-2/10 grid place-items-center text-fg-muted text-sm px-5 text-center line-clamp-4">
                  {snippet || "來 AI 島看更多創作"}
                </div>
              )}
              <div className="flex flex-col gap-2 p-4 flex-1">
                {cover && snippet && (
                  <p className="text-sm text-fg leading-relaxed line-clamp-2">{snippet}</p>
                )}
                <div className="flex items-center gap-2 mt-auto pt-1">
                  {p.author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.author.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-accent/20 grid place-items-center text-[11px]">
                      {authorName(p.author)[0]}
                    </div>
                  )}
                  <span className="text-xs text-fg-muted truncate flex-1">{authorName(p.author)}</span>
                  <span className="text-[11px] text-fg-muted inline-flex items-center gap-1">
                    <Heart size={12} /> {p.likes_count}
                  </span>
                  <span className="text-[11px] text-fg-muted inline-flex items-center gap-1">
                    <MessageCircle size={12} /> {p.comments_count}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/creator-island/community"
          className="inline-block px-6 py-3 rounded-full bg-accent text-black font-semibold hover:opacity-90 transition glow-accent"
        >
          逛創作者社群
        </Link>
      </div>
    </section>
  );
}
