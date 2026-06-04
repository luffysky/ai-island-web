"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ManagedNote } from "./NotesManager";
import { resolveSticky, clampOpacity, hexToRgba } from "@/lib/note-sticky";

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
const plain = (html: string) => String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/**
 * 漂浮筆記預覽：把所有筆記變成輕輕漂浮的便利貼、點一張開來看 / 編輯。
 */
export function FloatingNotesOverlay({
  notes,
  chapterMap,
  onSelect,
  onClose,
}: {
  notes: ManagedNote[];
  chapterMap: Record<string, { chapterTitle: string; lessonTitle: string }>;
  onSelect: (n: ManagedNote) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] overflow-auto"
      style={{ background: "rgba(10,10,15,0.78)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
    >
      <style>{`@keyframes noteFloat{0%,100%{transform:translateY(0) rotate(var(--r))}50%{transform:translateY(-16px) rotate(calc(var(--r) * -1))}}`}</style>

      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-black/30 backdrop-blur">
        <div className="text-white font-bold text-sm sm:text-base">🎈 漂浮筆記 · 點一張看內容（{notes.length} 則）</div>
        <button onClick={onClose} className="text-white/80 hover:text-white transition" aria-label="關閉">
          <X size={24} />
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-white/70 text-center py-24">還沒有筆記。先去新增一則吧。</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-5 p-6 pb-28">
          {notes.map((n) => {
            const h = hashStr(n.category || n.id);
            const sk = resolveSticky({ color: n.color, category: n.category, id: n.id });
            const op = clampOpacity(n.opacity);
            const rot = ((h % 5) - 2) * 1.2;
            const dur = 4 + (h % 30) / 10; // 4–7s
            const delay = (h % 20) / 10; // 0–2s
            const meta = chapterMap[n.lesson_id ?? ""] ?? chapterMap[`ch${n.chapter_id}`] ?? null;
            const head = n.chapter_id
              ? `Ch${n.chapter_id}${meta?.chapterTitle ? " · " + meta.chapterTitle : ""}`
              : "📝 自由筆記";
            const body = plain(n.content) || "（空白）";
            return (
              <button
                key={n.id}
                onClick={() => onSelect(n)}
                className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-lg p-3 pt-5 shadow-xl text-left hover:scale-110 hover:z-20 transition-transform"
                style={
                  {
                    background: hexToRgba(sk.bg, op),
                    color: "#2d2d2d",
                    "--r": `${rot}deg`,
                    animation: `noteFloat ${dur}s ease-in-out ${delay}s infinite`,
                  } as React.CSSProperties
                }
              >
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 rounded-[2px]"
                  style={{ background: sk.tape, opacity: 0.6, boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }}
                />
                <div className="text-[10px] mb-1 truncate" style={{ color: "#6b6b6b" }}>{head}</div>
                <div
                  className="text-xs leading-snug overflow-hidden"
                  style={{ display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical" }}
                >
                  {body}
                </div>
                {n.category && (
                  <span className="absolute bottom-2 left-3 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.1)", color: "#444" }}>
                    📁 {n.category}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
