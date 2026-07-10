"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, CheckCircle2, XCircle, Wrench, Eye, ShieldAlert, ShieldCheck, History, Cpu, Square } from "lucide-react";

type Risk = "read" | "write" | "dangerous";
interface ToolInfo { name: string; description: string; risk: Risk; needsDevice: boolean; }
interface StepView { idx: number; kind: "thought" | "step"; thought?: string; toolName?: string; risk?: Risk; args?: any; result?: any; ok?: boolean; }
interface ApprovalReq { id: string; toolName: string; risk: Risk; summary: Record<string, string>; }
interface TaskListItem { id: string; goal: string; status: string; step_count: number; created_at: string; }

const RISK_BADGE: Record<Risk, { label: string; cls: string; Icon: any }> = {
  read: { label: "唯讀", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", Icon: Eye },
  write: { label: "會寫入", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", Icon: ShieldAlert },
  dangerous: { label: "高風險", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400", Icon: ShieldAlert },
};

const STATUS_LABEL: Record<string, string> = {
  planning: "規劃中", running: "執行中", awaiting_approval: "等你確認",
  succeeded: "完成", failed: "失敗", cancelled: "已取消",
};

const EXAMPLES = [
  "查一下「async」在程式辭典裡是什麼意思，用白話講給我聽",
  "抓 https://example.com 的標題和主要內容，摘要給我",
  "解釋「技術債」和「404」，各給一個生活比喻",
];

export function AgentClient() {
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [steps, setSteps] = useState<StepView[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [approval, setApproval] = useState<ApprovalReq | null>(null);
  const [taskId, setTaskId] = useState<string>("");
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [history, setHistory] = useState<TaskListItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/tasks");
      if (r.ok) setHistory((await r.json()).tasks ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetch("/api/agent/tools").then((r) => r.json()).then((d) => setTools(d.tools ?? [])).catch(() => {});
    loadHistory();
  }, [loadHistory]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [steps, summary, approval]);

  const decide = useCallback(async (decision: "approved" | "denied") => {
    if (!approval) return;
    const id = approval.id;
    setApproval(null);
    await fetch(`/api/agent/approvals/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
    }).catch(() => {});
  }, [approval]);

  const cancel = useCallback(async () => {
    if (taskId) await fetch(`/api/agent/tasks/${taskId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }),
    }).catch(() => {});
    abortRef.current?.abort();
    setRunning(false);
    setApproval(null);
  }, [taskId]);

  const run = useCallback(async (g: string) => {
    const text = g.trim();
    if (!text || running) return;
    setRunning(true); setSteps([]); setSummary(""); setApproval(null); setStatus("planning"); setTaskId("");
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/agent/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: text }), signal: ac.signal,
      });
      if (!res.ok || !res.body) { setStatus("failed"); setSummary("無法啟動任務（請先登入或稍後再試）。"); setRunning(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let ev: any;
          try { ev = JSON.parse(line.slice(6)); } catch { continue; }
          handleEvent(ev);
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") { setStatus("failed"); setSummary("連線中斷。"); }
    } finally {
      setRunning(false);
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, loadHistory]);

  function handleEvent(ev: any) {
    switch (ev.type) {
      case "task": setTaskId(ev.taskId); break;
      case "status": setStatus(ev.status); break;
      case "thought": setSteps((s) => [...s, { idx: ev.idx, kind: "thought", thought: ev.thought }]); break;
      case "step": setSteps((s) => [...s, { ...ev.step, kind: "step" }]); break;
      case "approval": setStatus("awaiting_approval"); setApproval(ev.approval); break;
      case "done": setStatus(ev.status); setSummary(ev.summary ?? ""); setApproval(null); break;
      case "error": setSteps((s) => [...s, { idx: -1, kind: "step", toolName: "⚠️ 錯誤", ok: false, result: { error: ev.error } }]); break;
    }
  }

  const replay = useCallback(async (id: string) => {
    if (running) return;
    const r = await fetch(`/api/agent/tasks/${id}`);
    if (!r.ok) return;
    const { task, steps: st } = await r.json();
    setTaskId(id); setGoal(task.goal); setStatus(task.status);
    setSummary(task.result?.summary ?? task.error ?? "");
    setSteps((st ?? []).map((s: any) => ({ idx: s.idx, kind: "step", thought: s.thought, toolName: s.tool_name, risk: s.risk, args: s.args, result: s.result, ok: s.ok })));
    setApproval(null);
  }, [running]);

  const busy = running && (status === "planning" || status === "running" || status === "awaiting_approval");

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Hero */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-500/10 via-sky-500/10 to-emerald-500/10 border border-black/5 dark:border-white/10 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300"><Bot className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">行動代理 · Agent <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-300 align-middle">Phase 1 · Beta</span></h1>
            <p className="text-sm text-black/60 dark:text-white/60 mt-0.5">交給它一個目標，它會一步步規劃、用工具完成。動到會寫入/高風險的動作，一定先問過你。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* 主區 */}
        <section className="min-w-0">
          {/* 輸入 */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3 sm:p-4">
            <div className="flex items-end gap-2">
              <textarea
                value={goal} onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(goal); }}
                rows={2} placeholder="想讓 Agent 幫你做什麼？（Ctrl/⌘ + Enter 執行）"
                className="flex-1 resize-none bg-transparent outline-none text-sm sm:text-base px-2 py-1.5 min-w-0"
                disabled={running}
              />
              {busy ? (
                <button onClick={cancel} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-2 text-sm font-medium">
                  <Square className="w-4 h-4" /> 停止
                </button>
              ) : (
                <button onClick={() => run(goal)} disabled={!goal.trim()} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-3.5 py-2 text-sm font-medium">
                  <Send className="w-4 h-4" /> 執行
                </button>
              )}
            </div>
            {!steps.length && !running && (
              <div className="flex flex-wrap gap-1.5 mt-2 px-1">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => { setGoal(ex); run(ex); }} className="text-xs rounded-full border border-black/10 dark:border-white/15 px-2.5 py-1 text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10">
                    {ex.length > 24 ? ex.slice(0, 24) + "…" : ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 狀態列 */}
          {(running || status) && (
            <div className="flex items-center gap-2 mt-3 px-1 text-sm">
              {busy ? <Loader2 className="w-4 h-4 animate-spin text-violet-500" /> :
                status === "succeeded" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                status === "cancelled" ? <XCircle className="w-4 h-4 text-black/40 dark:text-white/40" /> :
                <XCircle className="w-4 h-4 text-rose-500" />}
              <span className="text-black/70 dark:text-white/70">{STATUS_LABEL[status] ?? status}</span>
              {taskId && <span className="text-xs text-black/30 dark:text-white/30 font-mono">#{taskId.slice(0, 8)}</span>}
            </div>
          )}

          {/* 步驟流 */}
          <div ref={scrollRef} className="mt-3 space-y-2 max-h-[52vh] overflow-y-auto pr-1">
            {steps.map((s, i) => s.kind === "thought" ? (
              <div key={i} className="flex gap-2 text-sm text-black/55 dark:text-white/55 px-1 italic">
                <span className="shrink-0">💭</span><span className="min-w-0">{s.thought}</span>
              </div>
            ) : (
              <StepCard key={i} step={s} />
            ))}

            {approval && <ApprovalCard req={approval} onDecide={decide} />}

            {summary && !approval && (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 sm:p-4">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1"><CheckCircle2 className="w-4 h-4" /> 結果</div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{summary}</div>
              </div>
            )}
          </div>
        </section>

        {/* 側欄 */}
        <aside className="space-y-4">
          {/* 能力 */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Cpu className="w-4 h-4 text-sky-500" /> 目前能力</div>
            <ul className="space-y-1.5">
              {tools.map((t) => {
                const b = RISK_BADGE[t.risk];
                return (
                  <li key={t.name} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3 h-3 text-black/40 dark:text-white/40 shrink-0" />
                      <span className="font-mono text-[11px]">{t.name}</span>
                      <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] ${b.cls}`}>{b.label}</span>
                    </div>
                    {t.needsDevice && <div className="text-[10px] text-amber-600/80 dark:text-amber-400/70 pl-5 mt-0.5">需桌面助手（Phase 1b）</div>}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 歷史 */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-2"><History className="w-4 h-4 text-violet-500" /> 最近任務</div>
            {history.length === 0 ? <p className="text-xs text-black/40 dark:text-white/40">還沒有任務。</p> : (
              <ul className="space-y-1">
                {history.map((h) => (
                  <li key={h.id}>
                    <button onClick={() => replay(h.id)} disabled={running} className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50">
                      <div className="text-xs line-clamp-1">{h.goal}</div>
                      <div className="text-[10px] text-black/40 dark:text-white/40">{STATUS_LABEL[h.status] ?? h.status} · {h.step_count} 步</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function StepCard({ step }: { step: StepView }) {
  const b = step.risk ? RISK_BADGE[step.risk] : null;
  const err = step.result && typeof step.result === "object" && "error" in step.result ? String((step.result as any).error) : null;
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 p-3">
      <div className="flex items-center gap-2 text-sm">
        {step.ok === false ? <XCircle className="w-4 h-4 text-rose-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
        <span className="font-mono text-[13px] min-w-0 truncate">{step.toolName}</span>
        {b && <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] ${b.cls}`}>{b.label}</span>}
      </div>
      {step.args != null && Object.keys(step.args ?? {}).length > 0 && (
        <pre className="mt-1.5 text-[11px] bg-black/5 dark:bg-black/30 rounded-lg p-2 overflow-x-auto text-black/60 dark:text-white/60">{JSON.stringify(step.args, null, 2)}</pre>
      )}
      {err ? (
        <div className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{err}</div>
      ) : step.result != null ? (
        <pre className="mt-1.5 text-[11px] bg-black/5 dark:bg-black/30 rounded-lg p-2 overflow-x-auto max-h-40 overflow-y-auto text-black/70 dark:text-white/70">{typeof step.result === "string" ? step.result : JSON.stringify(step.result, null, 2)}</pre>
      ) : null}
    </div>
  );
}

function ApprovalCard({ req, onDecide }: { req: ApprovalReq; onDecide: (d: "approved" | "denied") => void }) {
  const strong = req.risk === "dangerous";
  return (
    <div className={`rounded-2xl border-2 p-4 ${strong ? "border-rose-500/50 bg-rose-500/5" : "border-amber-500/50 bg-amber-500/5"}`}>
      <div className="flex items-center gap-2 font-semibold text-sm mb-2">
        <ShieldAlert className={`w-5 h-5 ${strong ? "text-rose-500" : "text-amber-500"}`} />
        需要你確認：<span className="font-mono">{req.toolName}</span>
      </div>
      <dl className="space-y-1 text-xs mb-3">
        {Object.entries(req.summary).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="shrink-0 text-black/45 dark:text-white/45 w-12">{k}</dt>
            <dd className="min-w-0 break-words text-black/75 dark:text-white/75">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex gap-2">
        <button onClick={() => onDecide("approved")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-sm font-medium">
          <ShieldCheck className="w-4 h-4" /> 同意執行
        </button>
        <button onClick={() => onDecide("denied")} className="inline-flex items-center gap-1.5 rounded-xl border border-black/15 dark:border-white/20 px-3.5 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
          <XCircle className="w-4 h-4" /> 拒絕
        </button>
      </div>
    </div>
  );
}
