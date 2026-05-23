"use client";

import { useEffect, useRef, useState } from "react";
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
  GripVertical,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useOverlayCount } from "@/lib/overlay-stack";

const ADMIN_SLUG =
  process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";
const ADMIN_BASE = `/${ADMIN_SLUG}/admin`;

const POS_KEY = "admin-toolbar-pos";
const HIDDEN_KEY = "admin-toolbar-hidden";
const DRAG_THRESHOLD = 5;
const PILL_W = 110, PILL_H = 38;
const PANEL_W = 240, PANEL_H = 260;

type Pos = { x: number; y: number };

/**
 * 浮動 admin 工具列 — 只對 role=admin 使用者出現、預設 bottom-left。
 * 可拖移、位置記在 localStorage。
 */
export function AdminFloatingToolbar() {
  const { profile } = useAuth();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    elX: number;
    elY: number;
    moved: boolean;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 初始位置：localStorage 或預設 bottom-left（往上推 PANEL_H + 16 避免展開撞底）
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Pos;
        if (typeof p.x === "number" && typeof p.y === "number") {
          setPos(clampToViewport(p, PILL_W, PILL_H));
          return;
        }
      }
    } catch {}
    setPos({ x: 16, y: Math.max(16, window.innerHeight - PANEL_H - 24) });
  }, []);

  // 載入 hidden 記憶
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(HIDDEN_KEY) === "1") setHidden(true);
    } catch {}
  }, []);

  // window resize 時保持在可視範圍內
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clampToViewport(p, PILL_W, PILL_H) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const overlayCount = useOverlayCount();
  if (profile?.role !== "admin") return null;
  if (pathname.startsWith(`${ADMIN_BASE}`)) return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/island")) return null;
  if (hidden) return null;
  if (!pos) return null;
  if (overlayCount > 0) return null;

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
    { icon: <Shield size={14} />, label: "後台首頁", href: ADMIN_BASE },
    { icon: <ListChecks size={14} />, label: "Audit log", href: `${ADMIN_BASE}/audit` },
    { icon: <Eye size={14} />, label: "使用者列表", href: `${ADMIN_BASE}/users` },
  );

  // ── 拖移 ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (!rootRef.current) return;
    // 不要在 input/link/button 內觸發拖移（除非在 grip 區）
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-drag]")) return;
    e.preventDefault();
    rootRef.current.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      elX: pos.x,
      elY: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setDragging(true);
    // 拖移時也用 pill 尺寸 clamp
    setPos(clampToViewport({ x: d.elX + dx, y: d.elY + dy }, PILL_W, PILL_H));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (rootRef.current?.hasPointerCapture(e.pointerId)) {
      rootRef.current.releasePointerCapture(e.pointerId);
    }
    if (d.moved) {
      const finalPos = clampToViewport({
        x: d.elX + (e.clientX - d.startX),
        y: d.elY + (e.clientY - d.startY),
      }, PILL_W, PILL_H);
      setPos(finalPos);
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(finalPos));
      } catch {}
    } else {
      // 純點擊、開／關面板
      setOpen((v) => !v);
    }
    setDragging(false);
    dragRef.current = null;
  };

  // 展開面板位置：把 PANEL 朝視窗中心方向擺、避免超出視窗
  const panelStyle = (() => {
    if (typeof window === "undefined") return { left: pos.x, top: pos.y };
    const W = window.innerWidth, H = window.innerHeight;
    // 預設從 pos 開始往右下展、若會超出就翻轉成往上 / 左展
    let left = pos.x;
    let top = pos.y;
    if (left + PANEL_W > W - 8) left = Math.max(8, W - PANEL_W - 8);
    if (top + PANEL_H > H - 8) top = Math.max(8, H - PANEL_H - 8);
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    return { left, top };
  })();

  const hide = () => {
    setHidden(true);
    try { sessionStorage.setItem(HIDDEN_KEY, "1"); } catch {}
  };

  // pill 折疊狀態
  if (!open) {
    return (
      <div
        ref={rootRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
          setDragging(false);
        }}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 40,
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
        }}
      >
        <div className="group flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-500 text-white shadow-2xl shadow-pink-500/30 select-none">
          <Sparkles size={14} />
          <span className="text-xs font-bold">Admin</span>
          <ChevronUp size={12} />
        </div>
      </div>
    );
  }

  // 展開面板
  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        left: panelStyle.left,
        top: panelStyle.top,
        zIndex: 40,
        touchAction: "none",
        maxHeight: "calc(100vh - 16px)",
        overflowY: "auto",
      }}
      className="select-none"
    >
      <div className="bg-bg-card border-2 border-pink-500/40 rounded-2xl shadow-2xl shadow-pink-500/20 p-2 w-[240px]">
        {/* drag header */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
            setDragging(false);
          }}
          style={{ cursor: dragging ? "grabbing" : "grab" }}
          className="flex items-center justify-between px-2 py-1 mb-1 rounded hover:bg-pink-500/5"
        >
          <div className="flex items-center gap-1.5 text-pink-400">
            <GripVertical size={12} className="opacity-70" />
            <span className="text-[10px] font-bold tracking-wider uppercase">
              ✨ Admin 工具
            </span>
          </div>
          <div className="flex items-center gap-1" data-no-drag>
            <button
              onClick={() => setOpen(false)}
              className="text-fg-muted hover:text-fg p-0.5"
              aria-label="收起"
            >
              <X size={12} />
            </button>
            <button
              onClick={hide}
              className="text-fg-muted hover:text-fg text-[10px] px-1"
              title="本次瀏覽不再顯示（sessionStorage 記憶、關 tab 後重置）"
            >
              隱藏
            </button>
          </div>
        </div>
        <div className="space-y-0.5" data-no-drag>
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
        <div className="border-t border-border mt-1 pt-1 px-2">
          <p className="text-[9px] text-fg-muted leading-snug">
            路徑：<code>{pathname}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

function clampToViewport(p: Pos, w = PILL_W, h = PILL_H): Pos {
  if (typeof window === "undefined") return p;
  const pad = 8;
  return {
    x: Math.min(Math.max(pad, p.x), Math.max(pad, window.innerWidth - w - pad)),
    y: Math.min(Math.max(pad, p.y), Math.max(pad, window.innerHeight - h - pad)),
  };
}
