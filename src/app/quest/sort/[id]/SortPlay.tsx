"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePyodide } from "@/hooks/usePyodide";
import type { SortLevel } from "@/lib/quest/sort-levels";
import { TRACE_GUARD, codeLines, starsFor, submitCompletion, shortErr, sfx } from "@/lib/quest/engine";
import { QuestShell, QS } from "../../QuestShell";
import { Play, RotateCcw, Lightbulb, Loader2, Sparkles } from "lucide-react";

const eq = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function SortPlay({ level, done }: { level: SortLevel; done: { stars: number } | null }) {
  const t = useTranslations("quest");
  const { status, run } = usePyodide(true);
  const [code, setCode] = useState(level.starter);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [stars, setStars] = useState(done?.stars ?? 0);
  const [reward, setReward] = useState<{ xp: number; z: number } | null>(null);
  const [showHint, setShowHint] = useState(false);

  // 動畫：frames = [初始, ...每步狀態]，逐幀顯示
  const [frames, setFrames] = useState<number[][]>([level.input]);
  const [frameIdx, setFrameIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopAnim = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  useEffect(() => () => stopAnim(), []);

  const expected = [...level.input].sort((a, b) => (level.order === "asc" ? a - b : b - a));
  const maxVal = Math.max(...level.input, 1);
  const view = frames[Math.min(frameIdx, frames.length - 1)] ?? level.input;

  function animate(states: number[][]) {
    stopAnim();
    const seq = [level.input, ...states];
    setFrames(seq);
    setFrameIdx(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      if (i >= seq.length) { stopAnim(); return; }
      setFrameIdx(i);
    }, 550);
  }

  async function runCode() {
    if (running) return;
    stopAnim();
    setRunning(true); setMsg(null); setReward(null);
    const preamble = `import json\nnums = ${JSON.stringify(level.input)}\ndef show(a):\n    print("__STEP__" + json.dumps(list(a)))\n`;
    try {
      const r = await run(TRACE_GUARD + preamble + code);
      if (!r.ok) { setMsg({ type: "err", text: shortErr(r.stderr) }); sfx("fail"); setRunning(false); return; }
      const states: number[][] = [];
      for (const line of r.stdout.split("\n")) {
        if (line.startsWith("__STEP__")) {
          try { const arr = JSON.parse(line.slice("__STEP__".length)); if (Array.isArray(arr)) states.push(arr.map(Number)); } catch { /* skip */ }
        }
      }
      if (states.length === 0) {
        setMsg({ type: "err", text: t("noShowCalls") });
        sfx("fail"); setRunning(false); return;
      }
      animate(states);
      const last = states[states.length - 1];
      if (eq(last, expected)) {
        const s = starsFor(codeLines(code), level.parLines); setStars(s); sfx("win");
        setMsg({ type: "ok", text: t("winSort", { stars: s, lines: codeLines(code), steps: states.length }) });
        const aw = await submitCompletion(level.id, s); if (aw) setReward(aw);
      } else {
        setMsg({ type: "err", text: t("sortWrong", { target: expected.join(", ") }) });
        sfx("fail");
      }
    } catch (e: any) { setMsg({ type: "err", text: e?.message ?? t("runFailed") }); }
    finally { setRunning(false); }
  }

  return (
    <QuestShell title={level.title} concept={level.concept} chapterHref={level.chapterHref} stars={stars} intro={level.intro}>
      {/* 長條視覺化 */}
      <div className={`${QS.panel} p-4 mb-3`}>
        <div className="flex items-end justify-center gap-1.5 h-44">
          {view.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-1" style={{ width: `${Math.max(18, 320 / view.length)}px` }}>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-teal-300 transition-all duration-500 ease-out"
                style={{ height: `${(v / maxVal) * 100}%` }}
                title={String(v)}
              />
              <span className="text-[10px] text-slate-400 tabular-nums">{v}</span>
            </div>
          ))}
        </div>
        <div className="text-center text-[11px] text-slate-400 mt-2">
          {t("sortTargetLabel", { order: level.order === "asc" ? t("orderAsc") : t("orderDesc") })}<span className="text-emerald-300 tabular-nums">[{expected.join(", ")}]</span>
          {frames.length > 1 && <span className="ml-2">{t("stepCounter", { cur: Math.min(frameIdx, frames.length - 1), total: frames.length - 1 })}</span>}
        </div>
      </div>

      <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={9} className={QS.editor} />
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <button onClick={runCode} disabled={running || status !== "ready"} className={QS.runBtn}>
          {status !== "ready" ? <><Loader2 size={16} className="animate-spin" /> {t("loadingPython")}</> : running ? <><Loader2 size={16} className="animate-spin" /> {t("running")}</> : <><Play size={16} /> {t("run")}</>}
        </button>
        <button onClick={() => { stopAnim(); setCode(level.starter); setMsg(null); setFrames([level.input]); setFrameIdx(0); }} className={QS.ghostBtn}><RotateCcw size={14} /> {t("reset")}</button>
        <button onClick={() => setShowHint((v) => !v)} className={`${QS.ghostBtn} !text-amber-400`}><Lightbulb size={14} /> {t("hint")}</button>
      </div>
      {showHint && <div className={`${QS.hint} mt-2`}><b className="inline-flex items-center gap-1"><Sparkles size={12} /> {t("greenGemHint")}</b>{"\n"}{level.hint}</div>}
      {msg && <div className={`text-sm rounded-xl px-3 py-2 mt-2 ${msg.type === "ok" ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200" : "bg-red-500/15 border border-red-400/40 text-red-200"}`}>{msg.text}</div>}
      {reward && <div className="text-sm bg-gradient-to-r from-amber-400/20 to-yellow-400/10 border border-amber-400/40 rounded-xl px-3 py-2 mt-2 font-bold text-amber-100">{t("reward", { xp: reward.xp, z: reward.z })}</div>}
    </QuestShell>
  );
}
