"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { StickyNote, Save, Check, GripHorizontal } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useToast } from "@/components/ui/Toast";
import { usePopover, PopoverPanel } from "@/components/ui/Popover";
import { useLessonNote } from "@/lib/use-lesson-note";

// TipTap 富文字編輯器（含圖片上傳）— 動態載入、避免拖累章節頁
const BlogEditor = dynamic(
  () => import("@/components/blog/BlogEditor").then((m) => m.BlogEditor),
  { ssr: false, loading: () => <div className="text-xs text-fg-muted p-3">載入編輯器…</div> },
);

export function NotePanel({
  lessonId,
  chapterId,
}: {
  lessonId: string;
  chapterId: number;
  isLoggedIn?: boolean;
}) {
  const toast = useToast();
  const popover = usePopover({ placement: "bottom-end", maxWidth: 440 });
  const { open, setOpen } = popover;
  const supabase = createSupabaseBrowser();
  const { note, setNote, saving, saved, error, save } = useLessonNote(
    lessonId,
    chapterId,
    open,
  );

  // 拖曳：title bar 按下後可以把整個 panel 拖到任何位置（避開教材文字）
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

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

  const handleSave = async () => {
    const r = await save();
    if (!r.ok && error) toast.error("筆記儲存失敗、內容已保留");
  };

  return (
    <>
      <button
        ref={popover.refs.setReference}
        {...popover.getReferenceProps({
          onClick: async (e) => {
            if (open) return;
            e.preventDefault();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              if (typeof window !== "undefined") {
                window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
              }
              return;
            }
            setDrag({ x: 0, y: 0 });
            setOpen(true);
          },
        })}
        className={`p-1.5 rounded transition hover:bg-bg-elevated ${
          note ? "text-accent" : "text-fg-muted"
        }`}
        title={note ? "已有筆記" : "新增筆記"}
      >
        <StickyNote size={16} className={note ? "fill-current" : ""} />
      </button>

      <PopoverPanel
        api={popover}
        className="w-96 p-3"
        style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}
      >
        <div
          onMouseDown={onDragStart}
          className="flex items-center justify-between mb-2 -mt-1 -mx-1 px-2 py-1 cursor-move select-none rounded hover:bg-bg-elevated"
          title="按住拖曳移動視窗"
        >
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <GripHorizontal size={14} className="text-fg-muted" />
            <StickyNote size={14} /> 我的筆記
          </span>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setOpen(false)}
            className="text-xs text-fg-muted"
          >
            關閉
          </button>
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
            onClick={handleSave}
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
      </PopoverPanel>
    </>
  );
}
