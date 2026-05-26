import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { formatTW, formatTWRelative } from "@/lib/format-date";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

/**
 * DB 健康 widget — admin 一目了然系統狀態
 *
 * 監看：
 *  - profile 總數 / 24hr 新增
 *  - 1 小時 / 24 小時 error log
 *  - 24 小時 AI 對話量
 *  - 30 分鐘 active session
 *  - 通知 pending
 *  - 最新 audit / error 各 5 條
 */
export default async function AdminHealthPage() {
  const supabase = createSupabaseAdmin();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

  // 並行抓所有指標、單一頁面減少網路 round-trip
  const [
    profilesTotal,
    profiles24h,
    errors1h,
    errors24h,
    aiConvs24h,
    activeSess30m,
    notifsPending,
    auditLatest,
    errorLatest,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    supabase.from("error_logs").select("*", { count: "exact", head: true }).gte("created_at", oneHourAgo),
    supabase.from("error_logs").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    supabase.from("ai_conversations").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo),
    supabase.from("active_sessions").select("*", { count: "exact", head: true }).gte("last_seen_at", thirtyMinAgo),
    supabase.from("notifications").select("*", { count: "exact", head: true }).is("read_at", null),
    supabase
      .from("audit_logs")
      .select("id, action, actor_username, target_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("error_logs")
      .select("id, level, source, message, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const num = (r: { count: number | null }) => (r.count ?? null);

  const totalUsers = num(profilesTotal);
  const newUsers24 = num(profiles24h);
  const err1 = num(errors1h);
  const err24 = num(errors24h);
  const ai24 = num(aiConvs24h);
  const active30 = num(activeSess30m);
  const unreadNotifs = num(notifsPending);

  // 健康總評：1 小時 error > 10 → 警告
  const errorTone: "accent" | "warning" | "danger" = err1 == null ? "accent" : err1 > 20 ? "danger" : err1 > 5 ? "warning" : "accent";

  return (
    <div className="space-y-6">
      <PageHero
        emoji="💓"
        title="系統健康"
        desc="一目了然系統狀態。10 秒整理完今天有沒有出狀況、session / error / AI 用量 / audit 一頁全包。"
        gradient="from-emerald-500/10 via-cyan-500/10 to-blue-500/10"
        borderColor="border-emerald-500/30"
      />

      {/* 核心指標 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="總用戶" value={fmt(totalUsers)} sub={`24hr +${fmt(newUsers24)}`} tone="accent" />
        <Stat label="30 分鐘活躍" value={fmt(active30)} sub="個 session" tone={active30 != null && active30 > 0 ? "accent" : undefined} />
        <Stat label="24hr AI 對話" value={fmt(ai24)} sub="個 conversation" />
        <Stat label="未讀通知" value={fmt(unreadNotifs)} sub="全站 in-app" />
      </section>

      {/* 錯誤指標 */}
      <section className="rounded-xl bg-bg-card border border-border p-5">
        <h2 className="font-bold mb-3 text-sm flex items-center gap-2">
          🚨 錯誤監看
          {errorTone === "danger" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-900 dark:text-red-200">高頻</span>}
          {errorTone === "warning" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning">注意</span>}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="過去 1 小時" value={fmt(err1)} tone={errorTone} sub={err1 != null && err1 > 0 ? "查看 admin/errors" : "正常"} />
          <Stat label="過去 24 小時" value={fmt(err24)} sub="累計" />
        </div>
      </section>

      {/* 最新 audit log */}
      <section className="rounded-xl bg-bg-card border border-border">
        <header className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-sm flex items-center gap-2">📜 最新 admin 動作</h2>
          <Link href={adminHref("/admin/audit") as any} className="text-xs text-fg-muted hover:text-accent">
            完整 →
          </Link>
        </header>
        {!auditLatest.data || auditLatest.data.length === 0 ? (
          <EmptyState emoji="📜" title="沒有 audit log" desc="admin 進行任何敏感動作都會記到這" />
        ) : (
          <ul className="divide-y divide-border">
            {auditLatest.data.map((a: any) => (
              <li key={a.id} className="px-4 py-2.5 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <code className="font-mono text-accent text-[11px] flex-shrink-0">{a.action}</code>
                  <span className="text-fg-muted truncate">
                    by <b className="text-fg">{a.actor_username || "—"}</b>
                    {a.target_type && <> on {a.target_type}</>}
                  </span>
                </div>
                <span className="text-[10px] text-fg-muted flex-shrink-0" title={formatTW(a.created_at)}>
                  {formatTWRelative(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 最新 error log */}
      <section className="rounded-xl bg-bg-card border border-border">
        <header className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-sm flex items-center gap-2">🔥 最新錯誤</h2>
          <Link href={adminHref("/admin/errors") as any} className="text-xs text-fg-muted hover:text-accent">
            完整 →
          </Link>
        </header>
        {!errorLatest.data || errorLatest.data.length === 0 ? (
          <EmptyState emoji="🎉" title="沒有錯誤" desc="過去 1 小時系統乾淨。" />
        ) : (
          <ul className="divide-y divide-border">
            {errorLatest.data.map((e: any) => (
              <li key={e.id} className="px-4 py-2.5 text-xs flex items-start gap-3">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase flex-shrink-0 ${
                  e.level === "error" || e.level === "fatal"
                    ? "bg-red-500/20 text-red-900 dark:text-red-200"
                    : e.level === "warn"
                    ? "bg-warning/20 text-warning"
                    : "bg-bg-elevated text-fg-muted"
                }`}>
                  {e.level || "log"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[10px] text-fg-muted flex-shrink-0">{e.source || "—"}</code>
                    <span className="truncate">{e.message}</span>
                  </div>
                </div>
                <span className="text-[10px] text-fg-muted flex-shrink-0" title={formatTW(e.created_at)}>
                  {formatTWRelative(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-fg-muted leading-relaxed">
        💡 <b>建議</b>：每天進站先看這頁、3 秒判斷昨天系統有沒有出事。
        如果「過去 1 小時錯誤」超過 5 條、優先到 <code className="font-mono text-accent">admin/errors</code> 看細節。
      </p>
    </div>
  );
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "accent" | "warning" | "danger";
}) {
  const color =
    tone === "accent"
      ? "text-accent"
      : tone === "warning"
      ? "text-warning"
      : tone === "danger"
      ? "text-red-400"
      : "text-fg";
  return (
    <div className="rounded-xl bg-bg-card border border-border p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
