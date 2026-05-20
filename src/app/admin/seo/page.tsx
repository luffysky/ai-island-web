import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { chapters } from "@/data/chapters";
import { SEOManagerClient } from "./SEOManagerClient";

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

  // 列出預設 routes（讓 admin 可以新增 override）
  const defaultRoutes = [
    { path: "/", title: "AI 島：60 章全端養成班", isCore: true },
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
      <div>
        <h2 className="text-xl font-bold">🔍 SEO 管理</h2>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          管每個頁面的 title / description / OG / 結構化資料 / GEO 設定
        </p>
      </div>

      <SEOManagerClient
        defaultRoutes={defaultRoutes}
        existingPages={seoPages ?? []}
      />
    </div>
  );
}
