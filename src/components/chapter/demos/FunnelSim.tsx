"use client";
import { useState } from "react";

/**
 * 行銷漏斗模擬器 — 拉各關卡的轉換率，看 N 個曝光最後剩幾單、多少營收，
 * 並即時看到「某一關 +1% 會多幾單」的複利效果。教漏斗與轉換率思維。
 * 非 prompt/CSS 類，專為行銷章設計。
 */

const STAGES = [
  { key: "ctr", label: "點擊率（曝光→點進來）", def: 3, max: 20 },
  { key: "land", label: "到達留存（點進來→沒馬上跳走）", def: 60, max: 100 },
  { key: "cart", label: "加入購物車（有興趣→加購）", def: 20, max: 100 },
  { key: "buy", label: "完成結帳（加購→付款）", def: 40, max: 100 },
];

const fmt = (n: number) => Math.round(n).toLocaleString();

export function FunnelSim({ title, note }: { title?: string; note?: string }) {
  const [imp, setImp] = useState(10000);
  const [aov, setAov] = useState(500);
  const [rates, setRates] = useState<Record<string, number>>(Object.fromEntries(STAGES.map((s) => [s.key, s.def])));

  const set = (k: string, v: number) => setRates((r) => ({ ...r, [k]: v }));

  const calc = (rr: Record<string, number>) => {
    const clicks = imp * rr.ctr / 100;
    const landed = clicks * rr.land / 100;
    const cart = landed * rr.cart / 100;
    const buyers = cart * rr.buy / 100;
    return { clicks, landed, cart, buyers, revenue: buyers * aov };
  };

  const now = calc(rates);
  // 「點擊率 +1 個百分點」的複利效果
  const bump = calc({ ...rates, ctr: rates.ctr + 1 });
  const extraBuyers = bump.buyers - now.buyers;

  const bars = [
    { label: "曝光", n: imp, color: "#a5b4fc" },
    { label: "點擊", n: now.clicks, color: "#93c5fd" },
    { label: "留在頁上", n: now.landed, color: "#67e8f9" },
    { label: "加購", n: now.cart, color: "#fcd34d" },
    { label: "成交", n: now.buyers, color: "#86efac" },
  ];

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-elevated">
        <div className="text-sm font-semibold flex items-center gap-1.5">🫗 {title ?? "行銷漏斗模擬器"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 輸入 */}
      <div className="p-3 flex flex-wrap gap-3 border-b border-border text-xs">
        <label className="flex items-center gap-1.5">曝光數
          <input type="number" value={imp} min={0} step={1000} onChange={(e) => setImp(Math.max(0, Number(e.target.value)))}
            className="w-24 bg-bg border border-border rounded px-2 py-1 outline-none focus:border-accent tabular-nums" />
        </label>
        <label className="flex items-center gap-1.5">客單價 NT$
          <input type="number" value={aov} min={0} step={50} onChange={(e) => setAov(Math.max(0, Number(e.target.value)))}
            className="w-20 bg-bg border border-border rounded px-2 py-1 outline-none focus:border-accent tabular-nums" />
        </label>
      </div>

      {/* 轉換率滑桿 */}
      <div className="p-3 space-y-2 border-b border-border">
        {STAGES.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="text-[11px] text-fg-muted flex-1 min-w-0">{s.label}</span>
            <input type="range" min={0} max={s.max} value={rates[s.key]} onChange={(e) => set(s.key, Number(e.target.value))} className="accent-accent w-24 sm:w-32 shrink-0" />
            <span className="text-[11px] font-mono w-9 text-right tabular-nums">{rates[s.key]}%</span>
          </div>
        ))}
      </div>

      {/* 漏斗視覺 */}
      <div className="p-3 space-y-1.5">
        {bars.map((b, i) => {
          const pct = imp > 0 ? (b.n / imp) * 100 : 0;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-fg-muted w-14 shrink-0 text-right">{b.label}</span>
              <div className="flex-1 h-6 rounded bg-bg-elevated overflow-hidden relative">
                <div className="h-full rounded flex items-center px-2 transition-all duration-300" style={{ width: `${Math.max(pct, 2)}%`, background: b.color, minWidth: 44 }}>
                  <span className="text-[11px] font-bold text-slate-800 tabular-nums whitespace-nowrap">{fmt(b.n)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 結果 + 複利提示 */}
      <div className="px-3 pb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-green-500/10 border border-green-500/25 p-2.5">
          <div className="text-[11px] text-fg-muted">成交 / 營收</div>
          <div className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">{fmt(now.buyers)} 單 · NT${fmt(now.revenue)}</div>
          <div className="text-[10px] text-fg-muted mt-0.5">整體轉換率 {(imp > 0 ? now.buyers / imp * 100 : 0).toFixed(2)}%</div>
        </div>
        <div className="rounded-lg bg-accent/10 border border-accent/25 p-2.5">
          <div className="text-[11px] text-fg-muted">點擊率只要 +1%</div>
          <div className="text-sm font-bold text-accent tabular-nums">多 {fmt(extraBuyers)} 單 · +NT${fmt(bump.revenue - now.revenue)}</div>
          <div className="text-[10px] text-fg-muted mt-0.5">前段一點改善、後面全複利放大</div>
        </div>
      </div>
      <div className="px-3 pb-3 text-[10px] text-fg-muted">拉拉看：把最低的那一關往上調，比全部平均加更有效——這就是「找漏斗破口」。</div>
    </div>
  );
}
