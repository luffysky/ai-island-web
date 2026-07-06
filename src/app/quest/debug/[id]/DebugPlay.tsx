"use client";

import Link from "next/link";
import { useState } from "react";
import { usePyodide } from "@/hooks/usePyodide";
import type { DebugLevel } from "@/lib/quest/debug-levels";
import { TRACE_GUARD, codeLines, starsFor, submitCompletion, shortErr, sfx } from "@/lib/quest/engine";
import { ArrowLeft, Play, RotateCcw, Lightbulb, Loader2, Sparkles, Bug } from "lucide-react";

export function DebugPlay({ level, done }: { level: DebugLevel; done: { stars: number } | null }) {
  const { status, run } = usePyodide(true);
  const [code, setCode] = useState(level.buggy);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [stars, setStars] = useState(done?.stars ?? 0);
  const [reward, setReward] = useState<{ xp: number; z: number } | null>(null);
  const [showHint, setShowHint] = useState(false);

  async function runCode() {
    if (running) return;
    setRunning(true); setMsg(null); setReward(null);
    try {
      const full = `${TRACE_GUARD}${code}\n${level.tests}\nprint("__ALLPASS__")`;
      const r = await run(full);
      if (r.ok && r.stdout.includes("__ALLPASS__")) {
        const s = starsFor(codeLines(code), level.parLines); setStars(s); sfx("win");
        setMsg({ type: "ok", text: `全部測試通過！🐛→✅ ⭐ ${s} 星` });
        const aw = await submitCompletion(level.id, s); if (aw) setReward(aw);
      } else {
        sfx("fail");
        const err = shortErr(r.stderr);
        setMsg({ type: "err", text: err.includes("AssertionError") || /assert/i.test(err) ? "還有測試沒過，再找找 bug 🐛" : err });
      }
    } catch (e: any) { setMsg({ type: "err", text: e?.message ?? "執行失敗" }); }
    finally { setRunning(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <Link href="/quest" className="text-sm text-fg-muted hover:text-fg inline-flex items-center gap-1"><ArrowLeft size={14} /> 副本地圖</Link>
        <div className="text-xs text-fg-muted">觀念：<b className="text-accent">{level.concept}</b>{level.chapterHref && <> · <Link href={level.chapterHref} className="hover:text-accent underline">複習章節</Link></>}</div>
      </div>
      <h1 className="text-xl font-bold inline-flex items-center gap-1.5"><Bug size={20} className="text-emerald-500" /> {level.title} {stars > 0 && <span className="text-amber-400">{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>}</h1>
      <p className="text-sm text-fg-muted mt-1 mb-3">{level.intro}</p>

      <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={8}
        className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-accent resize-none" />
      <div className="mt-2">
        <div className="text-[11px] text-fg-muted mb-1">要通過的測試（不用改這裡）</div>
        <pre className="bg-bg-card border border-border rounded-xl p-3 text-xs overflow-x-auto text-fg-muted">{level.tests}</pre>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-2">
        <button onClick={runCode} disabled={running || status !== "ready"} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-black font-bold disabled:opacity-40">
          {status !== "ready" ? <><Loader2 size={16} className="animate-spin" /> 載入 Python…</> : running ? <><Loader2 size={16} className="animate-spin" /> 測試中</> : <><Play size={16} /> 跑測試</>}
        </button>
        <button onClick={() => { setCode(level.buggy); setMsg(null); }} className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-border text-sm text-fg-muted hover:text-fg"><RotateCcw size={14} /> 還原</button>
        <button onClick={() => setShowHint((v) => !v)} className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-border text-sm text-amber-500 hover:text-amber-400"><Lightbulb size={14} /> 提示</button>
      </div>

      {showHint && <div className="text-xs bg-amber-400/10 border border-amber-400/25 rounded-xl p-3 whitespace-pre-wrap mt-2"><b className="inline-flex items-center gap-1"><Sparkles size={12} /> Debug 老爹提示</b>{"\n"}{level.hint}</div>}
      {msg && <div className={`text-sm rounded-xl px-3 py-2 mt-2 whitespace-pre-wrap ${msg.type === "ok" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300" : "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300"}`}>{msg.text}</div>}
      {reward && <div className="text-sm bg-gradient-to-r from-amber-400/15 to-yellow-400/10 border border-amber-400/30 rounded-xl px-3 py-2 mt-2 font-bold">🎁 首次通關獎勵：+{reward.xp} XP · +{reward.z} Z 幣</div>}
    </div>
  );
}
