"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const STORAGE_KEY = "admin-nav-groups";

function readState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function writeState(s: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

/** 預設展開狀態 — 沒讀過 localStorage 時用、給林董一個不會炸眼的初值 */
const DEFAULT_EXPANDED: Record<string, boolean> = {
  "🏝️ 總覽 (Overview)": true,
  "👥 用戶 & CRM": true,
  "📚 內容 (Content)": false,
  "📣 行銷 (Marketing)": false,
  "💰 商務 (ERP)": false,
  "💬 通訊 (LINE / Email)": false,
  "🤖 AI 管理": false,
  "📈 SEO & 流量": false,
  "🛡️ 風控 & 審核": false,
  "🌊 Nami 工具": false,
  "🔐 系統設定": false,
};

export function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  // 首次掛載讀 localStorage、避免 SSR mismatch
  useEffect(() => {
    setMounted(true);
    const stored = readState();
    if (stored.hasOwnProperty(title)) setExpanded(stored[title]);
    else setExpanded(DEFAULT_EXPANDED[title] ?? false);
  }, [title]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    const stored = readState();
    stored[title] = next;
    writeState(stored);
  };

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-1 px-3 py-1 text-xs text-fg-muted uppercase tracking-wider hover:text-fg transition group"
      >
        {mounted && (
          <span className="opacity-70 group-hover:opacity-100">
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
        )}
        {!mounted && <span style={{ width: 11 }} />}
        <span className="flex-1 text-left">{title}</span>
      </button>
      <div
        className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
          expanded ? "max-h-[1000px] opacity-100 mt-1" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
