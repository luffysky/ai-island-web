"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, MessageSquare, Backpack, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useOverlayCount } from "@/lib/overlay-stack";

const ITEMS = [
  { href: "/", label: "首頁", icon: Home },
  { href: "/chapters", label: "章節", icon: BookOpen },
  { href: "/forum", label: "討論", icon: MessageSquare },
  { href: "/me", label: "後台", icon: Backpack, auth: true },
  { href: "/settings", label: "我", icon: User, auth: true },
];

/**
 * 手機底部固定 nav（取代手機 TopNav 內隱藏的選項）
 * - 5 大入口、icon + label
 * - 當前 page 高亮
 * - 隱藏在 /island（全螢幕）+ admin / login / 任 modal 開時
 */
export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { user } = useAuth();
  const overlayCount = useOverlayCount();

  // 全螢幕 / admin / overlay 開時不顯示
  if (pathname.startsWith("/island")) return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/console-")) return null;
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return null;
  if (overlayCount > 0) return null;

  return (
    <nav
      className="md:hidden fixed left-0 right-0 bottom-0 z-30 bg-bg/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex justify-around items-center h-14">
        {ITEMS.map((it) => {
          if (it.auth && !user) return null;
          const Icon = it.icon;
          const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href as any}
              className={`flex flex-col items-center gap-0.5 flex-1 py-1 ${active ? "text-accent" : "text-fg-muted"}`}
            >
              <Icon size={18} />
              <span className="text-[10px]">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
