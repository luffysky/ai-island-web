"use client";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";

/**
 * 情境判斷 — 給一個情境，判「可以 / 有風險 / 不行」，選完揭曉正解 + 為什麼。
 * config 驅動、可複用（法律商用、個資合規、資安、倫理…）。
 * config：{ verdicts?, scenarios:[{ text, correct:'ok'|'risk'|'no', why }] }
 * RWD：按鈕列 flex-wrap、文字 break-words、無寫死寬。
 */
type Verdict = "ok" | "risk" | "no";
type Scenario = { text: string; correct: Verdict; why: string };
type Cfg = { scenarios: Scenario[] };

const V: Record<Verdict, { label: string; cls: string; on: string }> = {
  ok:   { label: "✅ 可以",   cls: "text-green-600 dark:text-green-400", on: "bg-green-500 text-white border-green-500" },
  risk: { label: "⚠️ 有風險", cls: "text-amber-600 dark:text-amber-400", on: "bg-amber-500 text-black border-amber-500" },
  no:   { label: "❌ 不行",   cls: "text-rose-600 dark:text-rose-400",   on: "bg-rose-500 text-white border-rose-500" },
};

export function ScenarioJudge({ title, note, config }: { title?: string; note?: string; config?: Record<string, unknown> }) {
  const cfg = config as unknown as Cfg | undefined;
  const [picks, setPicks] = useState<Record<number, Verdict>>({});
  if (!cfg?.scenarios?.length) return null;
  const scs = cfg.scenarios;
  const answered = Object.keys(picks).length;
  const correct = scs.filter((s, i) => picks[i] === s.correct).length;

  return (
    <div className="demo-glass overflow-hidden">
      <div className="px-3 py-2 demo-glass-head flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold flex items-center gap-1.5">⚖️ {title ?? "情境判斷"}</div>
          {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
        </div>
        {answered > 0 && <span className="text-[11px] text-fg-muted tabular-nums shrink-0">答對 {correct}/{answered}</span>}
      </div>

      <div className="p-3 space-y-3">
        {scs.map((s, i) => {
          const picked = picks[i];
          const revealed = picked !== undefined;
          const isRight = picked === s.correct;
          return (
            <div key={i} className="rounded-lg border border-border bg-bg p-2.5">
              <p className="text-xs leading-relaxed mb-2 break-words">{i + 1}. {s.text}</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(V) as Verdict[]).map((v) => (
                  <button key={v} onClick={() => setPicks((p) => (p[i] !== undefined ? p : { ...p, [i]: v }))}
                    disabled={revealed}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${picked === v ? V[v].on + " font-semibold" : "bg-bg-elevated border-border text-fg-muted"} ${revealed ? "cursor-default" : "hover:border-accent"}`}>
                    {V[v].label}
                  </button>
                ))}
              </div>
              {revealed && (
                <div className={`mt-2 text-[11px] leading-relaxed rounded p-2 break-words ${isRight ? "bg-green-500/10" : "bg-rose-500/10"}`}>
                  <span className="font-semibold inline-flex items-center gap-1">
                    {isRight ? <><Check size={12} className="text-green-500" /> 答對！</> : <>正解是 </>}
                    <span className={V[s.correct].cls}>{V[s.correct].label}</span>
                  </span>
                  <span className="text-fg-muted"> — {s.why}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {answered === scs.length && (
        <div className="px-3 pb-3">
          <button onClick={() => setPicks({})} className="text-[11px] text-accent inline-flex items-center gap-1 hover:underline"><RotateCcw size={11} /> 重新測</button>
        </div>
      )}
    </div>
  );
}
