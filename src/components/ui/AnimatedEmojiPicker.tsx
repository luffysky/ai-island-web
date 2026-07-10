"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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

/** 顔文字（純文字、貼上就是文字；挑可愛、表情豐富的）。 */
const KAOMOJI: string[] = [
  "(｡・ω・｡)","(≧▽≦)","(´｡• ᵕ •｡`)","(๑˃ᴗ˂)ﻭ","(*≧ω≦*)","ヽ(・∀・)ﾉ","(＾▽＾)","(◕‿◕)","(✿◕‿◕)","(｡♥‿♥｡)",
  "(♡˙︶˙♡)","(*´꒳`*)","(っ˘ω˘ς)","૮₍ ˶•⤙•˶ ₎ა","(ᵔ◡ᵔ)","ʕ•ᴥ•ʔ","ʕ￫ᴥ￩ʔ","(=^･ω･^=)","(｡•́︿•̀｡)","(╥﹏╥)",
  "(っ˶´ ˘ `˶)っ","(´•̥ ̯ •̥`)","(ㆆ_ㆆ)","(¬‿¬)","(⊙_⊙)","(*^▽^*)","(๑>◡<๑)","o(≧□≦)o","٩(◕‿◕)۶","(づ￣ ³￣)づ",
  "(๑•̀ㅂ•́)و✧","ヽ(´▽`)/","(*/ω＼*)","(´；ω；`)","(°ロ°)","(＞﹏＜)","(ノ°益°)ノ","┬─┬ノ( º _ ºノ)","(╯°□°）╯︵ ┻━┻","¯\\_(ツ)_/¯",
  "(｡ŏ﹏ŏ)","(◍•ᴗ•◍)","(⁀ᗢ⁀)","(｡•̀ᴗ-)✧","(灬º‿º灬)","(๑´ㅂ`๑)","(´ ▽ ` )ﾉ","(*´∀`)~♥","(σ`∀´)σ","(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
];

const PANEL_W = 300;

/**
 * 動態 emoji 選擇器（Google Noto Animated Emoji）。
 * 面板用 **portal + fixed 定位** 渲染到 body → 逃出 overflow 容器（tiptap 工具列、彈窗）不被裁切、不跑版。
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
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; placeAbove: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // 依按鈕位置算面板 fixed 座標（水平 clamp 進視口；空間夠就開在上方、否則下方）
  const place = () => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b || typeof window === "undefined") return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(PANEL_W, vw - 16);
    let left = align === "right" ? b.right - w : b.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    // 上方空間夠(>360)就往上開；否則往下
    const placeAbove = b.top > Math.min(360, vh - 80);
    const top = placeAbove ? b.top - 8 : b.bottom + 8;
    setPos({ left, top, placeAbove });
  };

  useLayoutEffect(() => { if (open) place(); /* eslint-disable-next-line */ }, [open, q, cat]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => place();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line
  }, [open]);

  const pick = (e: string) => { onSelect(e); setOpen(false); setQ(""); };
  const isKao = cat === "kaomoji" && !q.trim();
  const list = q.trim()
    ? CATEGORIES.flatMap((c) => c.emojis).filter((e, i, a) => a.indexOf(e) === i) // 搜尋只找 emoji，不含顔文字
    : isKao
      ? KAOMOJI
      : CATEGORIES.find((c) => c.id === cat)?.emojis ?? [];

  const panel = open && pos && (
    <div
      ref={panelRef}
      style={{ position: "fixed", left: pos.left, top: pos.top, width: Math.min(PANEL_W, (typeof window !== "undefined" ? window.innerWidth : PANEL_W) - 16), transform: pos.placeAbove ? "translateY(-100%)" : undefined }}
      className="z-[100] rounded-2xl border border-border bg-bg-card shadow-2xl overflow-hidden animate-[fadeIn_.12s_ease-out]"
    >
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
          {/* 顔文字（純文字表情）分頁 */}
          <button
            type="button"
            onClick={() => setCat("kaomoji")}
            title="顔文字"
            className={`shrink-0 w-8 h-8 rounded-lg text-base font-bold flex items-center justify-center transition ${cat === "kaomoji" ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-bg-elevated"}`}
          >
            ツ
          </button>
        </div>
      )}

      <div className="p-2 max-h-[220px] overflow-y-auto">
        {isKao ? (
          <div className="grid grid-cols-2 gap-1">
            {KAOMOJI.map((k, i) => (
              <button
                key={`${k}-${i}`}
                type="button"
                onClick={() => pick(k)}
                title={k}
                className="h-9 px-1.5 rounded-lg flex items-center justify-center text-[13px] text-fg hover:bg-bg-elevated hover:text-accent transition truncate"
              >
                {k}
              </button>
            ))}
          </div>
        ) : (
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
        )}
        {q && list.length === 0 && <div className="text-center text-xs text-fg-muted py-4">沒有結果</div>}
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Emoji"
        className={`inline-flex items-center justify-center rounded-lg text-fg-muted hover:text-accent hover:bg-bg-elevated transition ${buttonClassName || "w-8 h-8"}`}
      >
        <Smile size={18} />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
