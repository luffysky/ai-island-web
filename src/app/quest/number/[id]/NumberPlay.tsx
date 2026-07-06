"use client";

import { useState } from "react";
import { usePyodide } from "@/hooks/usePyodide";
import type { NumberLevel } from "@/lib/quest/number-levels";
import { TRACE_GUARD, codeLines, starsFor, submitCompletion, shortErr, sfx } from "@/lib/quest/engine";
import { QuestShell, QS } from "../../QuestShell";
import { Play, RotateCcw, Lightbulb, Loader2, Sparkles } from "lucide-react";

const norm = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "").trim();

export function NumberPlay({ level, done }: { level: NumberLevel; done: { stars: number } | null }) {
  const { status, run } = usePyodide(true);
  const [code, setCode] = useState(level.starter);
  const [out, setOut] = useState("");
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [stars, setStars] = useState(done?.stars ?? 0);
  const [reward, setReward] = useState<{ xp: number; z: number } | null>(null);
  const [showHint, setShowHint] = useState(false);

  async function runCode() {
    if (running) return;
    setRunning(true); setMsg(null); setReward(null);
    try {
      const r = await run(TRACE_GUARD + code);
      setOut(r.stdout.trim());
      if (!r.ok) { setMsg({ type: "err", text: shortErr(r.stderr) }); sfx("fail"); setRunning(false); return; }
      if (norm(r.stdout) === norm(level.expect)) {
        const s = starsFor(codeLines(code), level.parLines); setStars(s); sfx("win");
        setMsg({ type: "ok", text: `答對了！⭐ ${s} 星（${codeLines(code)} 行）` });
        const aw = await submitCompletion(level.id, s); if (aw) setReward(aw);
      } else { setMsg({ type: "err", text: "輸出跟答案不一樣，再檢查看看 🤔" }); sfx("fail"); }
    } catch (e: any) { setMsg({ type: "err", text: e?.message ?? "執行失敗" }); }
    finally { setRunning(false); }
  }

  return (
    <QuestShell title={level.title} concept={level.concept} chapterHref={level.chapterHref} stars={stars} intro={level.intro}>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={9} className={QS.editor} />
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <button onClick={runCode} disabled={running || status !== "ready"} className={QS.runBtn}>
          {status !== "ready" ? <><Loader2 size={16} className="animate-spin" /> 載入 Python…</> : running ? <><Loader2 size={16} className="animate-spin" /> 執行中</> : <><Play size={16} /> 執行</>}
        </button>
        <button onClick={() => { setCode(level.starter); setMsg(null); setOut(""); }} className={QS.ghostBtn}><RotateCcw size={14} /> 重來</button>
        <button onClick={() => setShowHint((v) => !v)} className={`${QS.ghostBtn} !text-amber-400`}><Lightbulb size={14} /> 提示</button>
      </div>
      {showHint && <div className={`${QS.hint} mt-2`}><b className="inline-flex items-center gap-1"><Sparkles size={12} /> 綠寶提示</b>{"\n"}{level.hint}</div>}
      {out !== "" && <div className="mt-2"><div className="text-[11px] text-slate-400 mb-1">輸出</div><pre className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs overflow-x-auto max-h-48 text-slate-200">{out}</pre></div>}
      {msg && <div className={`text-sm rounded-xl px-3 py-2 mt-2 ${msg.type === "ok" ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200" : "bg-red-500/15 border border-red-400/40 text-red-200"}`}>{msg.text}</div>}
      {reward && <div className="text-sm bg-gradient-to-r from-amber-400/20 to-yellow-400/10 border border-amber-400/40 rounded-xl px-3 py-2 mt-2 font-bold text-amber-100">🎁 首次通關獎勵：+{reward.xp} XP · +{reward.z} Z 幣</div>}
    </QuestShell>
  );
}
