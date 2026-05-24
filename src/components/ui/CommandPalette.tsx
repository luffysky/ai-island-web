"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Hash, BookOpen, Code2, Trophy, MessageSquare, PenLine, Users,
  Settings, Home, Backpack, Cat, Sparkles, MapIcon, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type CmdItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  keywords?: string[];
  group: string;
};

/**
 * Ctrl+K / Cmd+K 全站命令面板
 * - 搜尋章節 / 跳頁 / 執行命令
 * - 快速鍵 cheat sheet
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();
  const [islandEnabled, setIslandEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/public/flags").then((r) => r.json()).then((d) => {
      setIslandEnabled(!!d.islandEnabled);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setActiveIdx(0); }
  }, [open]);

  const items: CmdItem[] = useMemo(() => {
    const list: CmdItem[] = [
      // 導覽
      { id: "home", label: "首頁", icon: <Home size={14} />, href: "/", group: "導覽" },
      { id: "chapters", label: "章節", icon: <BookOpen size={14} />, href: "/chapters", group: "導覽", keywords: ["lesson", "課"] },
      ...(islandEnabled || profile?.role === "admin"
        ? [{ id: "island", label: "AI 島嶼（3D）", icon: <MapIcon size={14} />, href: "/island", group: "導覽" } as CmdItem]
        : []),
      { id: "courses", label: "副本", icon: <Sparkles size={14} />, href: "/courses", group: "導覽" },
      { id: "forum", label: "討論區", icon: <MessageSquare size={14} />, href: "/forum", group: "導覽" },
      { id: "blogs", label: "部落格", icon: <PenLine size={14} />, href: "/blogs", group: "導覽" },
      { id: "leaderboard", label: "排行榜", icon: <Trophy size={14} />, href: "/leaderboard", group: "導覽" },
    ];
    if (user) {
      list.push(
        { id: "me", label: "我的學習後台", icon: <Backpack size={14} />, href: "/me", group: "我的" },
        { id: "me-quiz", label: "每日測驗", icon: <Hash size={14} />, href: "/me/quiz", group: "我的", keywords: ["quiz"] },
        { id: "me-leetcode", label: "Leetcode 推薦", icon: <Code2 size={14} />, href: "/me/leetcode", group: "我的" },
        { id: "me-assistant", label: "AI 助教", icon: <Users size={14} />, href: "/me/assistant", group: "我的" },
        { id: "me-pet", label: "我的寵物", icon: <Cat size={14} />, href: "/me/pet", group: "我的" },
        { id: "me-notes", label: "我的筆記", icon: <PenLine size={14} />, href: "/me/notes", group: "我的" },
        { id: "settings", label: "設定", icon: <Settings size={14} />, href: "/settings", group: "我的" },
      );
    }
    // 70 個章節 deep link
    for (let i = 1; i <= 70; i++) {
      list.push({
        id: `ch${i}`,
        label: `Ch ${String(i).padStart(2, "0")}`,
        icon: <Hash size={14} className="text-fg-muted" />,
        href: `/chapters/${i}`,
        group: "章節",
        keywords: [`chapter${i}`, `章節${i}`],
      });
    }
    if (profile?.role === "admin") {
      list.push(
        { id: "admin", label: "後台首頁", icon: <Settings size={14} />, href: "/console-x7k2/admin", group: "管理" },
        { id: "admin-kpi", label: "KPI 報表", icon: <Trophy size={14} />, href: "/console-x7k2/admin/kpi", group: "管理" },
        { id: "admin-users", label: "使用者", icon: <Users size={14} />, href: "/console-x7k2/admin/users", group: "管理" },
      );
    }
    return list;
  }, [user, profile?.role, islandEnabled]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 30);
    const q = query.toLowerCase();
    return items.filter((it) =>
      it.label.toLowerCase().includes(q) ||
      it.group.toLowerCase().includes(q) ||
      it.keywords?.some((k) => k.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [query, items]);

  // 分組
  const grouped = useMemo(() => {
    const g: Record<string, CmdItem[]> = {};
    for (const it of filtered) (g[it.group] ??= []).push(it);
    return g;
  }, [filtered]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const trigger = (it: CmdItem) => {
    setOpen(false);
    if (it.href) router.push(it.href as any);
    it.action?.();
  };

  if (!open) return null;

  const flat = filtered;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Search size={16} className="text-fg-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(flat.length - 1, i + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); const it = flat[activeIdx]; if (it) trigger(it); }
            }}
            placeholder="搜尋頁面 / 章節 / 命令..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-fg-muted font-mono">ESC</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {flat.length === 0 ? (
            <div className="text-center py-8 text-fg-muted text-sm">沒結果</div>
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="mb-2">
                <div className="px-4 py-1 text-[10px] text-fg-muted uppercase tracking-wider font-bold">{group}</div>
                {list.map((it) => {
                  const idx = flat.indexOf(it);
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={it.id}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => trigger(it)}
                      className={`w-full text-left px-4 py-2 flex items-center gap-2 text-sm ${active ? "bg-accent/10 text-accent" : "hover:bg-bg-elevated"}`}
                    >
                      {it.icon}
                      <span className="flex-1">{it.label}</span>
                      {active && <ArrowRight size={12} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-fg-muted flex items-center gap-3">
          <span>↑↓ 選擇</span>
          <span>↵ 開啟</span>
          <span>ESC 關閉</span>
          <span className="ml-auto"><kbd className="px-1 bg-bg-elevated rounded font-mono">⌘K</kbd> 任處召喚</span>
        </div>
      </div>
    </div>
  );
}
