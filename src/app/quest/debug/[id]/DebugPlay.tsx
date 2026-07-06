"use client";

import { useState } from "react";
import { usePyodide } from "@/hooks/usePyodide";
import type { DebugLevel } from "@/lib/quest/debug-levels";
import { TRACE_GUARD, codeLines, starsFor, submitCompletion, shortErr, sfx } from "@/lib/quest/engine";
import { QuestShell, QS } from "../../QuestShell";
import { Play, RotateCcw, Lightbulb, Loader2, Sparkles } from "lucide-react";

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
    <QuestShell title={level.title} concept={level.concept} chapterHref={level.chapterHref} stars={stars} intro={level.intro}>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={8} className={QS.editor} />
      <div className="mt-2">
        <div className="text-[11px] text-slate-400 mb-1">要通過的測試（不用改這裡）</div>
        <pre className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs overflow-x-auto text-slate-300">{level.tests}</pre>
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <button onClick={runCode} disabled={running || status !== "ready"} className={QS.runBtn}>
          {status !== "ready" ? <><Loader2 size={16} className="animate-spin" /> 載入 Python…</> : running ? <><Loader2 size={16} className="animate-spin" /> 測試中</> : <><Play size={16} /> 跑測試</>}
        </button>
        <button onClick={() => { setCode(level.buggy); setMsg(null); }} className={QS.ghostBtn}><RotateCcw size={14} /> 還原</button>
        <button onClick={() => setShowHint((v) => !v)} className={`${QS.ghostBtn} !text-amber-400`}><Lightbulb size={14} /> 提示</button>
      </div>
      {showHint && <div className={`${QS.hint} mt-2`}><b className="inline-flex items-center gap-1"><Sparkles size={12} /> Debug 老爹提示</b>{"\n"}{level.hint}</div>}
      {msg && <div className={`text-sm rounded-xl px-3 py-2 mt-2 whitespace-pre-wrap ${msg.type === "ok" ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200" : "bg-red-500/15 border border-red-400/40 text-red-200"}`}>{msg.text}</div>}
      {reward && <div className="text-sm bg-gradient-to-r from-amber-400/20 to-yellow-400/10 border border-amber-400/40 rounded-xl px-3 py-2 mt-2 font-bold text-amber-100">🎁 首次通關獎勵：+{reward.xp} XP · +{reward.z} Z 幣</div>}
    </QuestShell>
  );
}
