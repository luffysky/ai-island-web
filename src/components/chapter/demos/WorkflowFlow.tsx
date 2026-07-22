"use client";
import { useState } from "react";
import { Clock, Webhook, MousePointerClick, Globe, Sparkles, GitBranch, Settings2, Send, Code2, Database, ArrowDown, Play, FastForward, RotateCcw } from "lucide-react";

/**
 * n8n Workflow 視覺化 — 看資料一格一格流過節點。
 * Trigger 觸發 → 每個 Node 處理、payload 跟著變 → 最後輸出。教 50.4 Trigger/Action、50.20 Node/Workflow。
 * config：{ trigger:{kind,label,data}, nodes:[{kind,label,desc,data}] }
 *   kind: schedule|webhook|manual（trigger）/ http|ai|if|set|action|code|db（node）
 * RWD：純垂直節點鏈、payload overflow-x-auto、按鈕 flex-wrap、無寫死寬、亮暗 token。
 */
type TrigKind = "schedule" | "webhook" | "manual";
type NodeKind = "http" | "ai" | "if" | "set" | "action" | "code" | "db";
type Trigger = { kind: TrigKind; label: string; data?: string };
type FlowNode = { kind: NodeKind; label: string; desc?: string; data?: string };
type Cfg = { trigger: Trigger; nodes: FlowNode[] };

const TRIG: Record<TrigKind, { icon: typeof Clock; name: string }> = {
  schedule: { icon: Clock, name: "Schedule Trigger" },
  webhook: { icon: Webhook, name: "Webhook Trigger" },
  manual: { icon: MousePointerClick, name: "Manual Trigger" },
};
const NODE: Record<NodeKind, { icon: typeof Globe; cls: string; bg: string }> = {
  http: { icon: Globe, cls: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10" },
  ai: { icon: Sparkles, cls: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
  if: { icon: GitBranch, cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  set: { icon: Settings2, cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  action: { icon: Send, cls: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
  code: { icon: Code2, cls: "text-fg", bg: "bg-fg/5" },
  db: { icon: Database, cls: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10" },
};

function Payload({ data }: { data?: string }) {
  if (!data) return null;
  return (
    <div className="mt-1.5 rounded bg-bg-elevated border border-border overflow-x-auto">
      <pre className="text-[10.5px] leading-relaxed font-mono p-1.5 whitespace-pre text-fg-muted">{data}</pre>
    </div>
  );
}

export function WorkflowFlow({ title, note, config }: { title?: string; note?: string; config?: Record<string, unknown> }) {
  const cfg = config as unknown as Cfg | undefined;
  const [shown, setShown] = useState(1); // trigger 一開始就顯示
  if (!cfg?.trigger || !cfg?.nodes?.length) return null;
  const total = cfg.nodes.length + 1; // trigger + nodes
  const done = shown >= total;
  const T = TRIG[cfg.trigger.kind] ?? TRIG.manual;
  const TIcon = T.icon;

  return (
    <div className="demo-glass overflow-hidden">
      <div className="px-3 py-2 demo-glass-head">
        <div className="text-sm font-semibold flex items-center gap-1.5">🔗 {title ?? "n8n Workflow 跑一遍"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      <div className="p-3">
        {/* Trigger */}
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2.5">
          <div className="text-[11px] font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <TIcon size={13} /> {T.name} · 觸發
          </div>
          <p className="text-xs leading-relaxed mt-1 break-words">{cfg.trigger.label}</p>
          <Payload data={cfg.trigger.data} />
        </div>

        {/* Nodes */}
        {cfg.nodes.slice(0, shown - 1).map((n, i) => {
          const m = NODE[n.kind] ?? NODE.action;
          const Icon = m.icon;
          return (
            <div key={i}>
              <div className="flex justify-center py-1"><ArrowDown size={16} className="text-fg-muted/50" /></div>
              <div className={`rounded-lg border border-border ${m.bg} p-2.5`}>
                <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${m.cls}`}>
                  <Icon size={13} /> {n.label}
                </div>
                {n.desc && <p className="text-xs leading-relaxed mt-1 break-words">{n.desc}</p>}
                <Payload data={n.data} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 控制列 */}
      <div className="px-3 pb-3 flex flex-wrap items-center gap-2">
        {!done ? (
          <>
            <button onClick={() => setShown((s) => Math.min(s + 1, total))}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white font-semibold inline-flex items-center gap-1 hover:opacity-90 transition">
              <Play size={12} /> 資料流過下一個節點
            </button>
            <button onClick={() => setShown(total)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-fg-muted inline-flex items-center gap-1 hover:border-accent transition">
              <FastForward size={12} /> 跑完整條
            </button>
            <span className="text-[11px] text-fg-muted tabular-nums">{shown}/{total}</span>
          </>
        ) : (
          <>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Workflow 跑完，共 {cfg.nodes.length} 個節點</span>
            <button onClick={() => setShown(1)} className="text-[11px] text-accent inline-flex items-center gap-1 hover:underline"><RotateCcw size={11} /> 再跑一次</button>
          </>
        )}
      </div>
    </div>
  );
}
