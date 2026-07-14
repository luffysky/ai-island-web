"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Link2, Loader2, Search, TrendingUp, Target, Compass, ArrowLeft } from "lucide-react";

type Skill = { name: string; level: number; evidence: string };
type Result = {
  summary: string; roles: string[]; skills: Skill[];
  strengths: string[]; gaps: string[]; directions: string[];
  opportunityKeywords: string[]; sourceUrl?: string; sourceTitle?: string;
};

const LEVEL_LABEL = ["", "入門", "略懂", "熟練", "擅長", "精通"];

export function AnalyzeWorkClient() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    setErr("");
    if (!url.trim() && text.trim().replace(/\s/g, "").length < 20) { setErr("貼上作品網址，或多寫一點專案/履歷內容"); return; }
    setBusy(true); setResult(null);
    try {
      const r = await fetch("/api/opportunities/analyze-work", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() || undefined, text: text.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "分析失敗"); return; }
      setResult(d.result);
    } catch { setErr("連線失敗，稍後再試"); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href={"/opportunities" as any} className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent mb-4"><ArrowLeft size={15} /> 回機會島</Link>
      <h1 className="text-2xl sm:text-3xl font-bold inline-flex items-center gap-2"><Sparkles className="text-accent" /> AI 作品分析</h1>
      <p className="text-sm text-fg-muted mt-1.5 mb-5">貼上你的作品集/GitHub/個人網站網址，或直接貼履歷/專案說明——AI 幫你萃取<b className="text-fg">能力圖譜</b>，找到適合的機會方向。</p>

      {/* 輸入 */}
      <div className="surface-glass rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-xs text-fg-muted mb-1 flex items-center gap-1"><Link2 size={13} /> 作品/個人網址（選填）</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/你的帳號 或 你的作品集網址"
            className="w-full rounded-xl border border-border bg-bg/40 px-3 py-2 text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-xs text-fg-muted mb-1 block">或直接貼內容（履歷/專案說明，選填）</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="例：我做過一個用 React + Supabase 的訂位系統，負責前端與資料庫設計…"
            className="w-full resize-y rounded-xl border border-border bg-bg/40 px-3 py-2 text-sm outline-none focus:border-accent" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-fg-dim">只做唯讀分析、不會存你的內容。</span>
          <button onClick={run} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-accent text-accent-contrast px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {busy ? "分析中…" : "開始分析"}
          </button>
        </div>
        {err && <div className="text-xs text-rose-500">{err}</div>}
      </div>

      {/* 結果：能力圖譜 */}
      {result && (
        <div className="mt-6 space-y-5">
          <section className="surface-glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {result.roles.map((r) => <span key={r} className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/12 text-accent">{r}</span>)}
            </div>
            <p className="text-sm leading-relaxed">{result.summary}</p>
            {result.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-accent-2 hover:underline mt-2 inline-block break-all">🔗 {result.sourceTitle || result.sourceUrl}</a>}
          </section>

          {result.skills.length > 0 && (
            <section className="surface-glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold mb-3">能力圖譜</h2>
              <div className="space-y-2.5">
                {result.skills.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{s.name}</span>
                      <span className="text-[11px] text-fg-muted shrink-0">{LEVEL_LABEL[s.level]}</span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${s.level * 20}%` }} />
                    </div>
                    {s.evidence && <p className="text-[11px] text-fg-dim mt-1 line-clamp-1">{s.evidence}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {result.strengths.length > 0 && (
              <section className="surface-glass rounded-2xl p-4">
                <h2 className="text-sm font-semibold mb-2 inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><TrendingUp size={15} /> 優勢</h2>
                <ul className="space-y-1.5">{result.strengths.map((s, i) => <li key={i} className="text-xs flex gap-1.5"><span className="text-emerald-500">✓</span><span>{s}</span></li>)}</ul>
              </section>
            )}
            {result.gaps.length > 0 && (
              <section className="surface-glass rounded-2xl p-4">
                <h2 className="text-sm font-semibold mb-2 inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400"><Target size={15} /> 可補強</h2>
                <ul className="space-y-1.5">{result.gaps.map((s, i) => <li key={i} className="text-xs flex gap-1.5"><span className="text-amber-500">•</span><span>{s}</span></li>)}</ul>
              </section>
            )}
          </div>

          {result.directions.length > 0 && (
            <section className="surface-glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold mb-2 inline-flex items-center gap-1.5"><Compass size={15} className="text-accent-3" /> 適合你去試的方向</h2>
              <div className="flex flex-wrap gap-1.5">{result.directions.map((d) => <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-accent-3/12 text-accent-3">{d}</span>)}</div>
            </section>
          )}

          {result.opportunityKeywords.length > 0 && (
            <section className="surface-glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold mb-2 inline-flex items-center gap-1.5"><Search size={15} className="text-accent-2" /> 用這些關鍵字找機會</h2>
              <div className="flex flex-wrap gap-1.5">
                {result.opportunityKeywords.map((k) => (
                  <Link key={k} href={`/opportunities?q=${encodeURIComponent(k)}` as any} className="text-xs px-2.5 py-1 rounded-full border border-accent-2/40 text-accent-2 hover:bg-accent-2/10 transition">
                    {k} →
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
