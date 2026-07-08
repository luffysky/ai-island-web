"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, Film } from "lucide-react";

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";
const PER_PAGE = 12;

interface Gif { id: string; images: { fixed_height_small: { url: string }; original: { url: string } }; title: string }

/**
 * GIPHY GIF 選擇器（掛在輸入框旁）。選中 → `onSelect(gifUrl)` 把 GIF 網址插進內容，
 * 顯示端把 giphy 圖片網址渲染成 <img>。需環境變數 NEXT_PUBLIC_GIPHY_API_KEY（沒設就提示）。
 * 照林董架構：GIPHY 是「第二版」、beta key 免費限 100/hr、別當核心。
 */
export function GifPicker({ onSelect, align = "left" }: { onSelect: (gifUrl: string) => void; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [shiftX, setShiftX] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // 超出視口就把面板往內拉（手機防切邊）
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
  }, [open]);

  const fetchGifs = async (query: string) => {
    if (!GIPHY_KEY) { setGifs([]); return; }
    setLoading(true);
    try {
      const url = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=${PER_PAGE}&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=${PER_PAGE}&rating=g`;
      const r = await fetch(url);
      const d = await r.json();
      setGifs(d.data ?? []);
    } catch { setGifs([]); } finally { setLoading(false); }
  };

  useEffect(() => { if (open && GIPHY_KEY) fetchGifs(""); }, [open]);
  const onQ = (v: string) => { setQ(v); clearTimeout(timer.current); timer.current = setTimeout(() => fetchGifs(v), 400); };

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="GIF"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-fg-muted hover:text-accent hover:bg-bg-elevated transition text-[11px] font-bold">
        GIF
      </button>
      {open && (
        <div ref={popRef} style={{ transform: shiftX ? `translateX(${shiftX}px)` : undefined }} className={`absolute z-[70] bottom-full mb-2 ${align === "right" ? "right-0" : "left-0"} w-[300px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-bg-card shadow-2xl overflow-hidden animate-[fadeIn_.12s_ease-out]`}>
          {!GIPHY_KEY ? (
            <div className="p-4 text-center text-xs text-fg-muted space-y-1">
              <Film size={20} className="mx-auto text-fg-muted" />
              <div>GIF 功能需要設定 <code className="text-accent">NEXT_PUBLIC_GIPHY_API_KEY</code></div>
              <div className="text-[10px]">到 developers.giphy.com 申請免費 key、加進環境變數即可</div>
            </div>
          ) : (
            <>
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
                  <input value={q} onChange={(e) => onQ(e.target.value)} placeholder="搜尋 GIF…" autoFocus
                    className="w-full pl-7 pr-7 py-1.5 rounded-lg bg-bg border border-border text-sm text-fg placeholder:text-fg-muted outline-none focus:border-accent/50" />
                  {q && <button type="button" onClick={() => { setQ(""); fetchGifs(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"><X size={13} /></button>}
                </div>
              </div>
              <div className="p-2 max-h-[240px] overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-accent" /></div>
                ) : gifs.length === 0 ? (
                  <div className="text-center text-xs text-fg-muted py-8">沒有結果</div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {gifs.map((g) => (
                      <button key={g.id} type="button" onClick={() => { onSelect(g.images.original.url); setOpen(false); setQ(""); }}
                        className="rounded-lg overflow-hidden hover:ring-2 hover:ring-accent transition">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.images.fixed_height_small.url} alt={g.title} loading="lazy" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-[9px] text-fg-muted text-center pt-1.5">Powered by GIPHY</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
