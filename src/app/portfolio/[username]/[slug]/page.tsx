import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, Eye, Calendar, ArrowLeft } from "lucide-react";
import { formatTWDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

async function getData(username: string, slug: string) {
  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, level, xp")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;

  const { data: portfolio } = await admin
    .from("portfolios")
    .select("*")
    .eq("user_id", profile.id)
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!portfolio) return null;

  // 取 playgrounds
  let playgrounds: any[] = [];
  if (portfolio.playground_ids?.length > 0) {
    const { data: pgs } = await admin
      .from("playgrounds")
      .select("id, title, language, code, playground_key, updated_at")
      .in("id", portfolio.playground_ids);
    playgrounds = pgs ?? [];
  }

  // +1 view count（fire-and-forget）
  admin.from("portfolios").update({ view_count: (portfolio.view_count ?? 0) + 1 }).eq("id", portfolio.id).then(() => {}, () => {});

  return { profile, portfolio, playgrounds };
}

export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }): Promise<Metadata> {
  const { username, slug } = await params;
  const data = await getData(username, slug);
  if (!data) return { title: "找不到作品集 | AI 島" };
  return {
    title: `${data.portfolio.title} | ${data.profile.display_name || username} · AI 島作品集`,
    description: data.portfolio.description || `${data.profile.display_name || username} 的作品集`,
    openGraph: {
      title: data.portfolio.title,
      description: data.portfolio.description ?? "",
      images: data.portfolio.cover_image ? [data.portfolio.cover_image] : undefined,
    },
  };
}

export default async function PortfolioPage({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;
  const data = await getData(username, slug);
  if (!data) notFound();

  const { profile, portfolio, playgrounds } = data;
  const name = profile.display_name || profile.username;

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/" className="text-sm text-fg-muted hover:text-accent flex items-center gap-1 mb-6">
        <ArrowLeft size={14} /> 回首頁
      </Link>

      {portfolio.cover_image && (
        <div className="relative w-full h-60 sm:h-80 mb-6 rounded-2xl overflow-hidden">
          <Image src={portfolio.cover_image} alt="" fill unoptimized priority sizes="(max-width: 768px) 100vw, 896px" className="object-cover" />
        </div>
      )}

      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{portfolio.title}</h1>
        {portfolio.description && <p className="text-lg text-fg-muted">{portfolio.description}</p>}
        {portfolio.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {portfolio.tags.map((t: string) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-fg-muted">#{t}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-fg-muted">
          <span className="flex items-center gap-1"><Eye size={12} /> {portfolio.view_count + 1}</span>
          <span className="flex items-center gap-1"><Calendar size={12} /> {formatTWDate(portfolio.updated_at)}</span>
        </div>
      </header>

      {/* 作者卡 */}
      <div className="rounded-xl bg-bg-card border border-border p-4 flex items-center gap-3 mb-8">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={48} height={48} unoptimized className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-xl font-bold text-black">{name[0]}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold">{name}</div>
          <div className="text-xs text-fg-muted">@{profile.username} · Lv {profile.level} · {profile.xp} XP</div>
          {profile.bio && <p className="text-xs text-fg-muted mt-1 line-clamp-2">{profile.bio}</p>}
        </div>
        <Link href={`/blogs/${username}` as any} className="text-xs text-accent hover:underline shrink-0">
          看部落格 →
        </Link>
      </div>

      {/* Playgrounds */}
      <section>
        <h2 className="text-xl font-bold mb-4">💻 程式碼作品（{playgrounds.length}）</h2>
        {playgrounds.length === 0 ? (
          <div className="rounded-xl bg-bg-card border border-border p-12 text-center text-fg-muted">
            此作品集還沒加入任何 playground
          </div>
        ) : (
          <div className="space-y-3">
            {playgrounds.map((pg) => (
              <div key={pg.id} className="rounded-xl bg-bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono bg-bg-elevated px-2 py-0.5 rounded">{pg.language}</span>
                    {pg.title || pg.playground_key}
                  </h3>
                </div>
                <pre className="text-xs font-mono bg-bg p-3 rounded overflow-x-auto max-h-96 overflow-y-auto">
                  {pg.code}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[10px] text-fg-muted text-center mt-8">
        🏝️ 想做自己的作品集？<Link href="/" className="text-accent">來 AI 島學程式</Link>
      </p>
    </article>
  );
}
