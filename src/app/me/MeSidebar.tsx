"use client";

import { useEffect, useState } from "react";
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
  Award,
  PenLine,
  Cat,
  ChevronLeft,
  ChevronRight,
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

// 單一來源：桌面側欄 + 手機橫向列共用
const ME_LINKS: { href: string; icon: React.ReactNode; label: string }[] = [
  { href: "/me", icon: <LayoutDashboard size={16} />, label: "學習總覽" },
  { href: "/me/dashboard", icon: <span>📊</span>, label: "學習儀表板" },
  { href: "/me/ledger", icon: <span>🪙</span>, label: "Z幣/經驗明細" },
  { href: "/me/notes", icon: <StickyNote size={16} />, label: "我的筆記" },
  { href: "/me/bookmarks", icon: <Bookmark size={16} />, label: "我的書籤" },
  { href: "/me/playgrounds", icon: <Code2 size={16} />, label: "我的程式碼" },
  { href: "/me/playground", icon: <Code2 size={16} />, label: "程式碼遊樂場" },
  { href: "/me/blog", icon: <PenLine size={16} />, label: "我的部落格" },
  { href: "/me/pet", icon: <Cat size={16} />, label: "我的寵物" },
  { href: "/me/history", icon: <History size={16} />, label: "學習紀錄" },
  { href: "/me/certificates", icon: <Award size={16} />, label: "證書" },
  { href: "/me/ai-plan", icon: <span>🧭</span>, label: "AI 學習規劃" },
  { href: "/me/ai-history", icon: <span>🤖</span>, label: "AI 對話紀錄" },
  { href: "/me/assistant", icon: <span>🤝</span>, label: "AI 助教" },
  { href: "/me/quiz", icon: <span>🧠</span>, label: "每日測驗" },
  { href: "/me/leetcode", icon: <span>💻</span>, label: "Leetcode 推薦" },
  { href: "/me/resources", icon: <span>🧭</span>, label: "外部資源" },
  { href: "/me/footprint", icon: <span>🛤️</span>, label: "學習足跡" },
  { href: "/me/challenge", icon: <span>🏆</span>, label: "週賽 Challenge" },
  { href: "/me/mentor", icon: <span>🤝</span>, label: "學員配對" },
  { href: "/me/api-keys", icon: <span>🔑</span>, label: "對外 API Key" },
  { href: "/me/assignments", icon: <span>📋</span>, label: "作業" },
  { href: "/me/portfolios", icon: <span>🎨</span>, label: "作品集" },
  { href: "/me/resume", icon: <span>🪪</span>, label: "AI 履歷" },
  { href: "/me/mock-interview", icon: <span>🎤</span>, label: "AI 模擬面試" },
  { href: "/me/support", icon: <span>💬</span>, label: "客服中心" },
  { href: "/me/referrals", icon: <span>🎁</span>, label: "邀請碼" },
];

const SECONDARY_LINKS: { href: string; label: string; emoji: string }[] = [
  { href: "/profile", label: "個人檔案", emoji: "👤" },
  { href: "/settings", label: "設定", emoji: "⚙️" },
  { href: "/me/email-prefs", label: "信件偏好", emoji: "✉️" },
];

export function MeSidebar({ profile }: { profile: Profile | null }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <>
      {/* 手機：橫向捲動快捷列（取代會擠壓內容、跑版的左側 icon 欄）。
          -mx-6 px-6 讓它貼齊容器左右邊；snap 讓滑動順手。 */}
      <div className="md:hidden -mx-6 px-6 mb-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max pb-1">
          {[...ME_LINKS, ...SECONDARY_LINKS.map((s) => ({ href: s.href, icon: <span>{s.emoji}</span>, label: s.label }))].map((l) => (
            <Link
              key={l.href}
              href={l.href as any}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs hover:text-accent hover:border-accent/50 transition"
            >
              {l.icon}
              <span>{l.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 桌面：左側欄 */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 ${
          collapsed ? "w-10" : "w-56"
        }`}
      >
        {/* Toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "展開側欄" : "收合側欄"}
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
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-black font-bold text-lg">
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
                <div className="text-fg-muted">連續天</div>
              </div>
            </div>
          </div>
        )}

        <nav className="space-y-0.5 text-sm">
          {ME_LINKS.map((l) => (
            <MeLink key={l.href} href={l.href} icon={l.icon} collapsed={collapsed}>
              {l.label}
            </MeLink>
          ))}
        </nav>

        <div className="mt-4 pt-4 border-t border-border space-y-0.5 text-sm">
          {SECONDARY_LINKS.map((s) => (
            <MeLink key={s.href} href={s.href} collapsed={collapsed}>
              {collapsed ? s.emoji : `${s.emoji} ${s.label}`}
            </MeLink>
          ))}
        </div>
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
        collapsed ? "justify-center p-2" : "px-3 py-2"
      }`}
    >
      {icon}
      {!collapsed && <span>{children}</span>}
    </Link>
  );
}
