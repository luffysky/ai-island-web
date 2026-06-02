/**
 * 麵包屑 — pathname → 顯示文字 映射
 *
 * 林董：「整個網站包括後台 都做麵包屑」
 *
 * 規則：
 *   - 已知 segment 給中文 label + emoji
 *   - 未知 segment 用原文 / id（chapter 14 → Ch14）
 *   - 動態路由（[id]）會 fallback 到「詳情」之類通用詞
 */

import { chapterDisplayNumberById } from "./chapter-display";

export type Crumb = { label: string; href?: string };

const SEGMENT_MAP: Record<string, string> = {
  // 公開
  "": "🏝️ 首頁",
  chapters: "📚 章節",
  forum: "💬 論壇",
  thread: "討論",
  blog: "📰 部落格",
  pricing: "💎 訂閱",
  about: "關於",
  privacy: "隱私",
  changelog: "更新紀錄",
  docs: "文件",
  login: "登入",
  signup: "註冊",
  career: "🚀 職涯路線",
  team: "團隊",
  // 學員
  me: "🎯 我的學習",
  notes: "📓 筆記",
  bookmarks: "🔖 收藏",
  playgrounds: "🎮 練功房",
  history: "歷史",
  certificates: "🎓 證書",
  "ai-history": "💬 AI 對話歷史",
  "ai-plan": "🗺️ 學習計畫",
  "api-keys": "🔑 我的 key",
  assignments: "📋 作業",
  assistant: "🤝 AI 助教",
  challenge: "🏆 週賽",
  "email-prefs": "📧 信件設定",
  footprint: "🛤️ 足跡",
  leetcode: "🧩 Leetcode",
  mentor: "👥 配對",
  "mock-interview": "💼 模擬面試",
  pet: "🐹 寵物",
  evolve: "升級",
  portfolios: "📂 作品集",
  quiz: "📝 題庫",
  referrals: "🎁 推薦",
  resources: "🌐 學習資源",
  resume: "📄 履歷",
  support: "🆘 客服",
  // 設定
  settings: "⚙️ 設定",
  "ai-keys": "🔑 AI Keys",
  notifications: "🔔 通知",
  // admin
  admin: "👑 後台",
  users: "👥 使用者",
  batch: "批次",
  timeline: "時間線",
  launchpad: "🚀 Launchpad",
  ai: "🤖 AI 管理",
  models: "模型",
  "usage-models": "用途對應",
  usage: "用量",
  cache: "快取",
  embeddings: "語意搜尋",
  "rewrite-lessons": "章節改寫",
  conversations: "對話紀錄",
  moderation: "AI 審核",
  "moderation-keywords": "審核字詞",
  line: "LINE",
  broadcast: "群發",
  "rich-menu": "Rich Menu",
  canned: "罐頭訊息",
  discord: "Discord",
  setup: "設定",
  diag: "診斷",
  "sync-roles": "同步 role",
  email: "Email",
  subscribers: "訂閱戶",
  campaigns: "Campaigns",
  test: "測試",
  broadcasts: "公告",
  ga4: "GA4",
  seo: "SEO",
  redirects: "轉址",
  marketing: "行銷",
  affiliate: "Affiliate",
  competitor: "競品",
  ads: "Ads",
  reports: "報表",
  segments: "區隔",
  cohort: "Cohort",
  kpi: "KPI",
  subscriptions: "訂閱",
  orders: "訂單",
  errors: "錯誤",
  health: "健康",
  audit: "Audit",
  analytics: "分析",
  "ai-cost": "💸 AI 成本",
  "lottie-settings": "🎨 Lottie 設定",
  "site-audit": "站台 Audit",
  zcoin: "Z-coin",
  airdrop: "Airdrop",
  env: "環境變數",
  "nami-playground": "🌊 Nami Playground",
  blog_admin: "部落格",
  // 其他通用
  new: "新增",
  edit: "編輯",
};

const HIDE_SEGMENTS = new Set(["console-x7k2", process.env.NEXT_PUBLIC_ADMIN_SLUG ?? ""].filter(Boolean));

function labelFor(seg: string, prevSeg?: string): string {
  if (SEGMENT_MAP[seg]) return SEGMENT_MAP[seg];
  // chapter id（ch01 / 1 / 26）
  if (prevSeg === "chapters" && /^\d+$/.test(seg)) return `Ch${chapterDisplayNumberById(Number(seg))}`;
  // discord/user/thread/blog id（UUID 或長 hex）→ 隱藏成「詳情」
  if (/^[0-9a-f-]{16,}$/.test(seg)) return "詳情";
  // 一般 fallback：保留原文、首字大寫
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function buildBreadcrumbs(pathname: string): Crumb[] {
  // 移除 admin slug（學員看不到、admin 看 /admin 開頭已含義）
  let segs = pathname.split("/").filter(Boolean);
  segs = segs.filter((s) => !HIDE_SEGMENTS.has(s));
  if (segs.length === 0) return [{ label: "🏝️ 首頁" }];

  const crumbs: Crumb[] = [{ label: "🏝️ 首頁", href: "/" }];
  let acc = "";
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    acc += `/${seg}`;
    const label = labelFor(seg, segs[i - 1]);
    crumbs.push({ label, href: i === segs.length - 1 ? undefined : acc });
  }
  return crumbs;
}
