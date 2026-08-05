"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { CountUp } from "@/components/ui/CountUp";
import { StreakFlame } from "@/components/ui/StreakFlame";
import {
  LayoutDashboard,
  StickyNote,
  Bookmark,
  Code2,
  History,
  Activity,
  Award,
  PenLine,
  Cat,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

type Profile = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  xp?: number | null;
  level?: number | null;
  z_coin?: number | null;
  streak_days?: number | null;
};

const STORAGE_KEY = "me_sidebar_collapsed";
const GROUP_STORAGE_KEY = "me_sidebar_closed_groups";

type MeItem = { href: string; icon: React.ReactNode; label: string };
type MeGroup = { key: string; label: string; emoji: string; items: MeItem[] };

// 分類側欄：每組一個標題 + 子項目（子 li）。手機橫向列會攤平所有項目。
const ME_GROUPS: MeGroup[] = [
  {
    key: "learning",
    label: "學習",
    emoji: "📚",
    items: [
      { href: "/me", icon: <LayoutDashboard size={16} />, label: "學習總覽" },
      { href: "/me/dashboard", icon: <span>📊</span>, label: "學習儀表板" },
      { href: "/me/history", icon: <History size={16} />, label: "學習紀錄" },
      { href: "/me/footprint", icon: <span>🛤️</span>, label: "學習足跡" },
      { href: "/me/activity", icon: <Activity size={16} />, label: "操作記錄" },
      { href: "/me/quiz", icon: <span>🧠</span>, label: "每日測驗" },
      { href: "/me/leetcode", icon: <span>💻</span>, label: "Leetcode 推薦" },
      { href: "/me/challenge", icon: <span>🏆</span>, label: "週賽 Challenge" },
    ],
  },
  {
    key: "content",
    label: "我的內容",
    emoji: "📝",
    items: [
      { href: "/me/notes", icon: <StickyNote size={16} />, label: "我的筆記" },
      { href: "/notes/public", icon: <Globe size={16} />, label: "筆記公開牆" },
      { href: "/me/bookmarks", icon: <Bookmark size={16} />, label: "我的書籤" },
      { href: "/me/playgrounds", icon: <Code2 size={16} />, label: "我的程式碼" },
      { href: "/me/playground", icon: <Code2 size={16} />, label: "程式碼遊樂場" },
      { href: "/me/blog", icon: <PenLine size={16} />, label: "我的部落格" },
      { href: "/me/portfolios", icon: <span>🎨</span>, label: "作品集" },
      { href: "/me/certificates", icon: <Award size={16} />, label: "證書" },
    ],
  },
  {
    key: "ai",
    label: "AI 工具",
    emoji: "🤖",
    items: [
      { href: "/me/ai-plan", icon: <span>🧭</span>, label: "AI 學習規劃" },
      { href: "/me/ai-history", icon: <span>🤖</span>, label: "AI 對話紀錄" },
      { href: "/me/assistant", icon: <span>🤝</span>, label: "AI 助教" },
      { href: "/me/job-kit", icon: <span>🎒</span>, label: "AI 求職包" },
      { href: "/me/resume", icon: <span>🪪</span>, label: "AI 履歷" },
      { href: "/me/mock-interview", icon: <span>🎤</span>, label: "AI 模擬面試" },
    ],
  },
  {
    key: "account",
    label: "帳戶 & 資源",
    emoji: "🪙",
    items: [
      { href: "/me/ledger", icon: <span>🪙</span>, label: "Z幣/經驗明細" },
      { href: "/me/energy", icon: <span>🔋</span>, label: "AI 能源中心" },
      { href: "/me/ai-usage", icon: <span>📊</span>, label: "AI 使用量" },
      { href: "/settings/ai-keys", icon: <span>🔑</span>, label: "我的模型 Key (BYOK)" },
      { href: "/me/api-keys", icon: <span>🔑</span>, label: "對外 API Key" },
      { href: "/me/resources", icon: <span>🧭</span>, label: "外部資源" },
      { href: "/me/assignments", icon: <span>📋</span>, label: "作業" },
      { href: "/me/mentor", icon: <span>🤝</span>, label: "學員配對" },
      { href: "/me/pet", icon: <Cat size={16} />, label: "我的寵物" },
      { href: "/me/referrals", icon: <span>🎁</span>, label: "邀請碼" },
      { href: "/me/support", icon: <span>💬</span>, label: "客服中心" },
    ],
  },
  {
    key: "personalize",
    label: "個人化",
    emoji: "🎨",
    items: [
      { href: "/theme-studio", icon: <span>🎨</span>, label: "主題（Theme Studio）" },
      { href: "/background", icon: <span>🖼️</span>, label: "背景" },
      { href: "/profile", icon: <span>👤</span>, label: "個人檔案" },
      { href: "/settings", icon: <span>⚙️</span>, label: "設定" },
      { href: "/me/email-prefs", icon: <span>✉️</span>, label: "信件偏好" },
    ],
  },
];

const ALL_ITEMS: MeItem[] = ME_GROUPS.flatMap((g) => g.items);

export function MeSidebar({ profile }: { profile: Profile | null }) {
  const t = useTranslations("me");
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    try {
      const raw = localStorage.getItem(GROUP_STORAGE_KEY);
      if (raw) setClosedGroups(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const toggleGroup = (key: string) => {
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <>
      {/* 手機：橫向捲動快捷列（攤平所有分組項目）。 */}
      <div className="md:hidden -mx-6 px-6 mb-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max pb-1">
          {ALL_ITEMS.map((l) => (
            <Link
              key={l.href + l.label}
              href={l.href as any}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs hover:text-accent hover:border-accent/50 transition"
            >
              {l.icon}
              <span>{l.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 桌面：左側欄。sticky + 自身 overflow → 與右側內容分開滾動。 */}
      <aside
        className={`hidden md:block shrink-0 self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar transition-all duration-200 ${
          collapsed ? "w-10" : "w-56"
        }`}
      >
        {/* Toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? t("sidebarExpand") : t("sidebarCollapse")}
          className="w-full flex items-center justify-end mb-2 p-1.5 text-fg-muted hover:text-accent transition"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Profile card */}
        {!collapsed && (
          <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  width={48}
                  height={48}
                  unoptimized
                  className="w-12 h-12 rounded-full object-cover"
                  alt=""
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-accent-contrast font-bold text-lg">
                  {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">
                  {profile?.display_name || profile?.username}
                </div>
                <div className="text-xs text-fg-muted">
                  Lv {profile?.level ?? 1} · <CountUp value={profile?.xp ?? 0} /> XP
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-bg rounded p-2">
                <div className="text-yellow-400 font-bold">
                  🪙 <CountUp value={profile?.z_coin ?? 0} />
                </div>
                <div className="text-fg-muted">Z-coin</div>
              </div>
              <div className="bg-bg rounded p-2">
                <div className="text-orange-400 font-bold flex items-center justify-center gap-1">
                  <StreakFlame streak={profile?.streak_days ?? 0} /> <CountUp value={profile?.streak_days ?? 0} />
                </div>
                <div className="text-fg-muted">{t("sidebarStreakDays")}</div>
              </div>
            </div>
          </div>
        )}

        {/* 收合狀態：只顯示 icon、攤平不分組 */}
        {collapsed ? (
          <nav className="space-y-0.5 text-sm">
            {ALL_ITEMS.map((l) => (
              <MeLink key={l.href + l.label} href={l.href} icon={l.icon} collapsed>
                {l.label}
              </MeLink>
            ))}
          </nav>
        ) : (
          <nav className="space-y-3 text-sm">
            {ME_GROUPS.map((g) => {
              const open = !closedGroups.has(g.key);
              return (
                <div key={g.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.key)}
                    aria-expanded={open}
                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-fg-muted hover:text-fg transition"
                  >
                    <span>{g.emoji}</span>
                    <span className="flex-1 text-left">{g.label}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                  </button>
                  {open && (
                    <div className="mt-0.5 space-y-0.5 border-l border-border ml-3 pl-1.5">
                      {g.items.map((l) => (
                        <MeLink key={l.href + l.label} href={l.href} icon={l.icon} collapsed={false}>
                          {l.label}
                        </MeLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </aside>
    </>
  );
}

function MeLink({
  href,
  icon,
  collapsed,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href as any}
      title={collapsed && typeof children === "string" ? children : undefined}
      className={`flex items-center gap-2 rounded-lg hover:bg-bg-card hover:text-accent transition ${
        collapsed ? "justify-center p-2" : "px-3 py-1.5"
      }`}
    >
      {icon}
      {!collapsed && <span>{children}</span>}
    </Link>
  );
}
