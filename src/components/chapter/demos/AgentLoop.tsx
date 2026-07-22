"use client";
import { useMemo, useState } from "react";
import { Brain, Wrench, Eye, Flag, RotateCcw, Play, FastForward } from "lucide-react";

/**
 * Agent Loop 視覺化 — 一步步「看 Agent 想事情」。
 * 把一段 ReAct trace 拆成 Thought(想) → Action(做/呼叫工具) → Observation(看結果) 的節奏，
 * 按「下一步」逐格揭曉，最後給 Final Answer。教 49.3 ReAct / 49.6 Agent Loop 的核心節奏。
 * config：{ task:string, steps:[{thought, action, observation}], answer:string }
 * RWD：純垂直時間軸、break-words、按鈕列 flex-wrap、無寫死寬；亮暗用 design token。
 */
type Step = { thought: string; action: string; observation: string };
type Cfg = { task: string; steps: Step[]; answer: string };
type Phase =
  | { kind: "thought"; text: string; iter: number }
  | { kind: "action"; text: string; iter: number }
  | { kind: "observation"; text: string; iter: number }
  | { kind: "answer"; text: string; iter: number };

const META = {
  thought: { icon: Brain, label: "Thought · 想", cls: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500", bg: "bg-sky-500/10" },
  action: { icon: Wrench, label: "Action · 做", cls: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", bg: "bg-amber-500/10" },
  observation: { icon: Eye, label: "Observation · 看", cls: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", bg: "bg-emerald-500/10" },
  answer: { icon: Flag, label: "Final Answer · 答", cls: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500", bg: "bg-violet-500/10" },
} as const;

export function AgentLoop({ title, note, config }: { title?: string; note?: string; config?: Record<string, unknown> }) {
  const cfg = config as unknown as Cfg | undefined;

  const phases = useMemo<Phase[]>(() => {
    if (!cfg?.steps?.length) return [];
    const out: Phase[] = [];
    cfg.steps.forEach((s, i) => {
      out.push({ kind: "thought", text: s.thought, iter: i + 1 });
      out.push({ kind: "action", text: s.action, iter: i + 1 });
      out.push({ kind: "observation", text: s.observation, iter: i + 1 });
    });
    out.push({ kind: "answer", text: cfg.answer, iter: cfg.steps.length });
    return out;
  }, [cfg]);

  const [shown, setShown] = useState(0);
  if (!cfg?.steps?.length) return null;
  const done = shown >= phases.length;

  return (
    <div className="demo-glass overflow-hidden">
      <div className="px-3 py-2 demo-glass-head">
        <div className="text-sm font-semibold flex items-center gap-1.5">🔁 {title ?? "Agent Loop 逐步跑一次"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 任務 */}
      <div className="px-3 pt-3">
        <div className="rounded-lg border border-border bg-bg p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-fg-muted mb-0.5">任務 Goal</div>
          <p className="text-xs leading-relaxed break-words">{cfg.task}</p>
        </div>
      </div>

      {/* 時間軸 */}
      <div className="p-3 space-y-2">
        {phases.slice(0, shown).map((p, i) => {
          const m = META[p.kind];
          const Icon = m.icon;
          const prev = i > 0 ? phases[i - 1] : undefined;
          const loopBack = p.kind === "thought" && prev?.kind === "observation";
          return (
            <div key={i}>
              {loopBack && (
                <div className="flex items-center gap-1.5 text-[10px] text-fg-muted pl-1 py-0.5">
                  <RotateCcw size={11} /> 回到思考 — 第 {p.iter} 輪
                </div>
              )}
              <div className={`rounded-lg ${m.bg} border border-border p-2.5`}>
                <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${m.cls}`}>
                  <Icon size={13} /> {m.label}
                  {p.kind !== "answer" && <span className="text-fg-muted font-normal">· 第 {p.iter} 輪</span>}
                </div>
                <p className={`text-xs leading-relaxed mt-1 break-words ${p.kind === "action" ? "font-mono text-[11px]" : ""}`}>{p.text}</p>
              </div>
            </div>
          );
        })}
        {shown === 0 && (
          <div className="text-center text-xs text-fg-muted py-4">按「下一步」看 Agent 一步步想、做、看結果 →</div>
        )}
      </div>

      {/* 控制列 */}
      <div className="px-3 pb-3 flex flex-wrap items-center gap-2">
        {!done ? (
          <>
            <button onClick={() => setShown((s) => Math.min(s + 1, phases.length))}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white font-semibold inline-flex items-center gap-1 hover:opacity-90 transition">
              <Play size={12} /> 下一步
            </button>
            <button onClick={() => setShown(phases.length)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-fg-muted inline-flex items-center gap-1 hover:border-accent transition">
              <FastForward size={12} /> 全部跑完
            </button>
            <span className="text-[11px] text-fg-muted tabular-nums">{shown}/{phases.length}</span>
          </>
        ) : (
          <>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1"><Flag size={12} /> 完成，共 {cfg.steps.length} 輪 Thought→Action→Observation</span>
            <button onClick={() => setShown(0)} className="text-[11px] text-accent inline-flex items-center gap-1 hover:underline"><RotateCcw size={11} /> 再看一次</button>
          </>
        )}
      </div>
    </div>
  );
}
