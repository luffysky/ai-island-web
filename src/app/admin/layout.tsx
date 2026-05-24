import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CollapsibleAside } from "./CollapsibleAside";

// 強制每次都 server-side render、不 cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_SLUG = process.env.ADMIN_SLUG || process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";
const ADMIN_BASE = `/${ADMIN_SLUG}/admin`;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();

  // 用 getUser 確保 token 有被 supabase server 驗證（不是只看 cookie）
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(ADMIN_BASE)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, avatar_url, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="admin-skin">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6 flex items-center justify-between bg-bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-white text-lg shadow-lg">
              🌸
            </div>
            <div>
              <h1 className="text-xl font-bold">AI 島 · 後台</h1>
              <p className="text-xs text-fg-muted">
                哈囉 {profile?.display_name || profile?.username} ✨
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-fg-muted hover:text-accent transition px-3 py-1.5 rounded-full hover:bg-bg-elevated"
          >
            ← 回前台
          </Link>
        </div>

      <div className="flex gap-6">
        <CollapsibleAside>
          <nav className="space-y-4 text-sm">
            <NavGroup title="總覽">
              <AdminLink href="/admin">📊 Dashboard</AdminLink>
              <AdminLink href="/admin/analytics">📈 數據分析</AdminLink>
              <AdminLink href="/admin/analytics/learning-events">🧪 學習行為事件</AdminLink>
              <AdminLink href="/admin/web-vitals">⚡ Web Vitals</AdminLink>
              <AdminLink href="/admin/kpi">📊 KPI 報表</AdminLink>
              <AdminLink href="/admin/ab">🧪 A/B 測試</AdminLink>
              <AdminLink href="/admin/cohort">📈 Cohort 留存</AdminLink>
            </NavGroup>

            <NavGroup title="用戶">
              <AdminLink href="/admin/users">👥 使用者</AdminLink>
              <AdminLink href="/admin/churn">🚨 流失預警</AdminLink>
              <AdminLink href="/admin/crm">💬 客服 (CRM)</AdminLink>
              <AdminLink href="/admin/broadcasts">📣 公告 / Email</AdminLink>
              <AdminLink href="/admin/notifications">🔔 通知規則</AdminLink>
              <AdminLink href="/admin/email/subscribers">📧 Email 訂閱戶</AdminLink>
              <AdminLink href="/admin/email/campaigns">✉️ Email Campaigns</AdminLink>
              <AdminLink href="/admin/email/test">🧪 Email 測試發送</AdminLink>
              <AdminLink href="/admin/segments">🎯 Segments</AdminLink>
              <AdminLink href="/admin/tickets">🎫 客訴工單</AdminLink>
            </NavGroup>

            <NavGroup title="商務 (ERP)">
              <AdminLink href="/admin/orders">💰 訂單</AdminLink>
              <AdminLink href="/admin/subscriptions">💎 訂閱</AdminLink>
              <AdminLink href="/admin/zcoin">🪙 Z-coin 流水</AdminLink>
              <AdminLink href="/admin/zcoin/airdrop">💸 Z-coin Airdrop</AdminLink>
            </NavGroup>

            <NavGroup title="AI">
              <AdminLink href="/admin/ai/models">🤖 模型管理</AdminLink>
              <AdminLink href="/admin/ai/usage">📊 Token 用量</AdminLink>
              <AdminLink href="/admin/ai/cache">💾 回應快取</AdminLink>
              <AdminLink href="/admin/ai/conversations">💬 對話紀錄</AdminLink>
              <AdminLink href="/admin/ai/moderation">🛡️ 對話審核</AdminLink>
              <AdminLink href="/admin/ai/moderation-keywords">🔍 審核關鍵字</AdminLink>
            </NavGroup>

            <NavGroup title="LINE 💚">
              <AdminLink href="/admin/line">🏠 LINE 控制台</AdminLink>
              <AdminLink href="/admin/line/users">👥 綁定用戶 / 推訊息</AdminLink>
              <AdminLink href="/admin/line/broadcast">📣 群發訊息</AdminLink>
              <AdminLink href="/admin/crm">💬 客服對話 (CRM)</AdminLink>
            </NavGroup>

            <NavGroup title="SEO / 流量">
              <AdminLink href="/admin/ga4">📈 站台分析</AdminLink>
              <AdminLink href="/admin/seo">🔍 SEO 管理</AdminLink>
              <AdminLink href="/admin/seo/redirects">↪️ 轉址</AdminLink>
            </NavGroup>

            <NavGroup title="內容">
              <AdminLink href="/admin/chapters">📚 章節管理</AdminLink>
              <AdminLink href="/admin/achievements">🏆 成就管理</AdminLink>
              <AdminLink href="/admin/gamification">🎮 遊戲化規則</AdminLink>
              <AdminLink href="/admin/changelog">📜 更新日誌</AdminLink>
              <AdminLink href="/admin/scheduled">⏰ 排程隊列</AdminLink>
              <AdminLink href="/admin/moderation/comments">💬 留言審核</AdminLink>
              <AdminLink href="/admin/moderation/forum">🗣️ 論壇審核</AdminLink>
              <AdminLink href="/admin/reports">🚨 檢舉收件箱</AdminLink>
            </NavGroup>

            <NavGroup title="系統">
              <AdminLink href="/admin/health">💓 系統健康</AdminLink>
              <AdminLink href="/admin/db-check">🩺 DB 狀態檢查</AdminLink>
              <AdminLink href="/admin/env">🔐 環境變數</AdminLink>
              <AdminLink href="/admin/audit">📝 操作紀錄</AdminLink>
              <AdminLink href="/admin/errors">🛡️ 錯誤日誌</AdminLink>
              <AdminLink href="/admin/rate-limits">🚦 Rate Limit</AdminLink>
              <AdminLink href="/admin/gdpr">🔐 GDPR 請求</AdminLink>
              <AdminLink href="/admin/impersonate">🕵️ Impersonate</AdminLink>
              <AdminLink href="/admin/ops">🛠️ Ops（DB / 快取）</AdminLink>
              <AdminLink href="/admin/settings">⚙️ 系統設定</AdminLink>
              <AdminLink href="/admin/app-settings">🎛️ 應用設定 CRUD</AdminLink>
            </NavGroup>
          </nav>
        </CollapsibleAside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      </div>
    </div>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-fg-muted uppercase tracking-wider px-3 mb-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  const publicHref = href === "/admin" ? ADMIN_BASE : href.replace(/^\/admin/, ADMIN_BASE);

  return (
    <Link
      href={publicHref as any}
      className="block px-3 py-2 rounded-full hover:bg-bg-elevated hover:text-accent hover:translate-x-0.5 transition-all"
    >
      {children}
    </Link>
  );
}
