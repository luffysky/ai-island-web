import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ClearCacheButton } from "./ClearCacheButton";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

/**
 * P4-11 + P4-12 + P4-13：ops 三件組
 *  - DB 健康（表 size、行數、最新一筆時間）
 *  - 快取狀態 + clear cache
 *  - 環境變數（read-only mask）
 */

const TRACKED_TABLES = [
  "profiles", "lesson_progress", "quiz_attempts", "ai_messages", "ai_conversations",
  "forum_threads", "forum_replies", "user_blog_articles", "blog_comments",
  "todos", "error_logs", "rate_limit_hits", "web_vitals", "analytics_sessions",
];

const TRACKED_ENV_VARS = [
  "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_ADMIN_SLUG",
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_SLUG",
  "GA4_PROPERTY_ID", "GA4_SA_CREDENTIALS", "CRON_SECRET",
  "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "GROQ_API_KEY",
  "RESEND_API_KEY", "EMAIL_FROM",
  "NEXT_PUBLIC_VERCEL_ENV", "VERCEL_URL",
  "NODE_ENV",
];

function maskEnv(name: string, value: string | undefined): { display: string; tone: "set" | "unset" | "public" } {
  if (!value) return { display: "（未設定）", tone: "unset" };
  if (name.startsWith("NEXT_PUBLIC_")) return { display: value, tone: "public" };
  if (value.length <= 8) return { display: "•".repeat(value.length), tone: "set" };
  return { display: `${value.slice(0, 4)}${"•".repeat(8)}${value.slice(-4)}`, tone: "set" };
}

export default async function OpsAdminPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: meProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (meProfile?.role !== "admin") redirect("/");

  const admin = createSupabaseAdmin();

  const counts = await Promise.all(
    TRACKED_TABLES.map(async (t) => {
      const { count, error } = await admin.from(t).select("*", { count: "exact", head: true });
      return { table: t, count: error ? -1 : (count ?? 0), error: error?.message };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHero
        emoji="⚙️"
        title="系統 Ops"
        desc="DB 健康 + 快取 + 環境變數 (運維剛需)。看 connection pool / 清快取 / DB 表大小都在這。"
        gradient="from-slate-500/10 via-gray-500/10 to-zinc-500/10"
        borderColor="border-slate-500/30"
      />

      {/* DB Health */}
      <section className="rounded-xl bg-bg-card border border-border p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2">🗄️ DB 健康</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
          {counts.map((c) => (
            <div key={c.table} className="rounded-lg bg-bg p-2.5">
              <div className="text-[10px] text-fg-muted truncate font-mono">{c.table}</div>
              <div className={`text-lg font-bold ${c.count < 0 ? "text-red-400" : "text-accent"}`}>
                {c.count < 0 ? "—" : c.count.toLocaleString()}
              </div>
              {c.error && <div className="text-[9px] text-red-400 truncate" title={c.error}>{c.error}</div>}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-fg-muted mt-3">行數 head count（exact）。若顯示「—」表示表不存在或 RLS 擋住。</p>
      </section>

      {/* Cache */}
      <section className="rounded-xl bg-bg-card border border-border p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2">⚡ 快取</h2>
        <p className="text-sm text-fg-muted mb-3">
          Next.js App Router 預設大部分頁面是 `force-dynamic` 即時 render；少數 static 頁面可由此手動 revalidate。
        </p>
        <ClearCacheButton />
      </section>

      {/* Env vars */}
      <section className="rounded-xl bg-bg-card border border-border p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2">🔑 環境變數（read-only mask）</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {TRACKED_ENV_VARS.map((name) => {
            const v = process.env[name];
            const { display, tone } = maskEnv(name, v);
            return (
              <div key={name} className="rounded-lg bg-bg p-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-fg-muted font-mono">{name}</div>
                  <div className={`text-xs font-mono truncate ${
                    tone === "unset" ? "text-fg-muted italic" :
                    tone === "public" ? "text-blue-400" :
                    "text-accent"
                  }`} title={tone === "set" ? "(已 mask)" : display}>
                    {display}
                  </div>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  tone === "unset" ? "bg-red-500/15 text-red-900 dark:text-red-200" :
                  tone === "public" ? "bg-blue-500/15 text-blue-900 dark:text-blue-200" :
                  "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                }`}>
                  {tone === "unset" ? "MISSING" : tone === "public" ? "PUBLIC" : "SET"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-fg-muted mt-3">
          非 PUBLIC 的 env 都會 mask（前 4 + 中 8 點 + 後 4）。修改請到 Zeabur dashboard。
        </p>
      </section>
    </div>
  );
}
