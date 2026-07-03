"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Smile } from "lucide-react";

/**
 * 簡易 emoji 選擇器（自製、非 Pro emoji 擴充）。點一下把 unicode emoji 插到游標處。
 */
const GROUPS: { label: string; emojis: string[] }[] = [
  { label: "表情", emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😜 🤪 🤔 🤨 😐 😶 😏 😴 😪 😵 🥱 😷 🤒 🤕 🤧".split(" ") },
  { label: "手勢", emojis: "👍 👎 👏 🙌 🙏 🤝 💪 👊 ✊ ✌️ 🤞 🤟 🤙 👌 👋 🫶 ✍️ 🖐️".split(" ") },
  { label: "愛心", emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 ❣️ 💕 💞 💓 💗 💖 💘".split(" ") },
  { label: "物件", emojis: "🔥 ⭐ 🌟 ✨ 💡 🎉 🎊 🚀 🎯 ✅ ❌ ⚠️ 📌 📎 🔗 💬 📝 📢 🏆 🥇 💰 ⏰".split(" ") },
];

export function EmojiButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const PANEL_W = 280;

  const openPanel = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const left = Math.min(r.left, window.innerWidth - PANEL_W - 8);
      setPos({ top: r.bottom + 6, left: Math.max(8, left) });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const insert = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={`p-1.5 rounded transition ${open ? "bg-accent text-black" : "hover:bg-bg-elevated text-fg"}`}
        title="表情符號"
      >
        <Smile size={16} />
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[80] max-h-[320px] overflow-y-auto rounded-lg border border-border bg-bg-card p-2.5 shadow-2xl"
          style={{ top: pos.top, left: pos.left, width: PANEL_W }}
        >
          {GROUPS.map((g) => (
            <div key={g.label} className="mb-2">
              <div className="mb-1 text-[11px] text-fg-muted">{g.label}</div>
              <div className="grid grid-cols-8 gap-0.5">
                {g.emojis.map((em, i) => (
                  <button
                    key={`${g.label}-${i}`}
                    type="button"
                    onClick={() => insert(em)}
                    className="rounded p-1 text-lg leading-none hover:bg-bg-elevated transition"
                    title={em}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
