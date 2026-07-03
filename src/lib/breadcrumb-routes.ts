/**
 * 麵包屑 — pathname → 顯示文字 映射
 *
 * 林董：「整個網站包括後台 都做麵包屑」
 *
 * 規則：
 *   - 已知 segment 給中文 label + lucide icon
 *   - 未知 segment 用原文 / id（chapter 14 → Ch14）
 *   - 動態路由（[id]）會 fallback 到「詳情」之類通用詞
 */

import type { LucideIcon } from "lucide-react";
import {
  Home, BookOpen, MessagesSquare, Newspaper, Gem, Rocket, Target,
  NotebookPen, Bookmark, Gamepad2, GraduationCap, MessageSquare, Map,
  Key, ClipboardList, Handshake, Trophy, Mail, Footprints, Puzzle,
  Users, Briefcase, FolderOpen, SquarePen, FileText, Gift, Globe,
  LifeBuoy, Settings, Bell, Crown, Bot, DollarSign, Palette, Waves,
} from "lucide-react";
import { chapterDisplayNumberById } from "./chapter-display";

export type Crumb = { label: string; href?: string; icon?: LucideIcon };

type SegInfo = { label: string; icon?: LucideIcon };

const HOME: SegInfo = { label: "首頁", icon: Home };

const SEGMENT_MAP: Record<string, SegInfo> = {
  // 公開
  "": HOME,
  chapters: { label: "章節", icon: BookOpen },
  forum: { label: "論壇", icon: MessagesSquare },
  thread: { label: "討論" },
  blog: { label: "部落格", icon: Newspaper },
  pricing: { label: "訂閱", icon: Gem },
  about: { label: "關於" },
  privacy: { label: "隱私" },
  changelog: { label: "更新紀錄" },
  docs: { label: "文件" },
  login: { label: "登入" },
  signup: { label: "註冊" },
  career: { label: "職涯路線", icon: Rocket },
  team: { label: "團隊" },
  // 學員
  me: { label: "我的學習", icon: Target },
  notes: { label: "筆記", icon: NotebookPen },
  bookmarks: { label: "收藏", icon: Bookmark },
  playgrounds: { label: "練功房", icon: Gamepad2 },
  history: { label: "歷史" },
  certificates: { label: "證書", icon: GraduationCap },
  "ai-history": { label: "AI 對話歷史", icon: MessageSquare },
  "ai-plan": { label: "學習計畫", icon: Map },
  "api-keys": { label: "我的 key", icon: Key },
  assignments: { label: "作業", icon: ClipboardList },
  assistant: { label: "AI 助教", icon: Handshake },
  challenge: { label: "週賽", icon: Trophy },
  "email-prefs": { label: "信件設定", icon: Mail },
  footprint: { label: "足跡", icon: Footprints },
  leetcode: { label: "Leetcode", icon: Puzzle },
  mentor: { label: "配對", icon: Users },
  "mock-interview": { label: "模擬面試", icon: Briefcase },
  pet: { label: "🐹 寵物" }, // 吉祥物、無合適 lucide icon → 保留 emoji
  evolve: { label: "升級" },
  portfolios: { label: "作品集", icon: FolderOpen },
  quiz: { label: "題庫", icon: SquarePen },
  referrals: { label: "推薦", icon: Gift },
  resources: { label: "學習資源", icon: Globe },
  resume: { label: "履歷", icon: FileText },
  support: { label: "客服", icon: LifeBuoy },
  // 設定
  settings: { label: "設定", icon: Settings },
  "ai-keys": { label: "AI Keys", icon: Key },
  notifications: { label: "通知", icon: Bell },
  // admin
  admin: { label: "後台", icon: Crown },
  users: { label: "使用者", icon: Users },
  batch: { label: "批次" },
  timeline: { label: "時間線" },
  launchpad: { label: "Launchpad", icon: Rocket },
  ai: { label: "AI 管理", icon: Bot },
  models: { label: "模型" },
  "usage-models": { label: "用途對應" },
  usage: { label: "用量" },
  cache: { label: "快取" },
  embeddings: { label: "語意搜尋" },
  "rewrite-lessons": { label: "章節改寫" },
  conversations: { label: "對話紀錄" },
  moderation: { label: "AI 審核" },
  "moderation-keywords": { label: "審核字詞" },
  line: { label: "LINE" },
  broadcast: { label: "群發" },
  "rich-menu": { label: "Rich Menu" },
  canned: { label: "罐頭訊息" },
  discord: { label: "Discord" },
  setup: { label: "設定" },
  diag: { label: "診斷" },
  "sync-roles": { label: "同步 role" },
  email: { label: "Email" },
  subscribers: { label: "訂閱戶" },
  campaigns: { label: "Campaigns" },
  test: { label: "測試" },
  broadcasts: { label: "公告" },
  ga4: { label: "GA4" },
  seo: { label: "SEO" },
  redirects: { label: "轉址" },
  marketing: { label: "行銷" },
  affiliate: { label: "Affiliate" },
  competitor: { label: "競品" },
  ads: { label: "Ads" },
  reports: { label: "報表" },
  segments: { label: "區隔" },
  cohort: { label: "Cohort" },
  kpi: { label: "KPI" },
  subscriptions: { label: "訂閱" },
  orders: { label: "訂單" },
  errors: { label: "錯誤" },
  health: { label: "健康" },
  audit: { label: "Audit" },
  analytics: { label: "分析" },
  "ai-cost": { label: "AI 成本", icon: DollarSign },
  "lottie-settings": { label: "Lottie 設定", icon: Palette },
  "site-audit": { label: "站台 Audit" },
  zcoin: { label: "Z-coin" },
  airdrop: { label: "Airdrop" },
  env: { label: "環境變數" },
  "nami-playground": { label: "Nami Playground", icon: Waves },
  blog_admin: { label: "部落格" },
  // 其他通用
  new: { label: "新增" },
  edit: { label: "編輯" },
};

const HIDE_SEGMENTS = new Set(["console-x7k2", process.env.NEXT_PUBLIC_ADMIN_SLUG ?? ""].filter(Boolean));

function infoFor(seg: string, prevSeg?: string): SegInfo {
  if (SEGMENT_MAP[seg]) return SEGMENT_MAP[seg];
  // chapter id（ch01 / 1 / 26）
  if (prevSeg === "chapters" && /^\d+$/.test(seg)) return { label: `Ch${chapterDisplayNumberById(Number(seg))}` };
  // discord/user/thread/blog id（UUID 或長 hex）→ 隱藏成「詳情」
  if (/^[0-9a-f-]{16,}$/.test(seg)) return { label: "詳情" };
  // 一般 fallback：保留原文、首字大寫
  return { label: seg.charAt(0).toUpperCase() + seg.slice(1) };
}

export function buildBreadcrumbs(pathname: string): Crumb[] {
  // 移除 admin slug（學員看不到、admin 看 /admin 開頭已含義）
  let segs = pathname.split("/").filter(Boolean);
  segs = segs.filter((s) => !HIDE_SEGMENTS.has(s));
  if (segs.length === 0) return [{ label: HOME.label, icon: HOME.icon }];

  const crumbs: Crumb[] = [{ label: HOME.label, icon: HOME.icon, href: "/" }];
  let acc = "";
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    acc += `/${seg}`;
    const info = infoFor(seg, segs[i - 1]);
    crumbs.push({ label: info.label, icon: info.icon, href: i === segs.length - 1 ? undefined : acc });
  }
  return crumbs;
}
