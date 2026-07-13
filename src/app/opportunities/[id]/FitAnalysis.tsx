"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Target, Loader2, ChevronDown, ChevronUp } from "lucide-react";

// AI 缺件／適合度分析：使用者描述自己 → AI 對照活動需求，講適不適合、缺什麼、怎麼補。
export function FitAnalysis({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [err, setErr] = useState("");

  const run = async () => {
    if (loading || !about.trim()) { if (!about.trim()) setErr("先描述你的作品／身分／目標"); return; }
    setLoading(true); setErr(""); setAnalysis("");
    try {
      const r = await fetch(`/api/opportunities/${id}/fit-analysis`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about: about.trim() }),
      });
      const d = await r.json();
      if (r.status === 401) { window.location.href = `/login?next=/opportunities/${id}`; return; }
      if (!r.ok) { setErr(d.error ?? "分析失敗"); return; }
      setAnalysis(d.analysis ?? "");
    } catch { setErr("連線失敗，稍後再試"); } finally { setLoading(false); }
  };

  return (
    <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        <Target className="w-4 h-4" /> AI 分析我適不適合、缺什麼
        <span className="ml-auto text-xs text-black/40 dark:text-white/40 inline-flex items-center gap-1">{open ? <>收起 <ChevronUp className="w-3.5 h-3.5" /></> : <>展開 <ChevronDown className="w-3.5 h-3.5" /></>}</span>
      </button>

      {open && (
        <div className="mt-3">
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3}
            placeholder="用一兩句描述你：作品／身分／完成度／目標。例：我是大二學生，做了一個 AI 學習網站有 Demo，還沒有商業計畫。"
            className="w-full bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-500 resize-none mb-2" />
          <div className="flex justify-end">
            <button onClick={run} disabled={loading || !about.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3.5 py-1.5 text-sm font-medium">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />} {analysis ? "重新分析" : "開始分析"}
            </button>
          </div>
          {err && <p className="text-xs text-rose-500 mt-2">{err}</p>}
          {analysis && (
            <div className="mt-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 p-3 text-sm prose-sm max-w-none [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:my-1 [&_li]:my-0.5 [&_p]:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
              <p className="text-[11px] text-black/40 dark:text-white/40 mt-3 not-prose">適合度為 AI 參考、不代表結果；一切以主辦單位審核為準。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
