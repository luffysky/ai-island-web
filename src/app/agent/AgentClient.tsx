"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, CheckCircle2, XCircle, Wrench, Eye, ShieldAlert, ShieldCheck, History, Cpu, Square, Laptop, Plug, Copy, Trash2, X, Mic, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Risk = "read" | "write" | "dangerous";
interface ToolInfo { name: string; description: string; risk: Risk; needsDevice: boolean; }
interface StepView { idx: number; kind: "thought" | "step"; thought?: string; toolName?: string; risk?: Risk; args?: any; result?: any; ok?: boolean; }
interface ApprovalReq { id: string; toolName: string; risk: Risk; summary: Record<string, string>; }
interface TaskListItem { id: string; goal: string; status: string; step_count: number; created_at: string; }
interface DeviceItem { id: string; name: string; platform: string; online: boolean; }
interface SkillItem { id: string; name: string; description?: string; emoji: string; category: string; goal_template: string; allowed_tools: string[]; max_steps: number; is_builtin: boolean; installed: boolean; usage?: { used: number; succeeded: number }; }

const CAT_LABEL: Record<string, string> = { employee: "🏢 你的 AI 員工", research: "網頁 · 研究", write: "寫作 · 建議", code: "程式碼", dev: "開發者本機", learn: "站內 · 學習", other: "其他" };

// 桌面助手安裝檔下載連結（公開 GitHub release；出新版跑 scripts/publish-bridge-release.mjs 換版本號）
const DESKTOP_DOWNLOAD_URL = "https://github.com/luffysky/ai-island-bridge/releases/download/v0.1.0/ai-island-bridge-0.1.0-win.zip";

const RISK_BADGE: Record<Risk, { label: string; cls: string; Icon: any }> = {
  read: { label: "唯讀", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", Icon: Eye },
  write: { label: "會寫入", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", Icon: ShieldAlert },
  dangerous: { label: "高風險", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400", Icon: ShieldAlert },
};

const STATUS_LABEL: Record<string, string> = {
  planning: "規劃中", running: "執行中", awaiting_approval: "等你確認",
  awaiting_device: "等你的電腦上線", succeeded: "完成", failed: "失敗", cancelled: "已取消",
};

const LIVE = ["planning", "running", "awaiting_approval", "awaiting_device"];
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
  const [starting, setStarting] = useState(false);
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
  const [watching, setWatching] = useState<string>("");   // 目前輪詢觀看的 taskId（背景任務進行中就刷新）
  const [threadId, setThreadId] = useState<string>("");    // Phase A：目前對話串（延續脈絡）
  const [threadTurns, setThreadTurns] = useState<{ id: string; goal: string; summary: string }[]>([]); // 本串先前回合
  const [plan, setPlan] = useState<string[]>([]);          // L1：目前任務的計畫（子任務 checklist）
  const [listening, setListening] = useState(false);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillId, setSkillId] = useState<string>("");     // 選用的技能
  const [skillModal, setSkillModal] = useState(false);
  const [skillDraft, setSkillDraft] = useState<SkillDraft | null>(null);  // L4：從任務蒸餾出的技能草稿
  const [skillEditId, setSkillEditId] = useState<string | null>(null);    // CRUD：編輯既有自建技能/員工（null=新建/複製）
  const [synthBusy, setSynthBusy] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [mcpServers, setMcpServers] = useState<{ id: string; name: string; tools: { name: string }[] }[]>([]);
  const [mcpBusy, setMcpBusy] = useState(false);
  const [mcpForm, setMcpForm] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpAuth, setMcpAuth] = useState("");
  const [mcpErr, setMcpErr] = useState("");
  const [kpi, setKpi] = useState<any>(null);
  const [memory, setMemory] = useState<{ id: string; kind: string; key: string; value: string }[]>([]); // Phase C：分身長期記得你
  const [braveKey, setBraveKey] = useState<{ id: string; masked?: string } | null | undefined>(undefined); // 搜尋金鑰（Brave BYOK）；undefined=載入中
  const [braveInput, setBraveInput] = useState("");
  const [braveBusy, setBraveBusy] = useState(false);
  const [tavilyKey, setTavilyKey] = useState<{ id: string; masked?: string } | null | undefined>(undefined); // 搜尋金鑰（Tavily BYOK）
  const [tavilyInput, setTavilyInput] = useState("");
  const [tavilyBusy, setTavilyBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recRef = useRef<any>(null);
  const deepLinkedRef = useRef(false);
  const voiceSupported = typeof window !== "undefined" && !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);
  const onlineDevice = devices.find((d) => d.online);
  const busy = starting || (!!taskId && LIVE.includes(status));   // 任務進行中（背景執行 + 輪詢觀看）

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/tasks");
      if (r.ok) setHistory((await r.json()).tasks ?? []);
      const k = await fetch("/api/agent/kpi");
      if (k.ok) setKpi(await k.json());
    } catch { /* ignore */ }
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/devices");
      if (r.ok) setDevices((await r.json()).devices ?? []);
    } catch { /* ignore */ }
  }, []);

  const loadSkills = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/skills");
      if (r.ok) setSkills((await r.json()).skills ?? []);
    } catch { /* ignore */ }
  }, []);

  const loadMcp = useCallback(async () => {
    try { const r = await fetch("/api/agent/mcp"); if (r.ok) setMcpServers((await r.json()).servers ?? []); } catch { /* ignore */ }
  }, []);

  const loadMemory = useCallback(async () => {
    try { const r = await fetch("/api/agent/memory"); if (r.ok) setMemory((await r.json()).memory ?? []); } catch { /* ignore */ }
  }, []);

  const forgetMemory = useCallback(async (id: string) => {
    setMemory((p) => p.filter((m) => m.id !== id));
    await fetch(`/api/agent/memory?id=${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const loadBraveKey = useCallback(async () => {
    try {
      const r = await fetch("/api/user/ai-keys");
      if (!r.ok) { setBraveKey(null); return; }
      const { keys } = await r.json();
      const b = (keys ?? []).find((k: any) => k.provider === "brave");
      setBraveKey(b ? { id: b.id, masked: b.metadata?.masked } : null);
    } catch { setBraveKey(null); }
  }, []);

  const saveBraveKey = useCallback(async () => {
    if (!braveInput.trim() || braveBusy) return;
    setBraveBusy(true);
    try {
      const r = await fetch("/api/user/ai-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "brave", apiKey: braveInput.trim(), label: "Brave 搜尋" }) });
      if (r.ok) { setBraveInput(""); loadBraveKey(); }
      else { const d = await r.json().catch(() => ({})); alert(d.error ?? "儲存失敗"); }
    } catch { /* ignore */ } finally { setBraveBusy(false); }
  }, [braveInput, braveBusy, loadBraveKey]);

  const removeBraveKey = useCallback(async () => {
    if (!braveKey?.id) return;
    await fetch(`/api/user/ai-keys?id=${braveKey.id}`, { method: "DELETE" }).catch(() => {});
    setBraveKey(null);
  }, [braveKey]);

  const loadTavilyKey = useCallback(async () => {
    try {
      const r = await fetch("/api/user/ai-keys");
      if (!r.ok) { setTavilyKey(null); return; }
      const { keys } = await r.json();
      const t = (keys ?? []).find((k: any) => k.provider === "tavily");
      setTavilyKey(t ? { id: t.id, masked: t.metadata?.masked } : null);
    } catch { setTavilyKey(null); }
  }, []);

  const saveTavilyKey = useCallback(async () => {
    if (!tavilyInput.trim() || tavilyBusy) return;
    setTavilyBusy(true);
    try {
      const r = await fetch("/api/user/ai-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "tavily", apiKey: tavilyInput.trim(), label: "Tavily 搜尋" }) });
      if (r.ok) { setTavilyInput(""); loadTavilyKey(); }
      else { const d = await r.json().catch(() => ({})); alert(d.error ?? "儲存失敗"); }
    } catch { /* ignore */ } finally { setTavilyBusy(false); }
  }, [tavilyInput, tavilyBusy, loadTavilyKey]);

  const removeTavilyKey = useCallback(async () => {
    if (!tavilyKey?.id) return;
    await fetch(`/api/user/ai-keys?id=${tavilyKey.id}`, { method: "DELETE" }).catch(() => {});
    setTavilyKey(null);
  }, [tavilyKey]);

  // L4 技能合成：把這次完成的任務蒸餾成技能草稿 → 開建立視窗預填、讓使用者確認/微調
  const synthFromTask = useCallback(async () => {
    if (!taskId || synthBusy) return;
    setSynthBusy(true);
    try {
      const r = await fetch("/api/agent/skills/synthesize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId }) });
      const d = await r.json();
      if (r.ok && d.draft) { setSkillDraft(d.draft); setSkillModal(true); }
      else alert(d.error ?? "合成失敗");
    } catch { alert("合成失敗"); } finally { setSynthBusy(false); }
  }, [taskId, synthBusy]);

  const addOurMcp = useCallback(async () => {
    setMcpBusy(true);
    await fetch("/api/agent/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "AI 島", url: `${window.location.origin}/api/mcp` }) }).catch(() => {});
    setMcpBusy(false); loadMcp();
  }, [loadMcp]);

  const removeMcp = useCallback(async (id: string) => {
    await fetch(`/api/agent/mcp?id=${id}`, { method: "DELETE" }).catch(() => {});
    loadMcp();
  }, [loadMcp]);

  const addCustomMcp = useCallback(async () => {
    if (!mcpName.trim() || !mcpUrl.trim()) { setMcpErr("需要名稱與網址"); return; }
    setMcpBusy(true); setMcpErr("");
    try {
      const r = await fetch("/api/agent/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: mcpName, url: mcpUrl, auth_header: mcpAuth || undefined }) });
      const d = await r.json();
      if (!r.ok) { setMcpErr(d.error ?? "加入失敗"); return; }
      setMcpForm(false); setMcpName(""); setMcpUrl(""); setMcpAuth(""); loadMcp();
    } catch { setMcpErr("加入失敗"); } finally { setMcpBusy(false); }
  }, [mcpName, mcpUrl, mcpAuth, loadMcp]);

  const installSkill = useCallback(async (id: string, install: boolean) => {
    await fetch("/api/agent/skills", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skillId: id, install }) }).catch(() => {});
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, installed: install } : s)));
    if (!install) setSkillId((cur) => (cur === id ? "" : cur));
  }, []);

  useEffect(() => {
    fetch("/api/agent/tools").then((r) => r.json()).then((d) => setTools(d.tools ?? [])).catch(() => {});
    loadHistory();
    loadDevices();
    loadSkills();
    loadMcp();
    loadMemory();
    loadBraveKey();
    loadTavilyKey();
    const t = setInterval(loadDevices, 10000);        // 每 10s 刷新裝置在線狀態
    return () => clearInterval(t);
  }, [loadHistory, loadDevices, loadSkills, loadMcp, loadMemory, loadBraveKey, loadTavilyKey]);

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
    setApproval(null);   // 背景任務下輪迴圈會讀到 cancelled 而停；輪詢會反映狀態
  }, [taskId]);

  // 載入某對話串「先前回合」（成功的 goal → 摘要），排除目前這一則
  const loadThreadTurns = useCallback(async (tid: string, excludeId: string) => {
    if (!tid) { setThreadTurns([]); return; }
    try {
      const r = await fetch(`/api/agent/tasks?threadId=${tid}`);
      if (!r.ok) return;
      const { tasks } = await r.json();
      setThreadTurns((tasks ?? [])
        .filter((t: any) => t.id !== excludeId && t.status === "succeeded")
        .map((t: any) => ({ id: t.id, goal: t.goal, summary: t.turn_summary || t.result?.summary || "" })));
    } catch { /* ignore */ }
  }, []);

  // 開新對話（清掉延續脈絡）
  const newConversation = useCallback(() => {
    if (busy) return;
    setThreadId(""); setThreadTurns([]); setSteps([]); setSummary("");
    setApproval(null); setStatus(""); setTaskId(""); setWatching(""); setGoal("");
  }, [busy]);

  const run = useCallback(async (g: string) => {
    const text = g.trim();
    if (!text || busy) return;
    setStarting(true); setSteps([]); setSummary(""); setApproval(null); setStatus("planning"); setTaskId(""); setWatching(""); setPlan([]);
    try {
      const res = await fetch("/api/agent/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: text, skillId: skillId || undefined, threadId: threadId || undefined }),
      });
      if (!res.ok) { setStatus("failed"); setSummary("無法啟動任務（請先登入或稍後再試）。"); return; }
      const { taskId: id, threadId: tid } = await res.json();
      setTaskId(id); setWatching(id);   // 背景已開跑 → 輪詢觀看（關掉頁面任務照跑）
      if (tid) { setThreadId(tid); loadThreadTurns(tid, id); }
      loadHistory();
    } catch { setStatus("failed"); setSummary("連線失敗。"); }
    finally { setStarting(false); }
  }, [busy, loadHistory, skillId, threadId, loadThreadTurns]);

  const replay = useCallback(async (id: string) => {
    if (busy) return;
    const r = await fetch(`/api/agent/tasks/${id}`);
    if (!r.ok) return;
    const { task, steps: st, approvals } = await r.json();
    setTaskId(id); setGoal(task.goal); setStatus(task.status);
    setSummary(task.result?.summary ?? task.error ?? "");
    setSteps(mapSteps(st));
    setApproval(pendingApproval(approvals));
    setThreadId(task.thread_id ?? "");                    // 延續脈絡：回到該對話串
    setPlan(task.plan ?? []);
    loadThreadTurns(task.thread_id ?? "", id);
    setWatching(LIVE.includes(task.status) ? id : "");   // 還在跑 → 開始輪詢刷新
  }, [busy, loadThreadTurns]);

  // 遠端觀看：非本機發起（例如手機開推播連結）的進行中任務，靠輪詢刷新狀態/步驟/待確認
  useEffect(() => {
    if (!watching) return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/agent/tasks/${watching}`);
        if (!r.ok) return;
        const { task, steps: st, approvals } = await r.json();
        setStatus(task.status);
        setSummary(task.result?.summary ?? task.error ?? "");
        setSteps(mapSteps(st));
        setApproval(pendingApproval(approvals));
        setPlan(task.plan ?? []);
        if (!LIVE.includes(task.status)) {
          setWatching(""); loadHistory();
          if (task.thread_id) loadThreadTurns(task.thread_id, watching);  // 完成 → 刷新本串前文
          if (task.status === "succeeded") setTimeout(loadMemory, 1500);  // 完成 → 刷新分身記憶（抽取是背景進行）
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(iv);
  }, [watching, loadHistory, loadThreadTurns, loadMemory]);

  // 深連結 /agent?task=<id>（推播點進來）：自動載入該任務、若有待確認就顯示、可直接在手機上批准
  useEffect(() => {
    if (deepLinkedRef.current) return;
    deepLinkedRef.current = true;
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("task");
    if (id) { replay(id); return; }
    // 從辦公室（/agent/office）派工：預填指令 / 預選員工，讓使用者看過再送出（不自動燒 API）
    const g = sp.get("goal");
    const sk = sp.get("skill");
    if (g) setGoal(g);
    if (sk) setSkillId(sk);
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

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Hero */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-500/10 via-sky-500/10 to-emerald-500/10 border border-black/5 dark:border-white/10 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300"><Bot className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">分身島 · Agent <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-300 align-middle">Beta</span></h1>
            <p className="text-sm text-black/60 dark:text-white/60 mt-0.5">交給它一個目標，它會一步步規劃、用工具完成。動到會寫入/高風險的動作，一定先問過你。</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* 主區 */}
        <section className="min-w-0">
          {/* 輸入 */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3 sm:p-4">
            {/* 輸入框整整一欄；語音＋執行放下面 */}
            <div className="flex flex-col gap-2">
              <textarea
                value={goal} onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(goal); }}
                rows={3} placeholder="想讓 Agent 幫你做什麼？（Ctrl/⌘ + Enter 執行）"
                className="w-full resize-none bg-transparent outline-none text-sm sm:text-base px-2 py-1.5"
                disabled={busy}
              />
              <div className="flex items-center justify-end gap-2">
                {voiceSupported && !busy && (
                  <button onClick={toggleVoice} title="語音輸入" className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl border ${listening ? "bg-rose-500 border-rose-500 text-white animate-pulse" : "border-black/10 dark:border-white/15 text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/10"}`}>
                    <Mic className="w-4 h-4" />
                  </button>
                )}
                {busy ? (
                  <button onClick={cancel} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 text-sm font-medium">
                    <Square className="w-4 h-4" /> 停止
                  </button>
                ) : (
                  <button onClick={() => run(goal)} disabled={!goal.trim()} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-5 py-2.5 text-sm font-medium">
                    <Send className="w-4 h-4" /> 執行
                  </button>
                )}
              </div>
            </div>
            {onlineDevice && (
              <div className="flex items-center gap-1.5 mt-2 px-1 text-xs text-emerald-600 dark:text-emerald-400">
                <Laptop className="w-3.5 h-3.5" /> 需本機的指令會在「{onlineDevice.name}」上執行
              </div>
            )}
            {!steps.length && !busy && (
              <div className="flex flex-wrap gap-1.5 mt-2 px-1">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => { setGoal(ex); run(ex); }} className="text-xs rounded-full border border-black/10 dark:border-white/15 px-2.5 py-1 text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10">
                    {ex.length > 24 ? ex.slice(0, 24) + "…" : ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 辦公室 / 員工 —— 拉出來放顯眼、別埋在技能列裡（不然找不到）*/}
          {!busy && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <a href="/agent/office" className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-1.5 bg-violet-600 text-white hover:bg-violet-700 transition">
                🏢 我的辦公室
              </a>
              <button onClick={() => setStoreOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3.5 py-1.5 border border-violet-500/50 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10">
                👥 我的員工
              </button>
              <button onClick={() => setSkillModal(true)} className="inline-flex items-center gap-1.5 text-xs rounded-full px-3.5 py-1.5 border border-dashed border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10">
                ＋ 建員工
              </button>
              <a href="/agent/social" className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3.5 py-1.5 border border-violet-500/50 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10">
                📣 社群發布
              </a>
            </div>
          )}

          {/* 技能（已安裝）—— 選一個會限制工具集並套用它的任務框架 */}
          {!busy && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-xs text-black/40 dark:text-white/40 mr-0.5">技能</span>
              {skills.filter((s) => s.installed).map((s) => {
                const on = skillId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSkillId(on ? "" : s.id)}
                    title={s.description}
                    className={`text-xs rounded-full px-2.5 py-1 border transition ${on ? "bg-violet-600 border-violet-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}
                  >
                    {s.emoji} {s.name}{!s.is_builtin && <span className="opacity-60"> ·我的</span>}
                  </button>
                );
              })}
              <button onClick={() => setStoreOpen(true)} className="text-xs rounded-full px-2.5 py-1 border border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10">
                🛒 技能商店
              </button>
            </div>
          )}

          {/* 對話延續：本串先前回合 + 新對話 */}
          {threadId && (threadTurns.length > 0 || !!taskId) && (
            <div className="mt-3">
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-xs text-violet-600 dark:text-violet-400 inline-flex items-center gap-1" title="分身記得這串對話講過的內容，這次可以省略主詞接著問">🔗 延續對話中</span>
                <button onClick={newConversation} disabled={busy} className="text-xs text-black/50 dark:text-white/50 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-40">＋ 新對話</button>
              </div>
              {threadTurns.length > 0 && (
                <div className="space-y-2">
                  {threadTurns.map((t) => (
                    <div key={t.id} className="rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-3">
                      <div className="text-xs text-black/45 dark:text-white/45 mb-1">你：{t.goal}</div>
                      {t.summary && <div className="text-sm whitespace-pre-wrap leading-relaxed text-black/65 dark:text-white/65 line-clamp-4">{t.summary}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 狀態列 */}
          {(busy || status) && (
            <div className="flex flex-wrap items-center gap-2 mt-3 px-1 text-sm">
              {busy ? <Loader2 className="w-4 h-4 animate-spin text-violet-500" /> :
                status === "succeeded" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                status === "cancelled" ? <XCircle className="w-4 h-4 text-black/40 dark:text-white/40" /> :
                <XCircle className="w-4 h-4 text-rose-500" />}
              <span className="text-black/70 dark:text-white/70">{STATUS_LABEL[status] ?? status}</span>
              {busy && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400" title="任務在伺服器背景執行，關掉頁面也不會中斷">背景執行中</span>}
              {taskId && <span className="text-xs text-black/30 dark:text-white/30 font-mono">#{taskId.slice(0, 8)}</span>}
            </div>
          )}

          {/* L1 計畫（子任務 checklist） */}
          {plan.length > 1 && (
            <div className="mt-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-3">
              <div className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1.5">📋 分身的計畫（{plan.length} 步）</div>
              <ol className="space-y-1">
                {plan.map((p, i) => (
                  <li key={i} className="text-xs text-black/70 dark:text-white/70 flex gap-1.5">
                    <span className="shrink-0 text-violet-500 font-semibold">{i + 1}.</span><span className="min-w-0">{p}</span>
                  </li>
                ))}
              </ol>
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
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" /> 結果</div>
                  <div className="flex items-center gap-1.5">
                    {taskId && status === "succeeded" && (
                      <button onClick={synthFromTask} disabled={synthBusy} title="把這次的做法存成可重複使用的技能" className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 border border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 disabled:opacity-50">
                        {synthBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />} 存成技能
                      </button>
                    )}
                    <button onClick={() => { navigator.clipboard?.writeText(summary).catch(() => {}); }} title="複製" className="text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="prose-custom prose-sm max-w-none text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
                </div>
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

          {/* 搜尋金鑰（Brave BYOK）—— 貼自己的 key，搜尋更穩、不佔平台額度 */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Cpu className="w-4 h-4 text-sky-500" /> 搜尋金鑰（Brave）</div>
            {braveKey ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">已設定</span>
                <span className="text-black/40 dark:text-white/40 font-mono truncate">{braveKey.masked ?? "••••"}</span>
                <button onClick={removeBraveKey} className="ml-auto shrink-0 text-black/30 dark:text-white/30 hover:text-rose-500" title="移除"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <>
                <p className="text-xs text-black/50 dark:text-white/50 mb-2">貼上你自己的 Brave Search API key，搜尋更穩、更快、不佔平台額度。<span className="text-sky-600 dark:text-sky-400">中文結果好，推薦先辦這個。</span></p>
                <details className="mb-2 text-xs">
                  <summary className="cursor-pointer text-sky-500 select-none">▸ 如何免費申請（約 2 分鐘）</summary>
                  <ol className="list-decimal ml-4 mt-1.5 space-y-1 text-black/55 dark:text-white/55">
                    <li>開 <a href="https://brave.com/search/api/" target="_blank" rel="noreferrer" className="text-sky-500 underline">brave.com/search/api</a>，點「Get started / Sign up」。</li>
                    <li>用 Email 註冊並登入。</li>
                    <li>方案選「<b>Free</b>」（每月 2000 次、免費、免綁卡）。</li>
                    <li>進 Dashboard →「API Keys」→ 複製那把 key（<code>BSA</code> 開頭）。</li>
                    <li>貼回下面欄位 → 按「儲存」。</li>
                  </ol>
                </details>
                <div className="flex gap-1.5">
                  <input value={braveInput} onChange={(e) => setBraveInput(e.target.value)} type="password" placeholder="BSA..." className="flex-1 min-w-0 rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-sky-500" />
                  <button onClick={saveBraveKey} disabled={!braveInput.trim() || braveBusy} className="shrink-0 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium">{braveBusy ? "…" : "儲存"}</button>
                </div>
              </>
            )}
          </div>

          {/* 搜尋金鑰（Tavily BYOK）—— AI 專用全網搜尋，免費 1000 次/月 */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Cpu className="w-4 h-4 text-emerald-500" /> 搜尋金鑰（Tavily）</div>
            {tavilyKey ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">已設定</span>
                <span className="text-black/40 dark:text-white/40 font-mono truncate">{tavilyKey.masked ?? "••••"}</span>
                <button onClick={removeTavilyKey} className="ml-auto shrink-0 text-black/30 dark:text-white/30 hover:text-rose-500" title="移除"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <>
                <p className="text-xs text-black/50 dark:text-white/50 mb-2">AI 專用全網搜尋、回乾淨內容，每月 1000 次免費。<span className="text-amber-600 dark:text-amber-400">主要適合英文/國際查詢（中文結果較少）。</span></p>
                <details className="mb-2 text-xs">
                  <summary className="cursor-pointer text-emerald-500 select-none">▸ 如何免費申請（約 1 分鐘）</summary>
                  <ol className="list-decimal ml-4 mt-1.5 space-y-1 text-black/55 dark:text-white/55">
                    <li>開 <a href="https://tavily.com" target="_blank" rel="noreferrer" className="text-emerald-500 underline">tavily.com</a>，點「Sign up」（可用 Google 一鍵註冊）。</li>
                    <li>登入後首頁 Dashboard 就會顯示你的 API Key（<code>tvly-</code> 開頭）。</li>
                    <li>複製 → 貼回下面欄位 → 按「儲存」。</li>
                  </ol>
                </details>
                <div className="flex gap-1.5">
                  <input value={tavilyInput} onChange={(e) => setTavilyInput(e.target.value)} type="password" placeholder="tvly-..." className="flex-1 min-w-0 rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500" />
                  <button onClick={saveTavilyKey} disabled={!tavilyInput.trim() || tavilyBusy} className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium">{tavilyBusy ? "…" : "儲存"}</button>
                </div>
              </>
            )}
          </div>

          {/* 分身記憶（Phase C）—— 跨對話記得你，透明可刪 */}
          {memory.length > 0 && (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3.5">
              <div className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Bot className="w-4 h-4 text-violet-500" /> 分身記得你</div>
              <ul className="space-y-1.5">
                {memory.slice(0, 12).map((m) => (
                  <li key={m.id} className="flex items-start gap-1.5 text-xs group">
                    <span className="min-w-0"><span className="text-black/50 dark:text-white/50">{m.key}：</span><span className="text-black/75 dark:text-white/75 break-words">{m.value}</span></span>
                    <button onClick={() => forgetMemory(m.id)} title="忘記這條" className="ml-auto shrink-0 opacity-60 group-hover:opacity-100 text-black/30 hover:text-rose-500 dark:text-white/30"><X className="w-3 h-3" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                    {t.description && (
                      <div className="text-[10px] text-black/50 dark:text-white/50 pl-5 mt-0.5 leading-snug">
                        {t.description.replace(/\*\*/g, "").replace(/\s+/g, " ").split(/[。\n]/)[0].slice(0, 60)}
                      </div>
                    )}
                    {t.needsDevice && <div className="text-[10px] text-amber-600/80 dark:text-amber-400/70 pl-5 mt-0.5">需桌面助手（Phase 1b）</div>}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 成效 KPI */}
          {kpi && kpi.total > 0 && (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3.5">
              <div className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Cpu className="w-4 h-4 text-emerald-500" /> 成效</div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-black/5 dark:bg-white/5 py-1.5">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{kpi.successRate ?? "—"}{kpi.successRate != null && "%"}</div>
                  <div className="text-[10px] text-black/50 dark:text-white/50">成功率</div>
                </div>
                <div className="rounded-lg bg-black/5 dark:bg-white/5 py-1.5">
                  <div className="text-lg font-bold">{kpi.total}</div>
                  <div className="text-[10px] text-black/50 dark:text-white/50">總任務</div>
                </div>
                <div className="rounded-lg bg-black/5 dark:bg-white/5 py-1.5">
                  <div className="text-lg font-bold">{kpi.avgSteps}</div>
                  <div className="text-[10px] text-black/50 dark:text-white/50">平均步數</div>
                </div>
                <div className="rounded-lg bg-black/5 dark:bg-white/5 py-1.5">
                  <div className="text-lg font-bold">{kpi.interventionRate}%</div>
                  <div className="text-[10px] text-black/50 dark:text-white/50">人工介入</div>
                </div>
              </div>
              <div className="text-[10px] text-black/40 dark:text-white/40 mt-2 text-center">
                平均耗時 {kpi.avgDurationSec}s · 確認 同意{kpi.approvals.approved}/拒{kpi.approvals.denied}
              </div>
            </div>
          )}

          {/* MCP 伺服器（Phase 4 骨架） */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Plug className="w-4 h-4 text-fuchsia-500" /> MCP 伺服器</div>
            {mcpServers.length === 0 ? (
              <p className="text-xs text-black/50 dark:text-white/50 mb-2">接 MCP 伺服器可讓 Agent 用更多外掛工具（走同一套確認）。</p>
            ) : (
              <ul className="space-y-1.5 mb-2">
                {mcpServers.map((m) => (
                  <li key={m.id} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0 bg-fuchsia-500" />
                      <span className="min-w-0 truncate font-medium">{m.name}</span>
                      <span className="text-black/40 dark:text-white/40">· {m.tools.length} 工具</span>
                      <button onClick={() => removeMcp(m.id)} title="移除" className="ml-auto shrink-0 text-black/30 hover:text-rose-500 dark:text-white/30"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-1.5">
              {!mcpServers.some((m) => m.name === "AI 島") && (
                <button onClick={addOurMcp} disabled={mcpBusy} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-500/40 text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-500/10 px-2 py-1.5 text-xs font-medium disabled:opacity-50">
                  {mcpBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />} AI 島 MCP
                </button>
              )}
              <button onClick={() => { setMcpForm((v) => !v); setMcpErr(""); }} className="flex-1 rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-1.5 text-xs">
                ＋ 自訂外部
              </button>
            </div>
            {mcpForm && (
              <div className="mt-2 space-y-1.5">
                <input value={mcpName} onChange={(e) => setMcpName(e.target.value)} placeholder="名稱" className="w-full text-xs rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1.5" />
                <input value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)} placeholder="MCP 端點網址 https://…" className="w-full text-xs rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1.5" />
                <input value={mcpAuth} onChange={(e) => setMcpAuth(e.target.value)} placeholder="Authorization（選填，如 Bearer xxx）" className="w-full text-xs rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1.5" />
                {mcpErr && <div className="text-[10px] text-rose-500">{mcpErr}</div>}
                <button onClick={addCustomMcp} disabled={mcpBusy} className="w-full rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-2 py-1.5 text-xs disabled:opacity-50">{mcpBusy ? "驗證連線中…" : "加入（會先驗證連得上）"}</button>
              </div>
            )}
          </div>

          {/* 歷史 */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-2"><History className="w-4 h-4 text-violet-500" /> 最近任務</div>
            {history.length === 0 ? <p className="text-xs text-black/40 dark:text-white/40">還沒有任務。</p> : (
              <ul className="space-y-1">
                {history.map((h) => (
                  <li key={h.id}>
                    <button onClick={() => replay(h.id)} disabled={busy} className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50">
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
                {DESKTOP_DOWNLOAD_URL && (
                  <a href={DESKTOP_DOWNLOAD_URL} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-medium mb-3" download>
                    ⬇ 下載桌面助手（Windows，免裝 Node）
                  </a>
                )}
                {DESKTOP_DOWNLOAD_URL ? (
                  <p className="text-sm font-medium mb-1.5">解壓後執行「AI島桌面助手.exe」→ 在設定畫面貼上上面的 token、選允許資料夾 → 啟動即可。</p>
                ) : (
                <>
                <p className="text-sm font-medium mb-1.5">在電腦上開終端機、照這 3 步（需 Node 18+）：</p>
                <ol className="text-sm space-y-2 text-black/75 dark:text-white/75 list-decimal pl-5">
                  <li>
                    進桌面助手資料夾、建設定檔：
                    <pre className="mt-1 text-[11px] bg-black/5 dark:bg-black/40 rounded-lg p-2 overflow-x-auto">cd apps/desktop{"\n"}cp bridge.config.example.json bridge.config.json</pre>
                  </li>
                  <li>編輯 <code className="text-xs">bridge.config.json</code>：把 <code className="text-xs">token</code> 換成上面複製的，<code className="text-xs">roots</code> 改成你要開放的資料夾（<b>Windows 路徑用正斜線</b> <code className="text-xs">D:/專案</code>）。</li>
                  <li>
                    啟動（看到「等待任務中…」就成功）：
                    <pre className="mt-1 text-[11px] bg-black/5 dark:bg-black/40 rounded-lg p-2 overflow-x-auto">node bridge.mjs</pre>
                  </li>
                </ol>
                <p className="text-xs text-black/45 dark:text-white/45 mt-2">回這頁下需要本機的指令即可（例：「在專案跑 npm test 看結果」）。目前為開發者版本、需專案原始碼；打包安裝檔為後續。</p>
                </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 技能商店 */}
      {storeOpen && (
        <SkillStore skills={skills} tools={tools} onToggle={installSkill} onClose={() => setStoreOpen(false)} onDeleted={loadSkills}
          onEdit={(sk, mode) => {
            setSkillDraft({ name: sk.name, emoji: sk.emoji, description: sk.description ?? "", goal_template: (sk as any).goal_template ?? "", allowed_tools: sk.allowed_tools ?? [] });
            setSkillEditId(mode === "edit" ? sk.id : null);
            setStoreOpen(false); setSkillModal(true);
          }} />
      )}

      {/* 自建 Agent（技能）彈窗 */}
      {skillModal && (
        <SkillCreator tools={tools} initial={skillDraft} editId={skillEditId} onClose={() => { setSkillModal(false); setSkillDraft(null); setSkillEditId(null); }} onCreated={(id) => { loadSkills(); setSkillId(id); setSkillModal(false); setSkillDraft(null); setSkillEditId(null); }} />
      )}
    </main>
  );
}

function SkillStore({ skills, tools, onToggle, onClose, onDeleted, onEdit }: {
  skills: SkillItem[]; tools: ToolInfo[];
  onToggle: (id: string, install: boolean) => void; onClose: () => void; onDeleted: () => void;
  onEdit: (skill: SkillItem, mode: "edit" | "fork") => void;
}) {
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const perm = (s: SkillItem) => {
    if (!s.allowed_tools || s.allowed_tools.length === 0) return { text: "純建議 · 不用任何工具", device: false, danger: false };
    const infos = s.allowed_tools.map((n) => toolMap.get(n)).filter(Boolean) as ToolInfo[];
    return { text: s.allowed_tools.join(" · "), device: infos.some((t) => t.needsDevice), danger: infos.some((t) => t.risk === "dangerous") };
  };
  const cats = ["employee", "research", "write", "code", "dev", "learn", "other"];
  const del = async (id: string) => { await fetch(`/api/agent/skills?id=${id}`, { method: "DELETE" }).catch(() => {}); onDeleted(); };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#15161c] border border-black/10 dark:border-white/10 p-5 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold flex items-center gap-2">🛒 技能商店</h2>
          <button onClick={onClose} className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-black/50 dark:text-white/50 mb-4">安裝你需要的技能，安裝後才會出現在下令列。安裝＝同意它使用下列工具。</p>
        {cats.map((cat) => {
          const list = skills.filter((s) => s.category === cat);
          if (!list.length) return null;
          return (
            <div key={cat} className="mb-4">
              <div className="text-xs font-semibold text-black/50 dark:text-white/50 mb-2">{CAT_LABEL[cat] ?? cat}</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {list.map((s) => {
                  const p = perm(s);
                  return (
                    <div key={s.id} className="rounded-xl border border-black/10 dark:border-white/10 p-3 flex flex-col">
                      <div className="flex items-start gap-2">
                        <span className="text-xl leading-none">{s.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium flex items-center gap-1.5">{s.name}{!s.is_builtin && <span className="text-[10px] text-violet-500">我的</span>}</div>
                          <div className="text-xs text-black/55 dark:text-white/55 line-clamp-2">{s.description}</div>
                          {s.usage && s.usage.used > 0 && (
                            <div className="text-[10px] text-black/40 dark:text-white/40 mt-0.5">用過 {s.usage.used} 次{s.usage.used > 0 && ` · 成功 ${Math.round((s.usage.succeeded / s.usage.used) * 100)}%`}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-2 text-[10px]">
                        <span className="basis-full min-w-0 break-words leading-relaxed text-black/40 dark:text-white/40">{p.text}</span>
                        {p.device && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">需本機</span>}
                        {p.danger && <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400">高風險</span>}
                      </div>
                      <div className="mt-2.5 flex gap-2">
                        {s.installed ? (
                          <button onClick={() => onToggle(s.id, false)} disabled={!s.is_builtin} className="flex-1 text-xs rounded-lg border border-black/15 dark:border-white/20 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40">
                            {s.is_builtin ? "已安裝 · 移除" : "已內建"}
                          </button>
                        ) : (
                          <button onClick={() => onToggle(s.id, true)} className="flex-1 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 text-white py-1.5">安裝</button>
                        )}
                        <button onClick={() => onEdit(s, s.is_builtin ? "fork" : "edit")} title={s.is_builtin ? "複製一份來改" : "編輯"} className="shrink-0 rounded-lg border border-black/15 dark:border-white/20 px-2 hover:text-violet-500"><Pencil className="w-3.5 h-3.5" /></button>
                        {!s.is_builtin && <button onClick={() => del(s.id)} title="刪除" className="shrink-0 rounded-lg border border-black/15 dark:border-white/20 px-2 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SkillDraft { name: string; emoji: string; description: string; goal_template: string; allowed_tools: string[]; }
function SkillCreator({ tools, onClose, onCreated, initial, editId }: { tools: ToolInfo[]; onClose: () => void; onCreated: (id: string) => void; initial?: SkillDraft | null; editId?: string | null }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🤖");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [prompt, setPrompt] = useState(initial?.goal_template ?? "");
  const [picked, setPicked] = useState<string[]>(initial?.allowed_tools ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  const save = async () => {
    if (!name.trim()) { setErr("請填員工名字"); return; }
    setSaving(true); setErr("");
    try {
      const url = editId ? `/api/agent/skills?id=${editId}` : "/api/agent/skills";
      const payload = editId
        ? { name, emoji, description: desc, goal_template: prompt, allowed_tools: picked }
        : { name, emoji, description: desc, goal_template: prompt, allowed_tools: picked, max_steps: 12, category: "employee" };
      const r = await fetch(url, {
        method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? (editId ? "儲存失敗" : "建立失敗")); return; }
      onCreated(editId ?? d.id);
    } catch { setErr("建立失敗"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#15161c] border border-black/10 dark:border-white/10 p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-violet-500" /> {editId ? "編輯 AI 員工／技能" : "建一位 AI 員工"}</h2>
          <button onClick={onClose} className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-black/50 dark:text-white/50 mb-3">幫他取名、給職務、寫職能（要他怎麼做事）、選能用的工具。最多可建 20 位。</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} className="w-14 text-center text-xl rounded-xl border border-black/10 dark:border-white/15 bg-transparent py-2" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="員工名字（如：小美 / 阿明）" className="flex-1 rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="職務／職位（如：社群小編、機會獵人、資料分析師）" className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="職能／工作守則（例：你是我的機會獵人，每天用 web.search 找適合的免費競賽、列出截止日與來源，動任何對外的事都先問我）" className="w-full resize-none rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          <div>
            <div className="text-xs text-black/50 dark:text-white/50 mb-1.5">允許的工具（不選＝全部可用）</div>
            <div className="flex flex-wrap gap-1.5">
              {tools.map((t) => {
                const on = picked.includes(t.name);
                return (
                  <button key={t.name} onClick={() => toggle(t.name)} className={`text-xs rounded-full px-2.5 py-1 border transition ${on ? "bg-violet-600 border-violet-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}>
                    {t.name}{t.needsDevice ? " 🖥" : ""}
                  </button>
                );
              })}
            </div>
          </div>
          {err && <div className="text-xs text-rose-500">{err}</div>}
          <button onClick={save} disabled={saving} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-medium">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {editId ? "儲存修改" : "錄取這位員工"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step }: { step: StepView }) {
  const b = step.risk ? RISK_BADGE[step.risk] : null;
  const err = step.result && typeof step.result === "object" && "error" in step.result ? String((step.result as any).error) : null;
  const image = step.result && typeof step.result === "object" && "image" in step.result ? String((step.result as any).image) : null;
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
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="screenshot" className="mt-1.5 rounded-lg border border-black/10 dark:border-white/10 max-h-64 max-w-full w-auto" />
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
