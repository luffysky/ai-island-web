"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight, Pencil, Trash2, Copy, Check } from "lucide-react";
import { formatTW } from "@/lib/format-date";
import { sanitizeRichHtml } from "@/lib/rich-html";
import { resolveSticky, stickyRotate, clampOpacity, hexToRgba, noteBgImgStyle, type NoteBg } from "@/lib/note-sticky";

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
  chapterTitle,
  lessonTitle,
  onEdit,
  onDelete,
}: {
  note: {
    id: string;
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
    bg?: NoteBg | null;
  };
  chapterTitle: string;
  lessonTitle: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

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
  const writeClipboard = async (text: string) => {
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
  };
  const copyAllText = () => {
    const text = /<[a-z][\s\S]*>/i.test(note.content) ? htmlToPlain(note.content) : note.content;
    writeClipboard(text);
  };
  const copyAll = (e: React.MouseEvent) => { e.stopPropagation(); copyAllText(); };
  // 放開滑鼠時若選了一段文字 → 只複製那段（拖曳已改成只在右上角把手、不會打架）
  const copySelection = () => {
    const sel = window.getSelection?.()?.toString() ?? "";
    if (sel.trim().length > 0) writeClipboard(sel);
  };
  // 點內容：沒選取 → 複製全部；有選取 → 交給 mouseup 複製那段
  const onContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ((window.getSelection?.()?.toString() ?? "").trim().length > 0) return;
    copyAllText();
  };

  return (
    <div
      onClick={toggleExpand}
      className="relative rounded-md shadow-md hover:shadow-xl hover:-translate-y-0.5 transition cursor-pointer"
      style={{ background: bgImg ? "transparent" : hexToRgba(sk.bg, opacity), color: TEXT, transform: `rotate(${rotate}deg)` }}
    >
      {/* 膠帶 */}
      <div
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 rounded-[2px] z-20"
        style={{ background: sk.tape, opacity: 0.6 * opacity, boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }}
      />

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
          <div className="font-bold truncate">{lessonTitle}</div>
        </div>
        {note.is_public && (
          <span className="text-xs px-2 py-0.5 rounded shrink-0" style={{ background: "rgba(0,0,0,0.1)", color: "#333" }}>
            公開
          </span>
        )}
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyAll}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition hover:bg-black/10"
            style={{ color: copied ? "#15803d" : "#444" }}
            title="複製整則筆記"
          >
            {copied ? <><Check size={12} /> 已複製</> : <><Copy size={12} /> 複製</>}
          </button>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition hover:bg-black/10"
              style={{ color: "#444" }}
              title="編輯"
            >
              <Pencil size={12} /> 編輯
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="inline-flex items-center text-xs px-2 py-1 rounded transition hover:bg-red-500/15 hover:text-red-600"
              style={{ color: "#444" }}
              title="刪除"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition hover:bg-black/10"
            style={{ color: "#444" }}
          >
            {expanded ? <><ChevronUp size={12} /> 收合</> : <><ChevronDown size={12} /> 展開</>}
          </button>
          {jumpHref && (
            <Link
              href={jumpHref as any}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded font-semibold transition hover:scale-105"
              style={{ background: "#1a1a1a", color: "#fff" }}
            >
              跳到該課 <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
