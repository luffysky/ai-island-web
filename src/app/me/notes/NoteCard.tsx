"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { formatTW } from "@/lib/format-date";

export function NoteCard({
  note,
  chapterTitle,
  lessonTitle,
}: {
  note: {
    id: string;
    chapter_id: number | null;
    lesson_id: string | null;
    content: string;
    is_public: boolean;
    likes: number;
    updated_at: string;
  };
  chapterTitle: string;
  lessonTitle: string;
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

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="bg-bg-card border border-border hover:border-accent/50 rounded-xl p-4 transition cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-fg-muted mb-1">{header}</div>
          <div className="font-semibold truncate">{lessonTitle}</div>
        </div>
        {note.is_public && (
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-900 dark:text-blue-200 shrink-0">
            公開
          </span>
        )}
      </div>

      <p
        className={`text-sm text-fg-muted whitespace-pre-wrap ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {note.content}
      </p>

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="text-xs text-fg-muted">
          {formatTW(note.updated_at)}
          {note.likes > 0 && <span className="ml-2">👍 {note.likes}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg px-2 py-1 rounded transition"
          >
            {expanded ? (
              <>
                <ChevronUp size={12} /> 收合
              </>
            ) : (
              <>
                <ChevronDown size={12} /> 展開全文
              </>
            )}
          </button>
          {jumpHref && (
            <Link
              href={jumpHref as any}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-accent text-black font-semibold rounded hover:scale-105 transition"
            >
              跳到該課 <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
