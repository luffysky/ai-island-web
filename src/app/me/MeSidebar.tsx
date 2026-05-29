"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <aside
      className={`shrink-0 transition-all duration-200 ${
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
                Lv {profile?.level ?? 1} · {profile?.xp ?? 0} XP
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-bg rounded p-2">
              <div className="text-yellow-400 font-bold">
                🪙 {profile?.z_coin ?? 0}
              </div>
              <div className="text-fg-muted">Z-coin</div>
            </div>
            <div className="bg-bg rounded p-2">
              <div className="text-orange-400 font-bold">
                🔥 {profile?.streak_days ?? 0}
              </div>
              <div className="text-fg-muted">連續天</div>
            </div>
          </div>
        </div>
      )}

      <nav className="space-y-0.5 text-sm">
        <MeLink
          href="/me"
          icon={<LayoutDashboard size={16} />}
          collapsed={collapsed}
        >
          學習總覽
        </MeLink>
        <MeLink
          href="/me/notes"
          icon={<StickyNote size={16} />}
          collapsed={collapsed}
        >
          我的筆記
        </MeLink>
        <MeLink
          href="/me/bookmarks"
          icon={<Bookmark size={16} />}
          collapsed={collapsed}
        >
          我的書籤
        </MeLink>
        <MeLink
          href="/me/playgrounds"
          icon={<Code2 size={16} />}
          collapsed={collapsed}
        >
          我的程式碼
        </MeLink>
        <MeLink
          href="/me/blog"
          icon={<PenLine size={16} />}
          collapsed={collapsed}
        >
          我的部落格
        </MeLink>
        <MeLink
          href="/me/pet"
          icon={<Cat size={16} />}
          collapsed={collapsed}
        >
          我的寵物
        </MeLink>
        <MeLink
          href="/me/history"
          icon={<History size={16} />}
          collapsed={collapsed}
        >
          學習紀錄
        </MeLink>
        <MeLink
          href="/me/certificates"
          icon={<Award size={16} />}
          collapsed={collapsed}
        >
          證書
        </MeLink>
        <MeLink
          href="/me/ai-plan"
          icon={<span>🧭</span>}
          collapsed={collapsed}
        >
          AI 學習規劃
        </MeLink>
        <MeLink
          href="/me/ai-history"
          icon={<span>🤖</span>}
          collapsed={collapsed}
        >
          AI 對話紀錄
        </MeLink>
        <MeLink
          href="/me/assistant"
          icon={<span>🤝</span>}
          collapsed={collapsed}
        >
          AI 助教
        </MeLink>
        <MeLink
          href="/me/quiz"
          icon={<span>🧠</span>}
          collapsed={collapsed}
        >
          每日測驗
        </MeLink>
        <MeLink
          href="/me/leetcode"
          icon={<span>💻</span>}
          collapsed={collapsed}
        >
          Leetcode 推薦
        </MeLink>
        <MeLink
          href="/me/resources"
          icon={<span>🧭</span>}
          collapsed={collapsed}
        >
          外部資源
        </MeLink>
        <MeLink
          href="/me/footprint"
          icon={<span>🛤️</span>}
          collapsed={collapsed}
        >
          學習足跡
        </MeLink>
        <MeLink
          href="/me/assignments"
          icon={<span>📋</span>}
          collapsed={collapsed}
        >
          作業
        </MeLink>
        <MeLink
          href="/me/portfolios"
          icon={<span>🎨</span>}
          collapsed={collapsed}
        >
          作品集
        </MeLink>
        <MeLink
          href="/me/resume"
          icon={<span>🪪</span>}
          collapsed={collapsed}
        >
          AI 履歷
        </MeLink>
        <MeLink
          href="/me/mock-interview"
          icon={<span>🎤</span>}
          collapsed={collapsed}
        >
          AI 模擬面試
        </MeLink>
        <MeLink
          href="/me/support"
          icon={<span>💬</span>}
          collapsed={collapsed}
        >
          客服中心
        </MeLink>
        <MeLink
          href="/me/referrals"
          icon={<span>🎁</span>}
          collapsed={collapsed}
        >
          邀請碼
        </MeLink>
      </nav>

      <div className="mt-4 pt-4 border-t border-border space-y-0.5 text-sm">
        <MeLink href="/profile" collapsed={collapsed}>
          {collapsed ? "👤" : "👤 個人檔案"}
        </MeLink>
        <MeLink href="/settings" collapsed={collapsed}>
          {collapsed ? "⚙️" : "⚙️ 設定"}
        </MeLink>
        <MeLink href="/me/email-prefs" collapsed={collapsed}>
          {collapsed ? "✉️" : "✉️ 信件偏好"}
        </MeLink>
      </div>
    </aside>
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
