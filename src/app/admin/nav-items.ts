/**
 * 後台導覽的「單一資料來源」(source of truth)。
 *
 * layout.tsx 用這份資料 render 側邊欄；CommandPalette (Cmd/Ctrl+K) 也吃同一份、
 * 兩邊永遠一致。新增/搬移後台頁 → 只改這裡一處。
 *
 * label 前面保留 emoji（跟原側邊欄視覺一致）；`plain` 是去掉 emoji 的純文字、
 * 給指令面板做模糊搜尋用。ownerOnly = 只有站長(林董)看得到。
 */

import { canAccessSection, sectionForPath } from "@/lib/admin-roles";

export type AdminNavItem = {
  href: string; // 內部路徑（/admin/...），render 時用 adminHref() 加 slug
  label: string; // 含 emoji 的顯示字（跟側邊欄一致）
  ownerOnly?: boolean;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

/** 置頂、不歸類的項目 */
export const ADMIN_NAV_TOP: AdminNavItem[] = [
  { href: "/admin/idea-fragments", label: "💡 給我一個點子" },
  { href: "/admin/grant", label: "🏆 補助 & 競賽作戰室" },
  { href: "/admin/opportunities", label: "🧭 機會雷達（AI 島該投的）" },
  { href: "/admin/opportunities/sources", label: "📡 雷達來源 / 待審" },
];

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "🏝️ 總覽 (Overview)",
    items: [
      { href: "/admin", label: "📊 Dashboard" },
      { href: "/admin/launchpad", label: "🚀 Launchpad（全功能 / 待辦 / 許願池）" },
      { href: "/admin/ai-cost", label: "💰 AI 成本 / Unit Economics" },
      { href: "/admin/kpi", label: "📊 KPI 報表" },
      { href: "/admin/analytics", label: "📈 站內數據" },
      { href: "/admin/analytics/learning-events", label: "🧪 學習行為事件" },
      { href: "/admin/cohort", label: "📈 Cohort 留存" },
      { href: "/admin/ab", label: "🧪 A/B 測試" },
      { href: "/admin/web-vitals", label: "⚡ Web Vitals" },
    ],
  },
  {
    title: "👥 用戶 & CRM",
    items: [
      { href: "/admin/users", label: "👥 使用者" },
      { href: "/admin/segments", label: "🎯 Segments" },
      { href: "/admin/churn", label: "🚨 流失預警" },
      { href: "/admin/crm", label: "💬 客服 (CRM)" },
      { href: "/admin/tickets", label: "🎫 客訴工單" },
      { href: "/admin/impersonate", label: "🕵️ Impersonate" },
    ],
  },
  {
    title: "📚 內容 (Content)",
    items: [
      { href: "/admin/chapters", label: "📚 章節管理" },
      { href: "/admin/chapters-audit", label: "🔍 章節 audit (品質掃描)" },
      { href: "/admin/achievements", label: "🏆 成就管理" },
      { href: "/admin/forum-seed", label: "🌱 討論區種子生成器" },
      { href: "/admin/gamification", label: "🎮 遊戲化規則" },
      { href: "/admin/changelog", label: "📜 更新日誌" },
      { href: "/admin/scheduled", label: "⏰ 排程隊列" },
    ],
  },
  {
    title: "📣 行銷 (Marketing)",
    items: [
      { href: "/admin/marketing", label: "🚀 行銷主控台" },
      { href: "/admin/marketing/copy", label: "📝 AI 文案產生器" },
      { href: "/admin/marketing/schedule", label: "📅 內容日曆 / 排程" },
      { href: "/admin/marketing/publish", label: "📤 多平台一鍵發佈" },
      { href: "/admin/marketing/ads", label: "🎯 廣告 Copy 產生" },
      { href: "/admin/marketing/utm", label: "🔗 UTM Builder" },
      { href: "/admin/marketing/brand", label: "🎨 品牌風格庫" },
      { href: "/admin/marketing/affiliates", label: "🤝 推薦碼 / Affiliate" },
      { href: "/admin/marketing/competitor", label: "🔍 競品 / 關鍵字" },
    ],
  },
  {
    title: "💰 商務 (ERP)",
    items: [
      { href: "/admin/orders", label: "💰 金流工作台" },
      { href: "/admin/subscriptions", label: "💎 訂閱" },
      { href: "/admin/zcoin", label: "🪙 Z-coin 流水" },
      { href: "/admin/zcoin/airdrop", label: "💸 Z-coin Airdrop" },
    ],
  },
  {
    title: "💬 通訊 (LINE / Email / Discord)",
    items: [
      { href: "/admin/line", label: "🏠 LINE 控制台" },
      { href: "/admin/line/users", label: "👥 LINE 綁定用戶" },
      { href: "/admin/line/broadcast", label: "📣 LINE 群發" },
      { href: "/admin/line/canned", label: "💌 罐頭訊息" },
      { href: "/admin/line/rich-menu", label: "🎴 Rich Menu" },
      { href: "/admin/broadcasts", label: "📢 站內公告" },
      { href: "/admin/notifications", label: "🔔 通知規則" },
      { href: "/admin/email/subscribers", label: "📧 Email 訂閱戶" },
      { href: "/admin/email/campaigns", label: "✉️ Email Campaigns" },
      { href: "/admin/email/test", label: "🧪 Email 測試發送" },
      { href: "/admin/discord", label: "🟣 Discord 控制台" },
      { href: "/admin/telegram", label: "📨 Telegram Bot 設定" },
    ],
  },
  {
    title: "🤖 AI 管理",
    items: [
      { href: "/admin/ai/models", label: "🎛️ AI 模型管理" },
      { href: "/admin/ai/usage-models", label: "🔌 用途 ↔ 模型對應" },
      { href: "/admin/creator-island", label: "🏝️ 創作者島嶼監看" },
      { href: "/admin/creator-island/messages", label: "🔒 私訊紀錄（站長）", ownerOnly: true },
      { href: "/admin/ai/creator-island", label: "🏝️ 創作者島嶼 AI 模型" },
      { href: "/admin/ai/usage", label: "📊 Token 用量", ownerOnly: true },
      { href: "/admin/ai/cache", label: "🗄️ 回應快取" },
      { href: "/admin/ai/embeddings", label: "🧠 語意搜尋 / RAG" },
      { href: "/admin/ai/rewrite-lessons", label: "✍️ 章節友善化改寫" },
      { href: "/admin/ai/conversations", label: "💬 對話紀錄", ownerOnly: true },
      { href: "/admin/ai/moderation", label: "🛡️ AI 審核" },
      { href: "/admin/ai/moderation-keywords", label: "🔤 審核關鍵字" },
    ],
  },
  {
    title: "📈 SEO & 流量",
    items: [
      { href: "/admin/ga4", label: "📈 GA4 / 站台分析" },
      { href: "/admin/seo", label: "🔍 SEO 管理" },
      { href: "/admin/seo/redirects", label: "↪️ 轉址 (301/302)" },
    ],
  },
  {
    title: "🛡️ 風控 & 審核",
    items: [
      { href: "/admin/moderation/comments", label: "💬 留言審核" },
      { href: "/admin/moderation/forum", label: "🗣️ 論壇審核" },
      { href: "/admin/reports", label: "🚨 檢舉收件箱" },
      { href: "/admin/breach", label: "⚠️ 安全事件" },
    ],
  },
  {
    title: "🌊 Nami 工具",
    items: [
      { href: "/admin/nami-playground", label: "🐍 Python Playground" },
      { href: "/admin/nami-ide", label: "💻 Nami IDE (多語言)" },
      { href: "/admin/lottie-settings", label: "🎨 Lottie 動畫設定" },
      { href: "/admin/og-preview", label: "🖼️ AI OG 圖預覽 (5 model)" },
    ],
  },
  {
    title: "🔐 系統設定",
    items: [
      { href: "/admin/health", label: "💓 系統健康" },
      { href: "/admin/db-check", label: "🩺 DB 狀態檢查" },
      { href: "/admin/site-audit", label: "🔍 全站體檢" },
      { href: "/admin/env", label: "🔐 環境變數" },
      { href: "/admin/flags", label: "🚩 功能開關 (Feature Flags)" },
      { href: "/admin/audit", label: "📝 操作紀錄" },
      { href: "/admin/errors", label: "🛡️ 錯誤日誌" },
      { href: "/admin/rate-limits", label: "🚦 Rate Limit" },
      { href: "/admin/gdpr", label: "🔐 GDPR 請求" },
      { href: "/admin/ops", label: "🛠️ Ops (DB / 快取)" },
      { href: "/admin/settings", label: "⚙️ 系統設定（功能開關 / 定價 / 維護）" },
    ],
  },
];

/** 快速動作（指令面板專用、不在側邊欄）。href 走內部路徑、面板會加 slug。 */
export type AdminQuickAction = {
  id: string;
  label: string;
  href: string;
  hint?: string;
  ownerOnly?: boolean;
};

export const ADMIN_QUICK_ACTIONS: AdminQuickAction[] = [
  { id: "qa-new-flag", label: "新增功能開關 (Feature Flag)", href: "/admin/flags", hint: "Feature Flags" },
  { id: "qa-audit-today", label: "查看今天的操作紀錄", href: "/admin/audit", hint: "Audit Log" },
  { id: "qa-new-broadcast", label: "發布站內公告", href: "/admin/broadcasts", hint: "公告" },
  { id: "qa-users", label: "搜尋 / 管理使用者", href: "/admin/users", hint: "Users" },
  { id: "qa-orders", label: "查訂單 / 金流工作台", href: "/admin/orders", hint: "Orders" },
  { id: "qa-ai-cost", label: "看 AI 成本 / Unit Economics", href: "/admin/ai-cost", hint: "Cost" },
  { id: "qa-health", label: "系統健康檢查", href: "/admin/health", hint: "Health" },
  { id: "qa-settings", label: "系統設定（維護模式 / 定價）", href: "/admin/settings", hint: "Settings" },
];

/** 去掉開頭 emoji / 符號、回傳可搜尋的純文字。 */
export function stripEmoji(label: string): string {
  return label
    .replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/gu,
      "",
    )
    .trim();
}

/**
 * 扁平化所有可導覽目的地（含群組標題），依 ownerOnly + RBAC section 過濾。
 * 傳入 role 時、scoped 角色只會看到自己 section 的項目（跟側邊欄一致）；
 * 不傳 role（或 owner/admin）→ 沿用舊行為、只看 ownerOnly。
 */
export function flattenNav(
  isOwner: boolean,
  role?: string | null,
): Array<AdminNavItem & { group: string; plain: string }> {
  const out: Array<AdminNavItem & { group: string; plain: string }> = [];
  const allow = (href: string) => canAccessSection(role ?? null, isOwner, sectionForPath(href));
  for (const it of ADMIN_NAV_TOP) {
    if (!allow(it.href)) continue;
    out.push({ ...it, group: "捷徑", plain: stripEmoji(it.label) });
  }
  for (const g of ADMIN_NAV_GROUPS) {
    for (const it of g.items) {
      if (it.ownerOnly && !isOwner) continue;
      if (!allow(it.href)) continue;
      out.push({ ...it, group: stripEmoji(g.title) || g.title, plain: stripEmoji(it.label) });
    }
  }
  return out;
}
