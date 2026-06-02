"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { StickyNote, Save, Check, X, GripHorizontal } from "lucide-react";
import { useLessonNote } from "@/lib/use-lesson-note";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const BlogEditor = dynamic(
  () => import("@/components/blog/BlogEditor").then((m) => m.BlogEditor),
  { ssr: false, loading: () => <div className="text-xs text-fg-muted p-3">載入編輯器…</div> },
);

type LessonRef = { id: string; title: string; number?: string };

export function FloatingNoteButton({
  chapterId,
  lessons,
}: {
  chapterId: number;
  lessons: LessonRef[];
}) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    lessons[0]?.id ?? null,
  );
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const supabase = createSupabaseBrowser();

  // 追當前 viewport 中央最接近的 lesson
  useEffect(() => {
    const els = lessons
      .map((l) => document.getElementById(`lesson-${l.id}`))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const recalc = () => {
      const viewportMid = window.innerHeight / 2;
      let best: { id: string; dist: number } | null = null;
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        // lesson 在 viewport 內：用元素中心點到視窗中心的距離
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        const center = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(center - viewportMid);
        const id = el.id.replace(/^lesson-/, "");
        if (!best || dist < best.dist) best = { id, dist };
      }
      if (best) setActiveLessonId(best.id);
    };

    recalc();
    window.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
    };
  }, [lessons]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0];

  const { note, setNote, saving, saved, error, save } = useLessonNote(
    activeLesson?.id ?? "",
    chapterId,
    open && !!activeLesson,
  );

  if (!activeLesson) return null;

  const onDragStart = (e: React.MouseEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY, startX: drag.x, startY: drag.y };
    const move = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      setDrag({
        x: dragStart.current.startX + (ev.clientX - dragStart.current.x),
        y: dragStart.current.startY + (ev.clientY - dragStart.current.y),
      });
    };
    const up = () => {
      dragStart.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const handleOpen = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }
    setDrag({ x: 0, y: 0 });
    setOpen(true);
  };

  return (
    <>
      {/* Floating 觸發按鈕：固定右下、跟著捲動顯示當前 lesson */}
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-accent text-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition"
          title={`對 LESSON ${activeLesson.number ?? activeLesson.id} 做筆記`}
          aria-label="新增筆記"
        >
          <StickyNote size={16} />
          <span className="text-xs font-semibold whitespace-nowrap">
            筆記 · {activeLesson.number ?? activeLesson.id}
          </span>
        </button>
      )}

      {/* Modal 視窗：可拖曳、不擋住整個畫面 */}
      {open && (
        <div
          className="fixed bottom-24 right-4 z-50 w-80 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}
        >
          <div className="p-3">
            <div
              onMouseDown={onDragStart}
              className="flex items-center justify-between mb-2 -mt-1 -mx-1 px-2 py-1 cursor-move select-none rounded hover:bg-bg-elevated"
              title="按住拖曳移動視窗"
            >
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <GripHorizontal size={14} className="text-fg-muted" />
                📝 {activeLesson.number ?? activeLesson.id}
              </span>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setOpen(false)}
                className="text-xs text-fg-muted p-1 hover:bg-bg-elevated rounded"
                aria-label="關閉"
              >
                <X size={14} />
              </button>
            </div>
            <div className="text-xs text-fg-muted mb-2 line-clamp-1" title={activeLesson.title}>
              {activeLesson.title}
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
              <BlogEditor
                content={note}
                onChange={setNote}
                placeholder="紀錄你對這個 lesson 的想法、重點…（可貼上 / 拖曳圖片）"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-fg-muted">{note.replace(/<[^>]*>/g, "").length} 字</span>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1 bg-accent text-black text-xs font-semibold rounded hover:scale-105 transition disabled:opacity-50"
              >
                {saving ? "儲存中…" : saved ? <><Check size={12} /> 已存</> : <><Save size={12} /> 儲存</>}
              </button>
            </div>
            {error && (
              <div className="mt-2 px-2 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
