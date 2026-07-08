"use client";

import { useState, useRef, useEffect } from "react";
import { Smile, Search, X } from "lucide-react";
import { AnimatedEmoji } from "./AnimatedEmoji";

/** Emoji 分類（動態 Noto 版）。 */
const CATEGORIES: { id: string; name: string; icon: string; emojis: string[] }[] = [
  { id: "faces", name: "表情", icon: "😀", emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","🥲","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥳","😏","😒","😞","😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🫡","🤭","🫢","😶","😐","😑","😬","🙄","😯","😲","🥱","😴","🤤","😷","🤒","🤕","🤢","🤮","🤧","🥴","😵","🤠","🥸","🤡","👻","💀","👽","🤖","💩"] },
  { id: "gestures", name: "手勢", icon: "👍", emojis: ["👍","👎","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤝","🙏","✍️","💪","🦾","👏","🙌","👐","🤲","🫶","🤜","🤛","✊","👊","🫵"] },
  { id: "hearts", name: "愛心", icon: "❤️", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💌","💋","💯"] },
  { id: "animals", name: "動物", icon: "🐾", emojis: ["🐱","🐶","🐰","🐹","🐭","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🕷️","🦂","🐢","🐍","🦎","🐙","🦑","🦀","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦛","🦏","🐪","🦒","🐄","🐕","🐈","🦔","🐾"] },
  { id: "food", name: "食物", icon: "🍔", emojis: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🥦","🌽","🥕","🥔","🍠","🥐","🍞","🥖","🧀","🥚","🍳","🥞","🧇","🥓","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🥗","🍜","🍝","🍣","🍱","🍙","🍤","🍦","🍰","🎂","🧁","🍫","🍬","🍭","🍩","🍪","☕","🍵","🧋","🥤","🍺","🍻","🥂","🍷","🍸","🍹"] },
  { id: "activity", name: "活動", icon: "⚽", emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥅","🏒","🏑","🥍","🏹","🎣","🥊","🥋","⛳","⛸️","🎿","🛷","🏂","🏋️","🤸","🤾","🏌️","🏇","🧘","🏄","🏊","🚴","🎮","🕹️","🎲","🧩","🎯","🎳","🎪","🎨","🎭","🎬","🎤","🎧","🎼","🎹","🥁","🎸","🎺","🎻","🏆","🥇","🥈","🥉","🏅","🎖️"] },
  { id: "objects", name: "物品", icon: "💡", emojis: ["⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","💽","💾","📀","📷","📸","🎥","📹","🔍","🔎","💡","🔦","🕯️","📔","📕","📗","📘","📙","📚","📖","🔖","📝","✏️","🖊️","🖌️","📐","📏","📌","📎","🔗","📅","📆","📊","📈","📉","💰","💸","💳","💎","⚖️","🔧","🔨","⚙️","🧲","🔑","🗝️","🚪","🛎️","🎁","🎈","🎉","🎊","🔔"] },
  { id: "symbols", name: "符號", icon: "✨", emojis: ["✅","❌","⭕","❗","❓","‼️","⚠️","🚫","💯","🔥","⭐","🌟","💫","✨","💥","💢","💨","💦","🎵","🎶","➕","➖","✔️","☑️","🆗","🆕","🆒","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟥","🟧","🟨","🟩","🟦","🟪","🔺","🔻","💠","🔘","🏁","🚩","🎌"] },
  { id: "nature", name: "自然", icon: "🌸", emojis: ["🌸","🌺","🌻","🌹","🌷","🌼","💐","🌿","🍀","🌱","🌳","🌲","🌴","🌵","🎋","🎍","🍁","🍂","🍃","🌾","🌊","🔥","💧","🌈","☀️","🌤️","⛅","☁️","🌧️","⛈️","🌩️","❄️","⛄","🌬️","🌪️","🌙","🌝","🌛","⭐","🌟","💫","🌍","🌎","🌏","🪐","🌋","🏔️","🏝️","🏜️","🌅","🌄"] },
];

/**
 * 動態 emoji 選擇器（Google Noto Animated Emoji）。
 * 掛在任何輸入框旁邊：點按鈕開面板 → 選 emoji → `onSelect(emoji)` 把字元插進去。
 * emoji 字元本身是純文字；顯示端用 <EmojiText> 就會渲染成動態。
 */
export function AnimatedEmojiPicker({
  onSelect,
  className = "",
  buttonClassName = "",
  align = "left",
}: {
  onSelect: (emoji: string) => void;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("faces");
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [shiftX, setShiftX] = useState(0); // 超出視口時把面板往內拉

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // 開啟後量測面板、若左右超出視口就 translateX 拉回（手機防切邊）
  useEffect(() => {
    if (!open) { setShiftX(0); return; }
    const el = popRef.current;
    if (!el || typeof window === "undefined") return;
    setShiftX(0);
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const M = 8;
      let dx = 0;
      if (r.left < M) dx = M - r.left;
      else if (r.right > window.innerWidth - M) dx = window.innerWidth - M - r.right;
      if (dx) setShiftX(dx);
    });
  }, [open, q, cat]);

  const pick = (e: string) => { onSelect(e); setOpen(false); setQ(""); };
  const list = q.trim()
    ? CATEGORIES.flatMap((c) => c.emojis).filter((e, i, a) => a.indexOf(e) === i)
    : CATEGORIES.find((c) => c.id === cat)?.emojis ?? [];

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Emoji"
        className={`inline-flex items-center justify-center rounded-lg text-fg-muted hover:text-accent hover:bg-bg-elevated transition ${buttonClassName || "w-8 h-8"}`}
      >
        <Smile size={18} />
      </button>

      {open && (
        <div ref={popRef} style={{ transform: shiftX ? `translateX(${shiftX}px)` : undefined }} className={`absolute z-[70] bottom-full mb-2 ${align === "right" ? "right-0" : "left-0"} w-[300px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-bg-card shadow-2xl overflow-hidden animate-[fadeIn_.12s_ease-out]`}>
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜尋…"
                className="w-full pl-7 pr-7 py-1.5 rounded-lg bg-bg border border-border text-sm text-fg placeholder:text-fg-muted outline-none focus:border-accent/50"
                autoFocus
              />
              {q && <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"><X size={13} /></button>}
            </div>
          </div>

          {!q && (
            <div className="flex gap-0.5 px-1.5 pt-1.5 overflow-x-auto no-scrollbar">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  title={c.name}
                  className={`shrink-0 w-8 h-8 rounded-lg text-lg flex items-center justify-center transition ${cat === c.id ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-bg-elevated"}`}
                >
                  {c.icon}
                </button>
              ))}
            </div>
          )}

          <div className="p-2 max-h-[220px] overflow-y-auto">
            <div className="grid grid-cols-7 gap-0.5">
              {list.map((e, i) => (
                <button
                  key={`${e}-${i}`}
                  type="button"
                  onClick={() => pick(e)}
                  title={e}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-bg-elevated hover:scale-110 transition-transform"
                >
                  <AnimatedEmoji emoji={e} size={24} />
                </button>
              ))}
            </div>
            {q && list.length === 0 && <div className="text-center text-xs text-fg-muted py-4">沒有結果</div>}
          </div>
        </div>
      )}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}
