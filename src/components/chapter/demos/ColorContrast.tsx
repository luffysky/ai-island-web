"use client";
import { useState } from "react";

/**
 * 對比度檢查器 — 調前景/背景色，即時算 WCAG 對比度、標示過不過 AA/AAA。
 * 教無障礙(a11y)配色。純原生 input[type=color]、無新依賴、RWD 安全。
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lin(c: number) { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
function lum([r, g, b]: [number, number, number]) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }
function ratio(a: string, b: string) {
  const la = lum(hexToRgb(a)), lb = lum(hexToRgb(b));
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded inline-flex items-center gap-1 ${ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
      {ok ? "✅" : "❌"} {label}
    </span>
  );
}

export function ColorContrast({ title, note }: { title?: string; note?: string }) {
  const [fg, setFg] = useState("#6b7280");
  const [bg, setBg] = useState("#ffffff");
  const r = ratio(fg, bg);
  const rr = Math.round(r * 100) / 100;

  return (
    <div className="demo-glass overflow-hidden">
      <div className="px-3 py-2 demo-glass-head">
        <div className="text-sm font-semibold flex items-center gap-1.5">🎨 {title ?? "對比度檢查器（WCAG）"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 取色 */}
      <div className="p-3 flex flex-wrap gap-4 border-b border-border">
        <label className="flex items-center gap-2 text-xs">
          <span className="text-fg-muted">文字色</span>
          <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent p-0" />
          <span className="font-mono">{fg}</span>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-fg-muted">背景色</span>
          <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent p-0" />
          <span className="font-mono">{bg}</span>
        </label>
      </div>

      {/* 預覽 */}
      <div className="p-3">
        <div className="rounded-lg p-4 flex flex-col gap-1" style={{ background: bg, color: fg }}>
          <span className="text-lg font-bold">大標題文字（18px+ 粗體）</span>
          <span className="text-sm">這是一般內文，看看在這個配色下讀不讀得清楚。</span>
        </div>
      </div>

      {/* 結果 */}
      <div className="px-3 pb-3">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold tabular-nums">{rr}:1</span>
          <span className="text-[11px] text-fg-muted">對比度（越高越清楚）</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge ok={r >= 4.5} label="AA 內文 (4.5:1)" />
          <Badge ok={r >= 3} label="AA 大字 (3:1)" />
          <Badge ok={r >= 7} label="AAA 內文 (7:1)" />
        </div>
        <div className="text-[10px] text-fg-muted mt-2 leading-relaxed">
          {r >= 4.5 ? "✅ 一般內文也過關、可放心用。" : r >= 3 ? "⚠️ 只夠大字用；當內文（小字）會太淺、部分人看不清。" : "❌ 對比太低，多數人（尤其視力不佳者）會看不清。淺灰字配白底是最常見的雷。"}
          <br />試試把「文字色」調深、或背景調淺，看數字怎麼往上跳。
        </div>
      </div>
    </div>
  );
}
