import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CollapsibleAside } from "./CollapsibleAside";
import { LottieBackground } from "@/components/admin/LottieBackground";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { checkOwner, OWNER_NAME_TW } from "@/lib/is-owner";
import { NavGroup } from "./NavGroup";

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
    .select("role, username, avatar_url, display_name, is_owner")
    .eq("id", user.id)
    .single();

  // 用中央 isOwner helper 多重 signal 判斷 (is_owner 旗標優先、再 fallback role/username/email)
  const ownerCheck = checkOwner({
    id: user.id,
    username: profile?.username ?? null,
    role: profile?.role ?? null,
    isOwner: (profile as any)?.is_owner ?? null,
    email: user.email ?? null,
  });
  const isOwner = ownerCheck.isOwner;

  // owner = 林董；admin = 一般管理員、都可進後台
  if (!profile || !(isOwner || profile.role === "admin")) {
    redirect("/");
  }

  // 後台 Lottie 背景設定 (從 app_settings 撈、林董可在「應用設定 CRUD」調)
  let lottieSrc: string | null = null;
  let lottieOpacity = 0.12;
  try {
    const admin = createSupabaseAdmin();
    const { data: settings } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", ["admin_lottie_url", "admin_lottie_opacity"]);
    for (const s of (settings as any[]) ?? []) {
      if (s.key === "admin_lottie_url" && s.value) lottieSrc = String(s.value);
      if (s.key === "admin_lottie_opacity" && s.value) lottieOpacity = Number(s.value);
    }
  } catch {}

  return (
    <div className="admin-skin relative">
      <LottieBackground src={lottieSrc ?? undefined} opacity={lottieOpacity} blur={1} speed={0.4} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        <div className="mb-6 flex items-center justify-between bg-bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-white text-lg shadow-lg">
              🌸
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                AI 島 · 後台
                {isOwner && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-pink-400 text-black font-bold cursor-help"
                    title={`👑 Owner 識別命中: ${ownerCheck.reasons.join(" / ") || "(無、可能 bug)"}`}
                  >
                    👑 OWNER
                  </span>
                )}
              </h1>
              <p className="text-xs text-fg-muted">
                哈囉 {isOwner ? OWNER_NAME_TW : (profile?.display_name || profile?.username)} ✨
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

            {/* 1. 🏝️ 總覽 */}
            <NavGroup title="🏝️ 總覽 (Overview)">
              <AdminLink href="/admin">📊 Dashboard</AdminLink>
              <AdminLink href="/admin/kpi">📊 KPI 報表</AdminLink>
              <AdminLink href="/admin/analytics">📈 站內數據</AdminLink>
              <AdminLink href="/admin/analytics/learning-events">🧪 學習行為事件</AdminLink>
              <AdminLink href="/admin/cohort">📈 Cohort 留存</AdminLink>
              <AdminLink href="/admin/ab">🧪 A/B 測試</AdminLink>
              <AdminLink href="/admin/web-vitals">⚡ Web Vitals</AdminLink>
            </NavGroup>

            {/* 2. 👥 用戶 & CRM */}
            <NavGroup title="👥 用戶 & CRM">
              <AdminLink href="/admin/users">👥 使用者</AdminLink>
              <AdminLink href="/admin/segments">🎯 Segments</AdminLink>
              <AdminLink href="/admin/churn">🚨 流失預警</AdminLink>
              <AdminLink href="/admin/crm">💬 客服 (CRM)</AdminLink>
              <AdminLink href="/admin/tickets">🎫 客訴工單</AdminLink>
              <AdminLink href="/admin/impersonate">🕵️ Impersonate</AdminLink>
            </NavGroup>

            {/* 3. 📚 內容 */}
            <NavGroup title="📚 內容 (Content)">
              <AdminLink href="/admin/chapters">📚 章節管理</AdminLink>
              <AdminLink href="/admin/achievements">🏆 成就管理</AdminLink>
              <AdminLink href="/admin/gamification">🎮 遊戲化規則</AdminLink>
              <AdminLink href="/admin/changelog">📜 更新日誌</AdminLink>
              <AdminLink href="/admin/scheduled">⏰ 排程隊列</AdminLink>
            </NavGroup>

            {/* 4. 📣 行銷 (新) */}
            <NavGroup title="📣 行銷 (Marketing)">
              <AdminLink href="/admin/marketing">🚀 行銷主控台</AdminLink>
              <AdminLink href="/admin/marketing/copy">📝 AI 文案產生器</AdminLink>
              <AdminLink href="/admin/marketing/schedule">📅 內容日曆 / 排程</AdminLink>
              <AdminLink href="/admin/marketing/publish">📤 多平台一鍵發佈</AdminLink>
              <AdminLink href="/admin/marketing/ads">🎯 廣告 Copy 產生</AdminLink>
              <AdminLink href="/admin/marketing/utm">🔗 UTM Builder</AdminLink>
              <AdminLink href="/admin/marketing/brand">🎨 品牌風格庫</AdminLink>
              <AdminLink href="/admin/marketing/affiliates">🤝 推薦碼 / Affiliate</AdminLink>
              <AdminLink href="/admin/marketing/competitor">🔍 競品 / 關鍵字</AdminLink>
            </NavGroup>

            {/* 5. 💰 商務 (ERP) */}
            <NavGroup title="💰 商務 (ERP)">
              <AdminLink href="/admin/orders">💰 訂單</AdminLink>
              <AdminLink href="/admin/subscriptions">💎 訂閱</AdminLink>
              <AdminLink href="/admin/zcoin">🪙 Z-coin 流水</AdminLink>
              <AdminLink href="/admin/zcoin/airdrop">💸 Z-coin Airdrop</AdminLink>
            </NavGroup>

            {/* 6. 💬 通訊 & 客服 */}
            <NavGroup title="💬 通訊 (LINE / Email)">
              <AdminLink href="/admin/line">🏠 LINE 控制台</AdminLink>
              <AdminLink href="/admin/line/users">👥 LINE 綁定用戶</AdminLink>
              <AdminLink href="/admin/line/broadcast">📣 LINE 群發</AdminLink>
              <AdminLink href="/admin/line/canned">💌 罐頭訊息</AdminLink>
              <AdminLink href="/admin/line/rich-menu">🎴 Rich Menu</AdminLink>
              <AdminLink href="/admin/broadcasts">📢 站內公告</AdminLink>
              <AdminLink href="/admin/notifications">🔔 通知規則</AdminLink>
              <AdminLink href="/admin/email/subscribers">📧 Email 訂閱戶</AdminLink>
              <AdminLink href="/admin/email/campaigns">✉️ Email Campaigns</AdminLink>
              <AdminLink href="/admin/email/test">🧪 Email 測試發送</AdminLink>
            </NavGroup>

            {/* 7. 🤖 AI 管理 */}
            <NavGroup title="🤖 AI 管理">
              <AdminLink href="/admin/ai/models">🎛️ AI 模型管理</AdminLink>
              <AdminLink href="/admin/ai/usage-models">🔌 用途 ↔ 模型對應</AdminLink>
              <AdminLink href="/admin/ai/usage">📊 Token 用量</AdminLink>
              <AdminLink href="/admin/ai/cache">🗄️ 回應快取</AdminLink>
              <AdminLink href="/admin/ai/embeddings">🧠 語意搜尋 / RAG</AdminLink>
              <AdminLink href="/admin/ai/conversations">💬 對話紀錄</AdminLink>
              <AdminLink href="/admin/ai/moderation">🛡️ AI 審核</AdminLink>
              <AdminLink href="/admin/ai/moderation-keywords">🔤 審核關鍵字</AdminLink>
            </NavGroup>

            {/* 8. 📈 SEO & 流量 */}
            <NavGroup title="📈 SEO & 流量">
              <AdminLink href="/admin/ga4">📈 GA4 / 站台分析</AdminLink>
              <AdminLink href="/admin/seo">🔍 SEO 管理</AdminLink>
              <AdminLink href="/admin/seo/redirects">↪️ 轉址 (301/302)</AdminLink>
            </NavGroup>

            {/* 9. 🛡️ 風控 & 審核 */}
            <NavGroup title="🛡️ 風控 & 審核">
              <AdminLink href="/admin/moderation/comments">💬 留言審核</AdminLink>
              <AdminLink href="/admin/moderation/forum">🗣️ 論壇審核</AdminLink>
              <AdminLink href="/admin/reports">🚨 檢舉收件箱</AdminLink>
              <AdminLink href="/admin/breach">⚠️ 安全事件</AdminLink>
            </NavGroup>

            {/* 10. 🌊 Nami 工具 */}
            <NavGroup title="🌊 Nami 工具">
              <AdminLink href="/admin/nami-playground">🐍 Python Playground</AdminLink>
              <AdminLink href="/admin/nami-ide">💻 Nami IDE (多語言)</AdminLink>
              <AdminLink href="/admin/lottie-settings">🎨 Lottie 動畫設定</AdminLink>
              <AdminLink href="/admin/og-preview">🖼️ AI OG 圖預覽 (5 model)</AdminLink>
            </NavGroup>

            {/* 11. 🔐 系統設定 */}
            <NavGroup title="🔐 系統設定">
              <AdminLink href="/admin/health">💓 系統健康</AdminLink>
              <AdminLink href="/admin/db-check">🩺 DB 狀態檢查</AdminLink>
              <AdminLink href="/admin/site-audit">🔍 全站體檢</AdminLink>
              <AdminLink href="/admin/env">🔐 環境變數</AdminLink>
              <AdminLink href="/admin/audit">📝 操作紀錄</AdminLink>
              <AdminLink href="/admin/errors">🛡️ 錯誤日誌</AdminLink>
              <AdminLink href="/admin/rate-limits">🚦 Rate Limit</AdminLink>
              <AdminLink href="/admin/gdpr">🔐 GDPR 請求</AdminLink>
              <AdminLink href="/admin/ops">🛠️ Ops (DB / 快取)</AdminLink>
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

// NavGroup 抽到 ./NavGroup.tsx (client component、可折疊 + localStorage 記憶)

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
