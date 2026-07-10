"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, CheckCircle2, XCircle, Wrench, Eye, ShieldAlert, ShieldCheck, History, Cpu, Square, Laptop, Plug, Copy, Trash2, X, Mic } from "lucide-react";

type Risk = "read" | "write" | "dangerous";
interface ToolInfo { name: string; description: string; risk: Risk; needsDevice: boolean; }
interface StepView { idx: number; kind: "thought" | "step"; thought?: string; toolName?: string; risk?: Risk; args?: any; result?: any; ok?: boolean; }
interface ApprovalReq { id: string; toolName: string; risk: Risk; summary: Record<string, string>; }
interface TaskListItem { id: string; goal: string; status: string; step_count: number; created_at: string; }
interface DeviceItem { id: string; name: string; platform: string; online: boolean; }

const RISK_BADGE: Record<Risk, { label: string; cls: string; Icon: any }> = {
  read: { label: "唯讀", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", Icon: Eye },
  write: { label: "會寫入", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", Icon: ShieldAlert },
  dangerous: { label: "高風險", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400", Icon: ShieldAlert },
};

const STATUS_LABEL: Record<string, string> = {
  planning: "規劃中", running: "執行中", awaiting_approval: "等你確認",
  succeeded: "完成", failed: "失敗", cancelled: "已取消",
};

const LIVE = ["planning", "running", "awaiting_approval"];
function mapSteps(st: any[]): StepView[] {
  return (st ?? []).map((s) => ({ idx: s.idx, kind: "step" as const, thought: s.thought, toolName: s.tool_name, risk: s.risk, args: s.args, result: s.result, ok: s.ok }));
}
function pendingApproval(approvals: any[]): ApprovalReq | null {
  const p = (approvals ?? []).find((a) => a.decision === "pending");
  return p ? { id: p.id, toolName: p.tool_name, risk: p.risk, summary: p.summary } : null;
}

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
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [pairOpen, setPairOpen] = useState(false);
  const [newToken, setNewToken] = useState<{ token: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [watching, setWatching] = useState<string>("");   // 遠端觀看中的 taskId（非本機發起、靠輪詢刷新）
  const [listening, setListening] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recRef = useRef<any>(null);
  const deepLinkedRef = useRef(false);
  const voiceSupported = typeof window !== "undefined" && !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);
  const onlineDevice = devices.find((d) => d.online);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/tasks");
      if (r.ok) setHistory((await r.json()).tasks ?? []);
    } catch { /* ignore */ }
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/devices");
      if (r.ok) setDevices((await r.json()).devices ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetch("/api/agent/tools").then((r) => r.json()).then((d) => setTools(d.tools ?? [])).catch(() => {});
    loadHistory();
    loadDevices();
    const t = setInterval(loadDevices, 10000);        // 每 10s 刷新裝置在線狀態
    return () => clearInterval(t);
  }, [loadHistory, loadDevices]);

  const pair = useCallback(async () => {
    setNewToken(null);
    const r = await fetch("/api/agent/bridge/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "我的電腦" }) });
    if (r.ok) { const d = await r.json(); setNewToken({ token: d.token, name: d.name }); loadDevices(); }
  }, [loadDevices]);

  const revoke = useCallback(async (id: string) => {
    await fetch("/api/agent/devices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke", deviceId: id }) }).catch(() => {});
    loadDevices();
  }, [loadDevices]);

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
    setRunning(true); setSteps([]); setSummary(""); setApproval(null); setStatus("planning"); setTaskId(""); setWatching("");
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
    const { task, steps: st, approvals } = await r.json();
    setTaskId(id); setGoal(task.goal); setStatus(task.status);
    setSummary(task.result?.summary ?? task.error ?? "");
    setSteps(mapSteps(st));
    setApproval(pendingApproval(approvals));
    setWatching(LIVE.includes(task.status) ? id : "");   // 還在跑 → 開始遠端輪詢刷新
  }, [running]);

  // 遠端觀看：非本機發起（例如手機開推播連結）的進行中任務，靠輪詢刷新狀態/步驟/待確認
  useEffect(() => {
    if (!watching || running) return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/agent/tasks/${watching}`);
        if (!r.ok) return;
        const { task, steps: st, approvals } = await r.json();
        setStatus(task.status);
        setSummary(task.result?.summary ?? task.error ?? "");
        setSteps(mapSteps(st));
        setApproval(pendingApproval(approvals));
        if (!LIVE.includes(task.status)) setWatching("");
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(iv);
  }, [watching, running]);

  // 深連結 /agent?task=<id>（推播點進來）：自動載入該任務、若有待確認就顯示、可直接在手機上批准
  useEffect(() => {
    if (deepLinkedRef.current) return;
    deepLinkedRef.current = true;
    const id = new URLSearchParams(window.location.search).get("task");
    if (id) replay(id);
  }, [replay]);

  const toggleVoice = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    if (listening) { recRef.current?.stop?.(); return; }
    const rec = new SR();
    rec.lang = "zh-TW"; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e: any) => { setGoal(Array.from(e.results).map((r: any) => r[0].transcript).join("")); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }, [listening]);

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
              {voiceSupported && !busy && (
                <button onClick={toggleVoice} title="語音輸入" className={`shrink-0 grid place-items-center w-9 h-9 rounded-xl border ${listening ? "bg-rose-500 border-rose-500 text-white animate-pulse" : "border-black/10 dark:border-white/15 text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10"}`}>
                  <Mic className="w-4 h-4" />
                </button>
              )}
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
            {onlineDevice && (
              <div className="flex items-center gap-1.5 mt-2 px-1 text-xs text-emerald-600 dark:text-emerald-400">
                <Laptop className="w-3.5 h-3.5" /> 需本機的指令會在「{onlineDevice.name}」上執行
              </div>
            )}
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
              {watching && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">遠端觀看中</span>}
              {taskId && <span className="text-xs text-black/30 dark:text-white/30 font-mono">#{taskId.slice(0, 8)}</span>}
              {watching && (
                <button onClick={cancel} className="ml-auto inline-flex items-center gap-1 text-xs text-rose-500 hover:underline">
                  <Square className="w-3 h-3" /> 停止任務
                </button>
              )}
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
          {/* 桌面助手 */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Laptop className="w-4 h-4 text-emerald-500" /> 桌面助手</div>
            {devices.length === 0 ? (
              <p className="text-xs text-black/50 dark:text-white/50 mb-2">連接電腦後，Agent 就能（經你確認）在本機讀寫檔案、跑 <code className="text-[10px]">npm test</code> 等指令。</p>
            ) : (
              <ul className="space-y-1 mb-2">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${d.online ? "bg-emerald-500" : "bg-black/20 dark:bg-white/20"}`} />
                    <span className="min-w-0 truncate">{d.name}</span>
                    <span className={`shrink-0 ${d.online ? "text-emerald-600 dark:text-emerald-400" : "text-black/40 dark:text-white/40"}`}>{d.online ? "在線" : "離線"}</span>
                    <button onClick={() => revoke(d.id)} title="解除配對" className="ml-auto shrink-0 text-black/30 hover:text-rose-500 dark:text-white/30"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => { setPairOpen(true); setNewToken(null); }} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 px-3 py-1.5 text-xs font-medium">
              <Plug className="w-3.5 h-3.5" /> 連接桌面助手
            </button>
          </div>

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

      {/* 配對彈窗 */}
      {pairOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setPairOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#15161c] border border-black/10 dark:border-white/10 p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold flex items-center gap-2"><Laptop className="w-5 h-5 text-emerald-500" /> 連接桌面助手</h2>
              <button onClick={() => setPairOpen(false)} className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {!newToken ? (
              <>
                <p className="text-sm text-black/70 dark:text-white/70 mb-3">桌面助手是在你電腦上執行的小程式，讓 Agent 能（每個寫入/高風險動作都要你確認）操作本機。按下方產生一次性 token。</p>
                <button onClick={pair} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium">
                  <Plug className="w-4 h-4" /> 產生配對 token
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> token 只顯示這一次，請立刻複製保存。</p>
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 min-w-0 truncate text-xs bg-black/5 dark:bg-black/40 rounded-lg px-3 py-2 font-mono">{newToken.token}</code>
                  <button onClick={() => { navigator.clipboard?.writeText(newToken.token); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-black/15 dark:border-white/20 px-2.5 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/10">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}{copied ? "已複製" : "複製"}
                  </button>
                </div>
                <ol className="text-sm space-y-1.5 text-black/75 dark:text-white/75 list-decimal pl-5">
                  <li>下載 <code className="text-xs">apps/desktop</code> 桌面助手（需 Node 18+）。</li>
                  <li>複製 <code className="text-xs">bridge.config.example.json</code> 為 <code className="text-xs">bridge.config.json</code>，貼上上面的 token、設定允許的資料夾。</li>
                  <li>執行 <code className="text-xs bg-black/5 dark:bg-black/40 px-1 rounded">node bridge.mjs</code>（或 <code className="text-xs">npm run gui</code> 開圖形介面）。</li>
                  <li>看到「等待任務中…」後，回這裡下需要本機的指令即可。</li>
                </ol>
              </>
            )}
          </div>
        </div>
      )}
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
