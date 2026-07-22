"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PenLine, ArrowRight, Sparkles } from "lucide-react";

/**
 * 寫作工作室 — 非程式（寫作/創作）章的「動手練」道具：
 * 真的能打字的 TipTap 編輯器 + 即時字數統計 + 一鍵引導去部落格發表。
 * 「玩了就懂」：邊學邊寫、看到成果，再導流到部落格真的發出去。
 * config：{ prompt?, placeholder?, starter? }（都可省、有預設）。
 */
const BlogEditor = dynamic(() => import("@/components/blog/BlogEditor").then((m) => m.BlogEditor), {
  ssr: false,
  loading: () => <div className="text-xs text-fg-muted p-4">載入編輯器…</div>,
});

type Cfg = { prompt?: string; placeholder?: string; starter?: string };

export function WritingStudio({ title, note, config }: { title?: string; note?: string; config?: Record<string, unknown> }) {
  const cfg = (config ?? {}) as Cfg;
  const [html, setHtml] = useState(cfg.starter ?? "");
  const chars = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length;

  return (
    <div className="demo-glass overflow-hidden">
      <div className="px-3 py-2 demo-glass-head">
        <div className="text-sm font-semibold flex items-center gap-1.5"><PenLine size={15} /> {title ?? "寫作工作室 · 動手練"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      <div className="p-3 space-y-2.5">
        {cfg.prompt && (
          <div className="flex items-start gap-2 rounded-lg bg-accent/10 border border-accent/20 px-2.5 py-2">
            <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-fg leading-relaxed">{cfg.prompt}</p>
          </div>
        )}

        <div className="rounded-lg border border-border overflow-hidden max-h-[55vh] overflow-y-auto">
          <BlogEditor content={html} onChange={setHtml} placeholder={cfg.placeholder ?? "在這裡開始寫…（輸入 / 叫出指令選單，可貼圖）"} />
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] text-fg-muted tabular-nums">{chars} 字</span>
          <Link
            href={"/me/blog/new" as any}
            className="inline-flex items-center gap-1.5 text-xs rounded-full bg-accent text-black font-semibold px-3 py-1.5 hover:scale-105 transition"
          >
            寫好了？發表到部落格 <ArrowRight size={13} />
          </Link>
        </div>
        <p className="text-[11px] text-fg-muted">＊這裡是練習區，內容不會自動存；滿意了就點右邊去部落格正式發表、建立你的作品集。</p>
      </div>
    </div>
  );
}
