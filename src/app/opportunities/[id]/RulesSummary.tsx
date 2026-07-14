"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Loader2, ClipboardPaste, ChevronDown, ChevronUp, Link2 } from "lucide-react";

// AI 讀規則：把落落長的規則整理成結構化重點。可讀本筆資料、貼規則全文、或貼簡章網址/PDF 連結自動抓取解析。
export function RulesSummary({ id, hasOwnData }: { id: string; hasOwnData: boolean }) {
  const [open, setOpen] = useState(false);
  const [showPaste, setShowPaste] = useState(!hasOwnData);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [err, setErr] = useState("");

  const run = async () => {
    if (loading) return;
    setLoading(true); setErr(""); setSummary("");
    try {
      const r = await fetch(`/api/opportunities/${id}/rules-summary`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() || undefined, url: url.trim() || undefined }),
      });
      const d = await r.json();
      if (r.status === 401) { window.location.href = `/login?next=/opportunities/${id}`; return; }
      if (!r.ok) { setErr(d.error ?? "整理失敗"); return; }
      setSummary(d.summary ?? "");
    } catch { setErr("連線失敗，稍後再試"); } finally { setLoading(false); }
  };

  return (
    <div className="mt-6 rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400">
        <Sparkles className="w-4 h-4" /> AI 幫我讀規則、整理重點
        <span className="ml-auto text-xs text-black/40 dark:text-white/40 inline-flex items-center gap-1">{open ? <>收起 <ChevronUp className="w-3.5 h-3.5" /></> : <>展開 <ChevronDown className="w-3.5 h-3.5" /></>}</span>
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-xs text-black/55 dark:text-white/55 mb-2">
            {hasOwnData ? "直接整理這頁的資料；" : ""}或貼<b>簡章網址／PDF 連結</b>讓 AI 自動抓取解析，抓出資格／文件／日期／獎金／評分重點與該注意的坑。
          </p>

          {/* 簡章網址 / PDF 連結 → 自動抓取解析 */}
          <div className="flex items-center gap-1.5 mb-2">
            <Link2 className="w-3.5 h-3.5 text-black/40 dark:text-white/40 shrink-0" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="貼簡章／規則的網址或 PDF 連結（選填、自動解析）"
              className="flex-1 bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-violet-500" />
          </div>

          {!showPaste && (
            <button onClick={() => setShowPaste(true)} className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline mb-2">
              <ClipboardPaste className="w-3.5 h-3.5" /> 貼上官網規則全文（更準）
            </button>
          )}
          {showPaste && (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
              placeholder="把官網／簡章的規則全文貼這裡（可留空＝只讀這頁資料）"
              className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl p-2.5 text-sm outline-none focus:border-violet-500 resize-none mb-2" />
          )}

          <div className="flex justify-end">
            <button onClick={run} disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-3.5 py-1.5 text-sm font-medium">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {summary ? "重新整理" : "開始整理"}
            </button>
          </div>

          {err && <p className="text-xs text-rose-500 mt-2">{err}</p>}
          {summary && (
            <div className="mt-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 p-3 text-sm prose-sm max-w-none [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:my-1 [&_li]:my-0.5 [&_p]:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
              <p className="text-[11px] text-black/40 dark:text-white/40 mt-3 not-prose">AI 整理僅供參考、可能有誤，報名前請以官方公告為準。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
