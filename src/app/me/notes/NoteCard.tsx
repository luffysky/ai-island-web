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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null); // hover 哪個項目（顯示氣泡 + 不收）
  const [canHover, setCanHover] = useState(false);        // 桌機=hover 展開、手機=點擊
  const [ringOffset, setRingOffset] = useState({ x: 0, y: 0 }); // 圓環超出視口時往內移
  const radialRef = useRef<HTMLDivElement>(null);
  const startAngleRef = useRef(-90);          // 撲克牌起始角（每次展開隨機）
  const closeTimerRef = useRef<any>(null);    // hover 展開後自動收合計時
  const RADIAL_R = 60;
  const HOVER_HOLD_MS = 3200;                 // hover 展開後定格幾秒、期間沒互動才收
  useEffect(() => {
    setCanHover(typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches);
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);
  const armCloseTimer = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setActionsOpen(false), HOVER_HOLD_MS);
  };
  // 展開前：隨機起點 + 量測中心、整圈若超出視口就算出往內位移
  const openRadial = () => {
    startAngleRef.current = Math.round(Math.random() * 360);
    const el = radialRef.current;
    if (el && typeof window !== "undefined") {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const pad = RADIAL_R + 22;
      const vw = window.innerWidth, vh = window.innerHeight;
      let dx = 0, dy = 0;
      if (cx - pad < 0) dx = pad - cx; else if (cx + pad > vw) dx = vw - (cx + pad);
      if (cy - pad < 0) dy = pad - cy; else if (cy + pad > vh) dy = vh - (cy + pad);
      setRingOffset({ x: dx, y: dy });
    } else setRingOffset({ x: 0, y: 0 });
    setActionsOpen(true);
    if (canHover) armCloseTimer();  // 桌機 hover：定格幾秒、互動會續命
  };
  const closeRadial = () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); setActionsOpen(false); };

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
      style={{ background: bgImg ? "transparent" : hexToRgba(sk.bg, opacity), color: TEXT, transform: `rotate(${rotate}deg)`, zIndex: actionsOpen ? 50 : undefined }}
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
          const startA = startAngleRef.current;            // 隨機起點（疊牌處）
          const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
          // hover 到項目/旋鈕：暫停 3.2s 收合計時（不會選一半被收）；離開才重新倒數
          const pauseClose = (key?: string) => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); if (key) setHoveredItem(key); };
          const resumeClose = () => { if (canHover && actionsOpen) armCloseTimer(); setHoveredItem(null); };
          // 液態玻璃氣泡：半透明 + 背景模糊 + saturate + 內緣高光
          const tipCls = "absolute left-1/2 bottom-full mb-2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[10px] font-medium leading-tight whitespace-nowrap pointer-events-none z-[60] text-white";
          const tipStyle: React.CSSProperties = {
            background: "rgba(17,18,22,0.36)",
            backdropFilter: "blur(8px) saturate(170%)",
            WebkitBackdropFilter: "blur(8px) saturate(170%)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 6px 22px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.30)",
            textShadow: "0 1px 2px rgba(0,0,0,0.45)",
          };

          return (
            <div
              ref={radialRef}
              className="relative shrink-0 w-9 h-9"
              onMouseEnter={() => { if (canHover && !actionsOpen) openRadial(); }}
            >
              {/* 手機：點外面收合（桌機用定格計時、不需要遮罩）*/}
              {actionsOpen && !canHover && (
                <div onClick={(e) => { e.stopPropagation(); closeRadial(); }} aria-hidden style={{ position: "absolute", inset: "-300px", zIndex: 4 }} />
              )}
              {/* 環形項目：spoke 旋轉帶圖示「沿圓弧順時針掃出」；整圈受 ringOffset 內移、旋鈕本身不動 */}
              <div style={{ position: "absolute", inset: 0, zIndex: 10, transform: `translate(${ringOffset.x}px, ${ringOffset.y}px)`, transition: "transform 300ms ease" }}>
                {items.map((it, i) => {
                  const target = -90 + i * (360 / N);                              // 最終角（360/N 等分）
                  const finalA = startA + ((((target - startA) % 360) + 360) % 360); // 一律順時針掃出
                  const angle = actionsOpen ? finalA : startA;
                  const r = actionsOpen ? R : 0;                                   // 收起＝疊在中心（撲克牌一疊）
                  const delay = actionsOpen ? i * 46 : (N - 1 - i) * 24;
                  const spokeStyle: React.CSSProperties = {
                    position: "absolute", left: "50%", top: "50%", width: 0, height: 0,
                    transformOrigin: "0 0",
                    transform: `rotate(${angle}deg) translateX(${r}px)`,
                    transition: `transform 600ms ${ease} ${delay}ms`,
                  };
                  const btnStyle: React.CSSProperties = {
                    transform: `translate(-50%, -50%) rotate(${-angle}deg)`,      // 置中於端點 + 反轉保持圖示正立
                    transition: `transform 600ms ${ease} ${delay}ms, opacity 260ms ease ${delay}ms`,
                    opacity: actionsOpen ? 1 : 0,
                    pointerEvents: actionsOpen ? "auto" : "none",
                    background: it.bg ?? "rgba(255,255,255,0.95)",
                    color: it.color ?? "#444",
                  };
                  const btnCls = "absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ring-1 ring-black/5 will-change-transform";
                  return (
                    <div key={it.key} style={spokeStyle}>
                      {it.href ? (
                        <Link href={it.href as any} aria-label={it.title} className={btnCls} style={btnStyle}
                          onMouseEnter={() => pauseClose(it.key)} onMouseLeave={resumeClose}
                          onClick={(e) => { e.stopPropagation(); closeRadial(); }}>
                          {it.icon}
                          {hoveredItem === it.key && <span className={tipCls} style={tipStyle}>{it.title}</span>}
                        </Link>
                      ) : (
                        <button type="button" aria-label={it.title} className={btnCls} style={btnStyle}
                          onMouseEnter={() => pauseClose(it.key)} onMouseLeave={resumeClose}
                          onClick={(e) => { e.stopPropagation(); it.onClick?.(e); closeRadial(); }}>
                          {it.icon}
                          {hoveredItem === it.key && <span className={tipCls} style={tipStyle}>{it.title}</span>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* 旋鈕的液態玻璃氣泡（收合 / 更多動作）— 放在旋鈕外層、不受 135° 旋轉影響 */}
              {hoveredItem === "__dial__" && (
                <span className={tipCls} style={{ ...tipStyle, zIndex: 30 }}>{actionsOpen ? "收合" : "更多動作"}</span>
              )}
              {/* 中間旋鈕：展開旋轉 135°、變深色 */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); actionsOpen ? closeRadial() : openRadial(); }}
                onMouseEnter={() => pauseClose("__dial__")}
                onMouseLeave={resumeClose}
                className="absolute left-1/2 top-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-md ring-1 ring-black/10 transition-transform duration-300"
                style={{
                  background: actionsOpen ? "#1a1a1a" : "rgba(255,255,255,0.95)",
                  color: actionsOpen ? "#fff" : "#444",
                  transform: `translate(-50%, -50%) rotate(${actionsOpen ? 135 : 0}deg)`,
                }}
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
