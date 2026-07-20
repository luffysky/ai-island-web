"use client";
import { useState } from "react";
import { Copy, Check, RotateCcw } from "lucide-react";

/**
 * 圖像 Prompt 積木 — 點 chip 依「主體→風格→光線→構圖→品質→比例」把 prompt 組起來，
 * 即時看完整 prompt 字串 + 每個零件加了什麼效果。教 AI 生圖的 prompt 結構。
 * 用於 ch52(AI設計)/ch53(影片)/ch56(虛擬IP) 等生圖章。
 */

type Slot = { key: string; label: string; hint: string; chips: { v: string; note: string }[] };

const SLOTS: Slot[] = [
  { key: "subject", label: "主體", hint: "先講最重要的、放最前面", chips: [
    { v: "a cozy coffee shop interior", note: "主體越具體，AI 越不會亂猜" },
    { v: "a fantasy elf warrior with silver hair", note: "角色細節（頭髮/特徵）要早寫，AI 容易漏" },
    { v: "a minimalist product photo of a watch", note: "商品照講清楚物件" },
  ]},
  { key: "style", label: "風格", hint: "決定整體調性、別一次堆太多", chips: [
    { v: "photorealistic", note: "照片級寫實" },
    { v: "anime style, Studio Ghibli", note: "加具體作品名＝像給參考圖一樣精準" },
    { v: "cinematic", note: "電影感、大片既視感" },
  ]},
  { key: "light", label: "光線", hint: "光線＝情緒的一半", chips: [
    { v: "soft morning light", note: "柔和、溫暖、舒服" },
    { v: "golden hour lighting", note: "日落橘金光、新手開掛組合" },
    { v: "dramatic lighting", note: "高對比、張力大" },
  ]},
  { key: "shot", label: "構圖 / 鏡頭", hint: "對應真實相機、AI 學過", chips: [
    { v: "shallow depth of field, bokeh", note: "背景虛化、主體清晰" },
    { v: "wide angle", note: "廣角、環境感強" },
    { v: "aerial view", note: "俯瞰/空拍視角" },
  ]},
  { key: "quality", label: "品質", hint: "結尾定成品類型", chips: [
    { v: "8k, high detail", note: "高解析、細節多" },
    { v: "editorial photography", note: "雜誌級專業感" },
  ]},
  { key: "ar", label: "比例", hint: "先定比例、別生完再裁", chips: [
    { v: "--ar 1:1", note: "方形、社群頭貼" },
    { v: "--ar 16:9", note: "寬螢幕、影片縮圖" },
    { v: "--ar 9:16", note: "手機直式、IG Story" },
  ]},
];

export function PromptBuilder({ title, note }: { title?: string; note?: string }) {
  const [sel, setSel] = useState<Record<string, string | null>>({});
  const [copied, setCopied] = useState(false);

  const toggle = (slot: string, v: string) => setSel((s) => ({ ...s, [slot]: s[slot] === v ? null : v }));

  // 依 SLOTS 順序組 prompt（--ar 一定在最後）
  const parts = SLOTS.filter((s) => s.key !== "ar").map((s) => sel[s.key]).filter(Boolean);
  const ar = sel["ar"];
  const prompt = [parts.join(", "), ar].filter(Boolean).join(" ");
  const filled = parts.length + (ar ? 1 : 0);

  const copy = async () => { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-elevated">
        <div className="text-sm font-semibold flex items-center gap-1.5">🎨 {title ?? "圖像 Prompt 積木"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 積木槽 */}
      <div className="p-3 space-y-2.5">
        {SLOTS.map((slot) => (
          <div key={slot.key}>
            <div className="text-[11px] font-mono text-fg-muted mb-1">{slot.label} <span className="text-fg-muted/60">· {slot.hint}</span></div>
            <div className="flex flex-wrap gap-1.5">
              {slot.chips.map((c) => (
                <button key={c.v} onClick={() => toggle(slot.key, c.v)} title={c.note}
                  className={`text-[11px] px-2 py-1 rounded-full border transition ${sel[slot.key] === c.v ? "bg-accent text-black border-accent font-semibold" : "bg-bg border-border text-fg-muted hover:border-accent"}`}>
                  {c.v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 組好的 prompt */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-fg-muted">組好的 prompt（{filled} 個零件）：</span>
          <div className="flex gap-1">
            <button onClick={() => setSel({})} className="text-[11px] px-2 py-0.5 rounded bg-bg-elevated text-fg-muted hover:text-accent inline-flex items-center gap-1"><RotateCcw size={11} /> 清空</button>
            <button onClick={copy} disabled={!prompt} className="text-[11px] px-2 py-0.5 rounded bg-bg-elevated text-fg-muted hover:text-accent disabled:opacity-40 inline-flex items-center gap-1">{copied ? <><Check size={11} className="text-accent" /> 已複製</> : <><Copy size={11} /> 複製</>}</button>
          </div>
        </div>
        <div className="rounded-lg bg-[#0d1117] border border-white/10 p-3 min-h-[52px]">
          <code className="text-[12px] leading-relaxed text-[#c9d1d9] font-mono break-words">{prompt || "點上面的積木、把 prompt 組起來（主體 → 風格 → 光線 → 構圖 → 品質 → 比例）"}</code>
        </div>
        <div className="text-[10px] text-fg-muted mt-1.5">
          {filled === 0 ? "先點一個「主體」開始。" : filled < 3 ? "再加風格和光線，畫面會立刻不一樣。" : "夠具體了！把這串貼進 Midjourney/DALL-E 就能出圖。想更穩就再補構圖和品質。"}
        </div>
      </div>
    </div>
  );
}
