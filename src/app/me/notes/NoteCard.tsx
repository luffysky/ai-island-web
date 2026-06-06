"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight, Pencil, Trash2, Copy, Check, LogOut, Eye, Pin, Repeat2, SlidersHorizontal } from "lucide-react";
import { formatTW } from "@/lib/format-date";
import { sanitizeRichHtml } from "@/lib/rich-html";
import { resolveSticky, stickyRotate, clampOpacity, hexToRgba, noteBgImgStyle, type NoteBg } from "@/lib/note-sticky";
import { dueLabel } from "@/lib/note-srs";

// HTML → 純文字（保留換行）給「點一下複製」用
function htmlToPlain(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function NoteCard({
  note,
  meId,
  chapterTitle,
  lessonTitle,
  onEdit,
  onDelete,
  onPin,
  srsDue,
  onToggleReview,
}: {
  note: {
    id: string;
    user_id?: string;
    title?: string | null;
    chapter_id: number | null;
    lesson_id: string | null;
    content: string;
    is_public: boolean;
    likes: number;
    updated_at: string;
    category?: string | null;
    tags?: string[] | null;
    color?: string | null;
    opacity?: number | null;
    pinned?: boolean | null;
    bg?: NoteBg | null;
    _owned?: boolean;
    _shared?: boolean;
    _role?: string;
  };
  meId?: string;
  chapterTitle: string;
  lessonTitle: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  srsDue?: string | null;
  onToggleReview?: () => void;
}) {
  const owned = note._owned ?? (note.user_id === meId);
  const isViewer = !owned && note._role === "viewer";
  const [expanded, setExpanded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false); // footer 動作環形選單
  const [canHover, setCanHover] = useState(false);        // 桌機=hover 展開、手機=點擊
  const [ringOffset, setRingOffset] = useState({ x: 0, y: 0 }); // 圓環超出視口時往內移
  const radialRef = useRef<HTMLDivElement>(null);
  const RADIAL_R = 60;
  useEffect(() => {
    setCanHover(typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches);
  }, []);
  // 展開前量測中心、若整個圓環超出視口就算出往內位移（手機常見、桌機保險）
  const openRadial = () => {
    const el = radialRef.current;
    if (el && typeof window !== "undefined") {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const pad = RADIAL_R + 22; // 半徑 + 半個 item + 邊距
      const vw = window.innerWidth, vh = window.innerHeight;
      let dx = 0, dy = 0;
      if (cx - pad < 0) dx = pad - cx; else if (cx + pad > vw) dx = vw - (cx + pad);
      if (cy - pad < 0) dy = pad - cy; else if (cy + pad > vh) dy = vh - (cy + pad);
      setRingOffset({ x: dx, y: dy });
    } else setRingOffset({ x: 0, y: 0 });
    setActionsOpen(true);
  };
  const closeRadial = () => setActionsOpen(false);

  const header = note.chapter_id
    ? `Ch ${String(note.chapter_id).padStart(2, "0")} · ${chapterTitle}`
    : "自由筆記";

  const jumpHref =
    note.chapter_id && note.lesson_id
      ? (`/chapters/${note.chapter_id}#lesson-${note.lesson_id}` as const)
      : note.chapter_id
      ? (`/chapters/${note.chapter_id}` as const)
      : null;

  const sk = resolveSticky({ color: note.color, category: note.category, id: note.id });
  const opacity = clampOpacity(note.opacity);
  const rotate = stickyRotate(note.id);
  const bgImg = note.bg && note.bg.image ? note.bg : null;

  const MUTED = "#6b6b6b";
  const TEXT = "#2d2d2d";

  // 點卡片展開／收合；但若使用者正在選取文字（要複製）就別誤觸收合
  const toggleExpand = () => {
    if ((window.getSelection?.()?.toString() ?? "").length > 0) return;
    setExpanded((v) => !v);
  };

  // 複製：整則用右上角按鈕；想複製「某段」就直接選取文字（內容可自由選取）
  const [copied, setCopied] = useState(false);
  // 複製成功時在游標位置跳「✓ 已複製」懸浮氣泡（id 變動 → 每次重播動畫）
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [bubble, setBubble] = useState<{ x: number; y: number; id: number } | null>(null);
  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 1200);
    return () => clearTimeout(t);
  }, [bubble]);

  const writeClipboard = async (text: string, x: number, y: number) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setBubble({ x, y, id: Date.now() });
  };
  const copyAllText = (x: number, y: number) => {
    const text = /<[a-z][\s\S]*>/i.test(note.content) ? htmlToPlain(note.content) : note.content;
    writeClipboard(text, x, y);
  };
  const copyAll = (e: React.MouseEvent) => { e.stopPropagation(); copyAllText(e.clientX, e.clientY); };
  // 放開滑鼠時若選了一段文字 → 只複製那段（拖曳已改成只在右上角把手、不會打架）
  const copySelection = (e: React.MouseEvent) => {
    const sel = window.getSelection?.()?.toString() ?? "";
    if (sel.trim().length > 0) writeClipboard(sel, e.clientX, e.clientY);
  };
  // 點內容：沒選取 → 複製全部；有選取 → 交給 mouseup 複製那段
  const onContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ((window.getSelection?.()?.toString() ?? "").trim().length > 0) return;
    copyAllText(e.clientX, e.clientY);
  };

  return (
    <div
      onClick={toggleExpand}
      className="relative rounded-md shadow-md hover:shadow-xl hover:-translate-y-0.5 transition cursor-pointer"
      style={{ background: bgImg ? "transparent" : hexToRgba(sk.bg, opacity), color: TEXT, transform: `rotate(${rotate}deg)` }}
    >
      {/* 複製成功懸浮氣泡（portal 到 body，避開卡片 rotate / overflow） */}
      {mounted && bubble && createPortal(
        <div key={bubble.id} className="note-copied-bubble" style={{ left: bubble.x, top: bubble.y - 14 }}>
          ✓ 已複製
        </div>,
        document.body,
      )}

      {/* 膠帶 */}
      <div
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 rounded-[2px] z-20"
        style={{ background: sk.tape, opacity: 0.6 * opacity, boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }}
      />
      {note.pinned && (
        <div className="absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full flex items-center justify-center shadow" style={{ background: "#fbbf24", color: "#7c2d12" }} title="已置頂">
          <Pin size={12} className="fill-current" />
        </div>
      )}

      {/* 每則自訂背景圖：圖在底層、上面蓋一層便利貼色（用透明度控制圖露多少） */}
      {bgImg && (
        <div className="absolute inset-0 rounded-md overflow-hidden" style={{ zIndex: 0 }}>
          <img
            src={bgImg.image}
            alt=""
            className="absolute left-1/2 top-1/2 w-[140%] h-[140%] max-w-none object-cover"
            style={noteBgImgStyle(bgImg)}
            draggable={false}
          />
          {/* 便利貼色當薄薄一層 scrim（圖也看得到、深字也讀得清）；透明度越低圖越明顯 */}
          <div className="absolute inset-0" style={{ background: hexToRgba(sk.bg, Math.max(0.12, opacity * 0.55)) }} />
        </div>
      )}

      <div className="relative z-10 p-4 pt-6">
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs mb-1" style={{ color: MUTED }}>{header}</div>
          <div className="font-bold truncate">{note.title?.trim() || lessonTitle}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {note._shared && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: owned ? "rgba(37,99,235,0.16)" : "rgba(168,85,247,0.18)", color: "#222" }}>
              🤝 {owned ? "共用中" : isViewer ? "共用·唯讀" : "共用"}
            </span>
          )}
          {note.is_public && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.1)", color: "#333" }}>
              公開
            </span>
          )}
        </div>
      </div>

      {/* 點一下複製全部；選取一段只複製那段（拖曳改在右上把手、不打架）。收合時最多 5 行 */}
      <div className="relative">
        <div
          onClick={onContentClick}
          onMouseUp={copySelection}
          className="cursor-copy select-text rounded-md -mx-1 px-1 hover:bg-black/[0.04] transition overflow-hidden"
          style={{ WebkitUserSelect: "text", userSelect: "text", maxHeight: expanded ? undefined : "7.8em" }}
          title="點一下複製整則；或選取一段只複製那段"
        >
          {/<[a-z][\s\S]*>/i.test(note.content) ? (
            <div
              className="note-rich prose-custom text-sm max-w-none"
              style={{ color: TEXT }}
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(note.content) }}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap" style={{ color: TEXT }}>
              {note.content}
            </p>
          )}
        </div>
        {!expanded && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 rounded-b-md"
            style={{ background: `linear-gradient(to bottom, transparent, ${hexToRgba(sk.bg, opacity)})` }}
          />
        )}
      </div>

      {(note.category || (note.tags && note.tags.length > 0)) && (
        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          {note.category && (
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.12)", color: "#333" }}>📁 {note.category}</span>
          )}
          {(note.tags ?? []).map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.07)", color: "#555" }}>#{t}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="text-xs" style={{ color: MUTED }}>
          {formatTW(note.updated_at)}
          {note.likes > 0 && <span className="ml-2">👍 {note.likes}</span>}
        </div>
        {(() => {
          // 環形（扇形）動作選單：中間旋鈕、展開時項目沿弧線環繞飛出（手機 / 桌機 / PWA 通用）
          type RItem = { key: string; icon: React.ReactNode; title: string; onClick?: (e: React.MouseEvent) => void; href?: string; bg?: string; color?: string };
          const items: RItem[] = [];
          if (onToggleReview) items.push({ key: "review", icon: <Repeat2 size={14} className={srsDue ? "fill-current" : ""} />, title: srsDue ? `複習・${dueLabel(srsDue)}` : "加入間隔複習", onClick: onToggleReview, color: srsDue ? "#7c3aed" : "#444" });
          if (onPin) items.push({ key: "pin", icon: <Pin size={14} className={note.pinned ? "fill-current" : ""} />, title: note.pinned ? "取消置頂" : "置頂", onClick: onPin, color: note.pinned ? "#b45309" : "#444" });
          items.push({ key: "copy", icon: copied ? <Check size={14} /> : <Copy size={14} />, title: "複製整則", onClick: copyAll, color: copied ? "#15803d" : "#444" });
          if (onEdit) items.push({ key: "edit", icon: isViewer ? <Eye size={14} /> : <Pencil size={14} />, title: isViewer ? "查看" : "編輯", onClick: onEdit, color: "#444" });
          if (onDelete) items.push({ key: "del", icon: owned ? <Trash2 size={14} /> : <LogOut size={14} />, title: owned ? "刪除" : "退出共用", onClick: onDelete, color: "#dc2626" });
          items.push({ key: "expand", icon: expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />, title: expanded ? "收合" : "展開", onClick: () => setExpanded(!expanded), color: "#444" });
          if (jumpHref) items.push({ key: "jump", icon: <ArrowRight size={14} />, title: "跳到該課", href: jumpHref, bg: "#1a1a1a", color: "#fff" });

          const N = items.length;
          const R = RADIAL_R;
          // 整個圓：360/N 動態等分（之後加新功能自動均分、不寫死）；從正上方順時針排
          const angleOf = (i: number) => -90 + i * (360 / N);
          const cls = "absolute left-1/2 top-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-md ring-1 ring-black/5 will-change-transform";
          const close = closeRadial;

          return (
            <div
              ref={radialRef}
              className="relative shrink-0 w-9 h-9"
              onMouseEnter={() => { if (canHover) openRadial(); }}
              onMouseLeave={() => { if (canHover) closeRadial(); }}
            >
              {/* 手機：點外面收合（桌機靠 hover 離開收合、不需要遮罩）*/}
              {actionsOpen && !canHover && (
                <div onClick={(e) => { e.stopPropagation(); closeRadial(); }} aria-hidden style={{ position: "absolute", inset: "-280px", zIndex: 4 }} />
              )}
              {items.map((it, i) => {
                const rad = (angleOf(i) * Math.PI) / 180;
                const x = Math.cos(rad) * R + ringOffset.x;
                const y = Math.sin(rad) * R + ringOffset.y;
                const delay = actionsOpen ? i * 40 : (N - 1 - i) * 22; // 環繞：依序彈出 / 收回
                const style: React.CSSProperties = {
                  transform: actionsOpen
                    ? `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(1)`
                    : "translate(-50%, -50%) scale(0.2)",
                  opacity: actionsOpen ? 1 : 0,
                  // springy 過場（overshoot 有「彈出/環繞」感）+ staggered delay
                  transition: `transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 220ms ease ${delay}ms`,
                  pointerEvents: actionsOpen ? "auto" : "none",
                  background: it.bg ?? "rgba(255,255,255,0.95)",
                  color: it.color ?? "#444",
                  zIndex: 10,
                };
                return it.href ? (
                  <Link key={it.key} href={it.href as any} title={it.title} aria-label={it.title} className={cls} style={style}
                    onClick={(e) => { e.stopPropagation(); close(); }}>
                    {it.icon}
                  </Link>
                ) : (
                  <button key={it.key} type="button" title={it.title} aria-label={it.title} className={cls} style={style}
                    onClick={(e) => { e.stopPropagation(); it.onClick?.(e); close(); }}>
                    {it.icon}
                  </button>
                );
              })}
              {/* 中間旋鈕：展開旋轉 135°、變深色 */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); actionsOpen ? closeRadial() : openRadial(); }}
                className="absolute left-1/2 top-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-md ring-1 ring-black/10 transition-transform duration-300"
                style={{
                  background: actionsOpen ? "#1a1a1a" : "rgba(255,255,255,0.95)",
                  color: actionsOpen ? "#fff" : "#444",
                  transform: `translate(-50%, -50%) rotate(${actionsOpen ? 135 : 0}deg)`,
                }}
                title={actionsOpen ? "收合" : "更多動作"}
                aria-label="更多動作"
                aria-expanded={actionsOpen}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
          );
        })()}
      </div>
      </div>
    </div>
  );
}
