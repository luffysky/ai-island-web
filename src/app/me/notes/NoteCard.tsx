"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { formatTW } from "@/lib/format-date";
import { sanitizeRichHtml } from "@/lib/rich-html";

// 便利貼配色（粉 / 黃 / 綠 / 藍 / 紫 / 橘）——淺底深字
const STICKY = [
  { bg: "#ffd9e8", tape: "#ff9ec4" }, // 粉
  { bg: "#fff3c4", tape: "#ffd84d" }, // 黃
  { bg: "#d2efd2", tape: "#86d586" }, // 綠
  { bg: "#cfe6ff", tape: "#85bdff" }, // 藍
  { bg: "#e9d9ff", tape: "#bd93f9" }, // 紫
  { bg: "#ffe2c4", tape: "#ffb673" }, // 橘
];
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
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

  const h = hashStr(note.category || note.id);
  const sk = STICKY[h % STICKY.length];
  const rotate = ((h % 3) - 1) * 0.7; // -0.7 / 0 / 0.7 deg

  const MUTED = "#6b6b6b";
  const TEXT = "#2d2d2d";

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="relative rounded-md p-4 pt-6 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition cursor-pointer"
      style={{ background: sk.bg, color: TEXT, transform: `rotate(${rotate}deg)` }}
    >
      {/* 膠帶 */}
      <div
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 rounded-[2px]"
        style={{ background: sk.tape, opacity: 0.6, boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }}
      />

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

      {/<[a-z][\s\S]*>/i.test(note.content) ? (
        <div
          className={`text-sm max-w-none ${expanded ? "" : "line-clamp-4"}`}
          style={{ color: TEXT }}
          dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(note.content) }}
        />
      ) : (
        <p className={`text-sm whitespace-pre-wrap ${expanded ? "" : "line-clamp-4"}`} style={{ color: TEXT }}>
          {note.content}
        </p>
      )}

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
  );
}
