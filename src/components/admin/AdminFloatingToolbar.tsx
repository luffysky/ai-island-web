"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Edit3,
  Eye,
  ListChecks,
  Sparkles,
  ChevronUp,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const ADMIN_SLUG =
  process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";
const ADMIN_BASE = `/${ADMIN_SLUG}/admin`;

/**
 * 浮動 admin 工具列 — 只對 role=admin 使用者出現、bottom-left。
 *
 * 根據目前路徑、context-aware 顯示動作：
 *   - /chapters/<id>      → 「編輯章節」「查看章節 audit」
 *   - /blogs/<u>/<a>      → 「文章後台」「Audit」
 *   - /forum/thread/<id>  → 「moderation」
 *   - 其他                 → 通用「進後台」「Audit log」「使用者列表」
 *
 * 不在 /admin 內顯示（避免重複）。
 */
export function AdminFloatingToolbar() {
  const { profile } = useAuth();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (profile?.role !== "admin") return null;
  if (pathname.startsWith(`${ADMIN_BASE}`)) return null;
  if (pathname.startsWith("/admin")) return null;
  if (hidden) return null;

  const chapterMatch = pathname.match(/^\/chapters\/(\d+)/);
  const blogMatch = pathname.match(/^\/blogs\/([^/]+)\/([^/]+)/);
  const forumMatch = pathname.match(/^\/forum\/thread\/(\d+)/);

  const actions: { icon: React.ReactNode; label: string; href: string }[] = [];

  if (chapterMatch) {
    actions.push({
      icon: <Edit3 size={14} />,
      label: `編輯 Ch${chapterMatch[1]}`,
      href: `${ADMIN_BASE}/chapters`,
    });
  } else if (blogMatch) {
    actions.push({
      icon: <Edit3 size={14} />,
      label: `審核這篇`,
      href: `${ADMIN_BASE}/audit?action=blog`,
    });
  } else if (forumMatch) {
    actions.push({
      icon: <Edit3 size={14} />,
      label: "討論區後台",
      href: `${ADMIN_BASE}/audit?action=forum`,
    });
  }

  actions.push(
    {
      icon: <Shield size={14} />,
      label: "後台首頁",
      href: ADMIN_BASE,
    },
    {
      icon: <ListChecks size={14} />,
      label: "Audit log",
      href: `${ADMIN_BASE}/audit`,
    },
    {
      icon: <Eye size={14} />,
      label: "使用者列表",
      href: `${ADMIN_BASE}/users`,
    },
  );

  return (
    <div className="fixed bottom-6 left-6 z-40">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="group flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-500 text-white shadow-2xl shadow-pink-500/30 hover:scale-105 transition"
          aria-label="開啟 admin 工具列"
        >
          <Sparkles size={14} />
          <span className="text-xs font-bold">Admin</span>
          <ChevronUp size={12} />
        </button>
      ) : (
        <div className="bg-[var(--color-bg-card)] border-2 border-pink-500/40 rounded-2xl shadow-2xl shadow-pink-500/20 p-2 min-w-[200px]">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-[10px] text-pink-400 font-bold tracking-wider uppercase">
              ✨ Admin 工具
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] p-0.5"
                aria-label="收起"
              >
                <X size={12} />
              </button>
              <button
                onClick={() => setHidden(true)}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] text-[10px] px-1"
                title="本次瀏覽不再顯示"
              >
                隱藏
              </button>
            </div>
          </div>
          <div className="space-y-0.5">
            {actions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href as any}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-pink-500/10 text-sm transition"
              >
                {a.icon}
                <span>{a.label}</span>
              </Link>
            ))}
          </div>
          <div className="border-t border-[var(--color-border)] mt-1 pt-1 px-2">
            <p className="text-[9px] text-[var(--color-fg-muted)] leading-snug">
              路徑：<code>{pathname}</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
