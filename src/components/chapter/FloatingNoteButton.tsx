"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { StickyNote, Save, Check, X, GripHorizontal } from "lucide-react";
import { useLessonNote } from "@/lib/use-lesson-note";
import { useAuth } from "@/lib/auth-context";

const BlogEditor = dynamic(
  () => import("@/components/blog/BlogEditor").then((m) => m.BlogEditor),
  { ssr: false, loading: () => <div className="text-xs text-fg-muted p-3">載入編輯器…</div> },
);

type LessonRef = { id: string; title: string; number?: string };

// 觸發鈕基準是 `fixed bottom-24 left-4`（bottom-24=96px），可自由拖曳、位置存 localStorage。
// bug 258：鈕原本 z-40 = 跟 TopNav(sticky top-0 z-40 + backdrop-blur 自成堆疊脈絡)同層，拖到頂會被導覽列
// 蓋住、點不到也拖不出來。雙管齊下修：
//  ① 圖層順序（Nami 建議）：鈕提到 z-50、蓋在導覽列之上 → 就算重疊也點得到、不會被遮。
//  ② clamp（下方 clampNoteBtnPos）：上緣仍留在導覽列下方 → 不會反過來擋住導覽列的按鈕，且已卡住的舊位置自癒。
const NOTE_BTN_W = 180;   // 觸發鈕約略寬度（留右邊界）
const NOTE_BTN_H = 44;    // 觸發鈕約略高度（含 padding）
const NAV_SAFE_TOP = 72;  // 導覽列 56 + 16 間距：觸發鈕上緣不得高於此
function clampNoteBtnPos(pos: { x: number; y: number }) {
  const maxX = Math.max(0, window.innerWidth - NOTE_BTN_W);
  // 上緣 = anchorTop(innerHeight-96-BTN_H) + y，要求 >= NAV_SAFE_TOP → y >= NAV_SAFE_TOP - anchorTop
  const minY = Math.min(0, NAV_SAFE_TOP - (window.innerHeight - 96 - NOTE_BTN_H));
  return {
    x: Math.min(Math.max(pos.x, 0), maxX),
    y: Math.min(Math.max(pos.y, minY), 0),   // 往下不超過基準(bottom-24)、往上不進導覽列
  };
}

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
  // 觸發鈕本身可自由拖曳、位置記到 localStorage（預設左下、不跟右下角綠寶助教重疊）
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const { user, status } = useAuth();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lessonNoteBtnPos");
      if (!saved) return;
      const pos = JSON.parse(saved) as { x: number; y: number };
      // clamp 回可視範圍（且上緣不進導覽列）；越界就修正並回寫，確保鈕永遠看得到、拿得回。
      // 舊版把鈕拖到頂被導覽列蓋住的壞位置，會在這裡自動被拉回安全區（見 bug 258）。
      const clamped = clampNoteBtnPos(pos);
      setBtnPos(clamped);
      if (clamped.x !== pos.x || clamped.y !== pos.y) {
        try { localStorage.setItem("lessonNoteBtnPos", JSON.stringify(clamped)); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, []);

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

  const handleOpen = () => {
    if (status === "loading") return; // auth 還沒好、先別動作
    if (!user) {
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }
    setDrag({ x: 0, y: 0 });
    setOpen(true);
  };

  // 觸發鈕：拖曳 = 移動並記住位置；沒移動（點一下）= 開筆記
  const onBtnPointerDown = (e: React.PointerEvent) => {
    const sx = e.clientX, sy = e.clientY;
    const base = { ...btnPos };
    let moved = false;
    let cur = base;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
      // 拖曳時就 clamp：讓鈕停在導覽列下緣、不會滑到頂被蓋住（見 bug 258）
      cur = clampNoteBtnPos({ x: base.x + dx, y: base.y + dy });
      setBtnPos(cur);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (moved) {
        // clamp 回可視範圍再存（跟載入時同一套邊界），避免拖到畫面外或頂部導覽列後下次看不到/拿不回
        const safe = clampNoteBtnPos(cur);
        setBtnPos(safe);
        try { localStorage.setItem("lessonNoteBtnPos", JSON.stringify(safe)); } catch { /* ignore */ }
      } else {
        handleOpen();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <>
      {/* Floating 觸發按鈕：固定右下、跟著捲動顯示當前 lesson */}
      {!open && (
        <button
          onPointerDown={onBtnPointerDown}
          style={{ transform: `translate(${btnPos.x}px, ${btnPos.y}px)` }}
          className="fixed bottom-24 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-accent text-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition touch-none cursor-grab active:cursor-grabbing"
          title={`對 LESSON ${activeLesson.number ?? activeLesson.id} 做筆記（可拖曳移動）`}
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
          className="fixed bottom-24 left-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
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
                <StickyNote size={14} /> {activeLesson.number ?? activeLesson.id}
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
