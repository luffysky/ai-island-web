import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { Users, Send, MessageCircle, MessageSquareText, ImageIcon, Settings, Activity, AlertCircle } from "lucide-react";
import { PageHero } from "@/components/admin/PageHero";
import { LineDiagnosticPanel } from "./LineDiagnosticPanel";

export const dynamic = "force-dynamic";

export default async function AdminLinePage() {
  const admin = createSupabaseAdmin();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400_000).toISOString();
  const sevenDayAgo = new Date(now.getTime() - 7 * 86400_000).toISOString();

  const [
    { count: boundUsers },
    { count: usersWithNotifyOn },
    { count: pendingTickets },
    { count: lineTickets24h },
    { count: replies24h },
    { count: cannedCount },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).not("line_user_id", "is", null),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("line_user_id", "is", null)
      .eq("line_notify_enabled", true),
    admin.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    admin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneDayAgo)
      .filter("meta->>source", "eq", "user_line_bot"),
    admin
      .from("ticket_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_staff", true)
      .gte("created_at", sevenDayAgo),
    admin.from("canned_replies").select("*", { count: "exact", head: true }),
  ]);

  // bot 狀態檢測
  const adminBotReady = !!(process.env.ADMIN_LINE_CHANNEL_TOKEN && process.env.ADMIN_LINE_CHANNEL_SECRET);
  const userBotReady = !!(process.env.USER_LINE_CHANNEL_TOKEN && process.env.USER_LINE_CHANNEL_SECRET);

  return (
    <div className="space-y-6">
      <PageHero
        emoji="💚"
        title="LINE 控制台"
        desc="兩個 bot (admin + user)、群發、罐頭、客服對話、Rich Menu 都在這。"
        gradient="from-green-500/10 via-lime-500/10 to-emerald-500/10"
        borderColor="border-green-500/30"
      />

      {/* Bot 狀態 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BotStatusCard
          name="Admin bot（後台監看）"
          ready={adminBotReady}
          emoji="🔐"
          desc="收 admin 通知 + AI 對話 + 報表"
          webhookPath="/api/line-webhook"
        />
        <BotStatusCard
          name="User bot（使用者通知 + 客服）"
          ready={userBotReady}
          emoji="🌱"
          desc="推 user 學習動態 + 收 LINE 客服"
          webhookPath="/api/line-webhook-user"
        />
      </section>

      {/* 診斷工具 */}
      <LineDiagnosticPanel />

      {/* 統計 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="已綁 LINE 用戶" value={boundUsers ?? 0} sub={`${usersWithNotifyOn ?? 0} 開通知`} tone="accent" />
        <Stat label="待處理 ticket" value={pendingTickets ?? 0} tone={(pendingTickets ?? 0) > 5 ? "warning" : undefined} />
        <Stat label="24hr LINE 進線" value={lineTickets24h ?? 0} sub="新 ticket" />
        <Stat label="7 天客服回覆" value={replies24h ?? 0} sub="客服 reply" />
      </section>

      {/* 快速動作 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ActionCard
          href={adminHref("/admin/line/users")}
          icon={<Users size={20} />}
          title="LINE 用戶清單"
          desc="看誰綁了、直接點推訊息給單一 user"
          tone="text-accent"
        />
        <ActionCard
          href={adminHref("/admin/line/broadcast")}
          icon={<Send size={20} />}
          title="群發訊息"
          desc="推給全部 / 特定 segment、最多 500 人 / batch"
          tone="text-blue-400"
        />
        <ActionCard
          href={adminHref("/admin/crm")}
          icon={<MessageCircle size={20} />}
          title="客服對話"
          desc={`處理 ticket、回覆會自動推 user LINE${pendingTickets ? `（${pendingTickets} 待）` : ""}`}
          tone="text-pink-400"
          badge={pendingTickets || undefined}
        />
        <ActionCard
          href={adminHref("/admin/line/canned")}
          icon={<MessageSquareText size={20} />}
          title="罐頭訊息"
          desc={`管理常用回覆模板（${cannedCount ?? 0} 個）`}
          tone="text-purple-400"
        />
        <ActionCard
          href={adminHref("/admin/line/rich-menu")}
          icon={<ImageIcon size={20} />}
          title="Rich Menu"
          desc="LINE 底部選單圖、需 2500×1686 PNG"
          tone="text-yellow-400"
        />
        <ActionCard
          href={adminHref("/admin/env")}
          icon={<Settings size={20} />}
          title="LINE env 設定"
          desc="兩個 bot 的 token / secret / basicId 狀態"
          tone="text-fg-muted"
        />
      </section>
    </div>
  );
}

function BotStatusCard({ name, ready, emoji, desc, webhookPath }: any) {
  return (
    <div className={`rounded-xl border p-4 ${ready ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/30"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{emoji}</span>
        <span className="font-bold text-sm">{name}</span>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${ready ? "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200" : "bg-red-500/20 text-red-900 dark:text-red-200"}`}>
          {ready ? "● 已設定" : "○ 未設定"}
        </span>
      </div>
      <p className="text-xs text-fg-muted ml-9">{desc}</p>
      <code className="ml-9 text-[10px] text-fg-muted font-mono">webhook: {webhookPath}</code>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: any; sub?: string; tone?: "accent" | "warning" | "danger" }) {
  const color = tone === "accent" ? "text-accent" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-red-400" : "text-fg";
  return (
    <div className="rounded-xl bg-bg-card border border-border p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-fg-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function ActionCard({ href, icon, title, desc, tone, badge }: any) {
  return (
    <Link
      href={href as any}
      className="bg-bg-card border border-border hover:border-accent/50 rounded-xl p-4 transition group block"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={tone}>{icon}</span>
        <span className="font-bold text-sm">{title}</span>
        {badge && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-900 dark:text-red-200 font-bold">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-fg-muted leading-relaxed">{desc}</p>
    </Link>
  );
}
