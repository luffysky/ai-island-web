import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { chapters } from "@/data/chapters";
import { SEO_PLACEHOLDERS, SITE_STATS } from "@/lib/site-stats";
import { SEOManagerClient } from "./SEOManagerClient";
import { PageHero } from "@/components/admin/PageHero";

export default async function SEOAdminPage() {
  const supabase = createSupabaseAdmin();

  const { data: seoPages, error } = await supabase
    .from("seo_pages")
    .select("*")
    .order("path");

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2">⚠️ 需要先跑 ai_migration.sql</div>
      </div>
    );
  }

  const defaultRoutes = [
    {
      path: "/",
      title: `AI 島：${SITE_STATS.chapterCount} 章全端養成班`,
      isCore: true,
    },
    { path: "/chapters", title: "章節列表", isCore: true },
    { path: "/leaderboard", title: "排行榜", isCore: true },
    { path: "/career", title: "職業路線", isCore: true },
    { path: "/login", title: "登入", isCore: true },
    { path: "/signup", title: "註冊", isCore: true },
    ...chapters.map((c) => ({
      path: `/chapters/${c.id}`,
      title: `Ch${String(c.id).padStart(2, "0")} ${c.title}`,
      isCore: false,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHero
        emoji="🔍"
        title="SEO 管理"
        desc="管每個頁面的 title / description / OG / 結構化資料 / GEO 設定。用 token 動態套站內統計、不用手改。"
        gradient="from-green-500/10 via-emerald-500/10 to-teal-500/10"
        borderColor="border-green-500/30"
      />

      <section className="bg-bg-card border border-border rounded-xl p-4 text-sm">
        <div className="font-bold mb-2">🪄 動態數據佔位符</div>
        <p className="text-xs text-fg-muted mb-3">
          在任何 SEO 欄位（title / description / og_title / og_description / schema_jsonld）寫下方 token，網站渲染時會即時換成最新數字。內容更新後不用手改 SEO。
        </p>
        <ul className="space-y-1.5 text-xs font-mono">
          {SEO_PLACEHOLDERS.map((p) => (
            <li key={p.token} className="flex items-center gap-3">
              <code className="px-2 py-0.5 bg-bg rounded border border-border shrink-0">
                {p.token}
              </code>
              <span className="text-accent font-bold w-12 text-right">
                {p.value}
              </span>
              <span className="text-fg-muted font-sans">
                {p.desc}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-fg-muted mt-3">
          範例：<code>AI 島 {"{{chapter_count}}"} 章 / {"{{lesson_count}}"}+ lesson</code>
        </p>
      </section>

      <SEOManagerClient
        defaultRoutes={defaultRoutes}
        existingPages={seoPages ?? []}
      />
    </div>
  );
}
