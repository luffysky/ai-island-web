"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";

/**
 * 決策測驗 — 回答幾題，依加權分數推薦一個「結果」。
 * 完全 config 驅動、可複用（虛擬 IP 類型、職涯方向、工具選型…）。
 * config 形狀：
 * { intro?, questions:[{q, options:[{label, scores:{key:n}}]}], outcomes:{key:{emoji?,title,desc}} }
 */
type Opt = { label: string; scores: Record<string, number> };
type Q = { q: string; options: Opt[] };
type Outcome = { emoji?: string; title: string; desc: string };
type Cfg = { intro?: string; questions: Q[]; outcomes: Record<string, Outcome> };

export function DecisionQuiz({ title, note, config }: { title?: string; note?: string; config?: Record<string, unknown> }) {
  const cfg = config as unknown as Cfg | undefined;
  const [ans, setAns] = useState<Record<number, number>>({});

  if (!cfg?.questions?.length) return null;
  const qs = cfg.questions;
  const answeredCount = Object.keys(ans).length;
  const done = answeredCount === qs.length;

  let result: { key: string; o: Outcome } | null = null;
  if (done) {
    const totals: Record<string, number> = {};
    qs.forEach((q, qi) => {
      const opt = q.options[ans[qi]];
      if (opt) for (const [k, v] of Object.entries(opt.scores)) totals[k] = (totals[k] ?? 0) + v;
    });
    let best: string | null = null;
    for (const k of Object.keys(cfg.outcomes)) if (best === null || (totals[k] ?? 0) > (totals[best] ?? 0)) best = k;
    if (best) result = { key: best, o: cfg.outcomes[best] };
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-elevated flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold flex items-center gap-1.5">🧭 {title ?? "決策測驗"}</div>
          {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
        </div>
        <span className="text-[11px] text-fg-muted tabular-nums shrink-0">{answeredCount}/{qs.length}</span>
      </div>

      {cfg.intro && <div className="px-3 pt-3 text-xs text-fg-muted">{cfg.intro}</div>}

      <div className="p-3 space-y-3">
        {qs.map((q, qi) => (
          <div key={qi}>
            <div className="text-xs font-semibold mb-1.5">{qi + 1}. {q.q}</div>
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((o, oi) => (
                <button key={oi} onClick={() => setAns((a) => ({ ...a, [qi]: oi }))}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition ${ans[qi] === oi ? "bg-accent text-black border-accent font-semibold" : "bg-bg border-border text-fg-muted hover:border-accent"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 結果 */}
      <div className="px-3 pb-3">
        {result ? (
          <div className="rounded-lg bg-accent/10 border border-accent/30 p-3">
            <div className="text-[11px] text-fg-muted mb-0.5">最適合你的是</div>
            <div className="text-sm font-bold mb-1">{result.o.emoji} {result.o.title}</div>
            <div className="text-xs text-fg-muted leading-relaxed">{result.o.desc}</div>
            <button onClick={() => setAns({})} className="mt-2 text-[11px] text-accent inline-flex items-center gap-1 hover:underline"><RotateCcw size={11} /> 重新測</button>
          </div>
        ) : (
          <div className="text-[11px] text-fg-muted">答完 {qs.length} 題就會給你建議（這只是起點、不是命令——你的實際情況你最清楚）。</div>
        )}
      </div>
    </div>
  );
}
