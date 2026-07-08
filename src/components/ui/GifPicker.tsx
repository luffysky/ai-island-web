"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, Loader2, Film, ChevronLeft, ChevronRight } from "lucide-react";

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";
const PER_PAGE = 12;
const PANEL_W = 320;

// 快捷分類（label → 搜尋詞；"" = 熱門 trending）
const CATS: { label: string; q: string }[] = [
  { label: "🔥 熱門", q: "" },
  { label: "😂 大笑", q: "lol" },
  { label: "😊 開心", q: "happy" },
  { label: "👍 讚", q: "thumbs up" },
  { label: "❤️ 愛心", q: "love" },
  { label: "🎉 慶祝", q: "celebrate" },
  { label: "💪 加油", q: "you can do it" },
  { label: "😮 驚訝", q: "wow" },
  { label: "🙏 謝謝", q: "thank you" },
  { label: "👋 掰掰", q: "bye" },
  { label: "😭 哭", q: "crying" },
  { label: "🐱 貓", q: "cat" },
  { label: "🐶 狗", q: "dog" },
];

interface Gif { id: string; images: { fixed_height_small: { url: string }; original: { url: string } }; title: string }

/**
 * GIPHY GIF 選擇器（美化版，參考 insight-engine）：分類快捷 + 搜尋 + 分頁 + 3 欄格。
 * 面板用 portal + fixed 定位 → 逃出 overflow 容器不被裁切/跑版。需 NEXT_PUBLIC_GIPHY_API_KEY。
 */
export function GifPicker({ onSelect, align = "left" }: { onSelect: (gifUrl: string) => void; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState(0);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; placeAbove: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setMounted(true), []);

  const place = () => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b || typeof window === "undefined") return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(PANEL_W, vw - 16);
    let left = align === "right" ? b.right - w : b.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    const placeAbove = b.top > Math.min(380, vh - 80);
    const top = placeAbove ? b.top - 8 : b.bottom + 8;
    setPos({ left, top, placeAbove });
  };

  useLayoutEffect(() => { if (open) place(); /* eslint-disable-next-line */ }, [open, gifs.length]);
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

  const fetchGifs = async (query: string, off: number) => {
    if (!GIPHY_KEY) { setGifs([]); return; }
    setLoading(true);
    try {
      const url = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=${PER_PAGE}&offset=${off}&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=${PER_PAGE}&offset=${off}&rating=g`;
      const r = await fetch(url);
      const d = await r.json();
      setGifs(d.data ?? []);
      const total = d.pagination?.total_count ?? 0;
      setHasMore(off + PER_PAGE < total);
    } catch { setGifs([]); } finally { setLoading(false); }
  };

  useEffect(() => { if (open && GIPHY_KEY) { setOffset(0); fetchGifs("", 0); setActiveCat(0); setQ(""); } /* eslint-disable-next-line */ }, [open]);

  const onQ = (v: string) => {
    setQ(v); setActiveCat(-1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setOffset(0); fetchGifs(v, 0); }, 400);
  };
  const pickCat = (i: number) => { setActiveCat(i); setQ(CATS[i].q === "" ? "" : ""); setOffset(0); fetchGifs(CATS[i].q, 0); };
  const go = (dir: 1 | -1) => {
    const off = Math.max(0, offset + dir * PER_PAGE);
    setOffset(off);
    fetchGifs(activeCat >= 0 ? CATS[activeCat].q : q, off);
  };

  const panel = open && pos && (
    <div
      ref={panelRef}
      style={{ position: "fixed", left: pos.left, top: pos.top, width: Math.min(PANEL_W, (typeof window !== "undefined" ? window.innerWidth : PANEL_W) - 16), transform: pos.placeAbove ? "translateY(-100%)" : undefined }}
      className="z-[100] rounded-2xl border border-border bg-bg-card shadow-2xl overflow-hidden animate-[fadeIn_.12s_ease-out]"
    >
      {!GIPHY_KEY ? (
        <div className="p-4 text-center text-xs text-fg-muted space-y-1">
          <Film size={20} className="mx-auto text-fg-muted" />
          <div>GIF 功能需要設定 <code className="text-accent">NEXT_PUBLIC_GIPHY_API_KEY</code></div>
          <div className="text-[10px]">到 developers.giphy.com 申請免費 key、加進環境變數即可</div>
        </div>
      ) : (
        <>
          {/* header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-bold text-fg-muted inline-flex items-center gap-1"><Film size={13} className="text-accent" /> GIF</span>
            <button type="button" onClick={() => setOpen(false)} className="text-fg-muted hover:text-fg"><X size={14} /></button>
          </div>
          {/* 搜尋 */}
          <div className="px-3 pt-2.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input value={q} onChange={(e) => onQ(e.target.value)} placeholder="搜尋 GIF…" autoFocus
                className="w-full pl-7 pr-7 py-1.5 rounded-xl bg-bg border border-border text-sm text-fg placeholder:text-fg-muted outline-none focus:border-accent/50" />
              {q && <button type="button" onClick={() => { setQ(""); setActiveCat(0); setOffset(0); fetchGifs("", 0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"><X size={13} /></button>}
            </div>
          </div>
          {/* 分類快捷 */}
          <div className="flex gap-1 px-3 pt-2 overflow-x-auto no-scrollbar-gif">
            {CATS.map((c, i) => (
              <button key={c.label} type="button" onClick={() => pickCat(i)}
                className={`shrink-0 px-2 py-1 rounded-full text-[11px] whitespace-nowrap transition ${activeCat === i ? "bg-accent text-black font-semibold" : "bg-bg-elevated text-fg-muted hover:text-fg"}`}>
                {c.label}
              </button>
            ))}
          </div>
          {/* 格子 */}
          <div className="p-2.5">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-accent" /></div>
            ) : gifs.length === 0 ? (
              <div className="text-center text-xs text-fg-muted py-10">找不到 GIF</div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {gifs.map((g) => (
                  <button key={g.id} type="button" onClick={() => { onSelect(g.images.original.url); setOpen(false); }}
                    className="rounded-lg overflow-hidden aspect-square hover:ring-2 hover:ring-accent hover:scale-[1.03] transition">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.images.fixed_height_small.url} alt={g.title} loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 分頁 + 版權 */}
          <div className="flex items-center justify-between px-3 pb-2.5">
            <button type="button" onClick={() => go(-1)} disabled={offset === 0 || loading} className="inline-flex items-center gap-0.5 text-[11px] text-fg-muted hover:text-fg disabled:opacity-30">
              <ChevronLeft size={13} /> 上一頁
            </button>
            <span className="text-[9px] text-fg-muted/60">Powered by GIPHY</span>
            <button type="button" onClick={() => go(1)} disabled={!hasMore || loading} className="inline-flex items-center gap-0.5 text-[11px] text-fg-muted hover:text-fg disabled:opacity-30">
              下一頁 <ChevronRight size={13} />
            </button>
          </div>
        </>
      )}
      <style>{`.no-scrollbar-gif::-webkit-scrollbar{display:none}.no-scrollbar-gif{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );

  return (
    <div className="relative inline-block">
      <button ref={btnRef} type="button" onClick={() => setOpen((o) => !o)} aria-label="GIF"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-fg-muted hover:text-accent hover:bg-bg-elevated transition text-[11px] font-bold">
        GIF
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
