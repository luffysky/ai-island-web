"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Laptop, LaptopMinimal, ArrowRight, Store, ChevronLeft, Sparkles, CheckCircle2, Loader2, Clock, XCircle, CalendarClock, Plus, Trash2, Power, ShieldAlert, Check, X } from "lucide-react";
import { describeSchedule, type Frequency } from "@/lib/agent/schedule";
import { popularTemplates } from "@/lib/agent/task-templates";

interface SkillItem { id: string; name: string; description?: string; emoji: string; category: string; is_builtin: boolean; installed: boolean; usage?: { used: number; succeeded: number }; }
interface DeviceItem { id: string; name: string; platform: string; online: boolean; last_seen_at?: string | null; }
interface TaskItem { id: string; goal: string; status: string; step_count: number; created_at: string; }
interface Schedule { id: string; skill_id: string | null; title: string; goal: string; frequency: Frequency; hour: number; weekday: number | null; enabled: boolean; last_run_at?: string | null; last_task_id?: string | null; next_run_at: string; run_count: number; }
interface Approval { id: string; task_id: string; step_idx: number; tool_name: string; risk: string; summary: Record<string, string>; created_at: string; goal: string; }

const STATUS: Record<string, { label: string; cls: string; Icon: any }> = {
  planning: { label: "規劃中", cls: "text-sky-500", Icon: Loader2 },
  running: { label: "執行中", cls: "text-sky-500", Icon: Loader2 },
  awaiting_approval: { label: "等你確認", cls: "text-amber-500", Icon: Clock },
  awaiting_device: { label: "等電腦上線", cls: "text-amber-500", Icon: Clock },
  succeeded: { label: "完成", cls: "text-emerald-500", Icon: CheckCircle2 },
  failed: { label: "失敗", cls: "text-rose-500", Icon: XCircle },
  cancelled: { label: "已取消", cls: "text-black/40 dark:text-white/40", Icon: XCircle },
};

// 熱門任務（對標 Genspark「熱門任務」）——用預填、讓使用者看過再送出，不自動燒 API。
// 資料來源＝生活助理範本庫（`@/lib/agent/task-templates`），office 只取 popular 子集、不重複定義。
// 全部範本（分類 tab）在 /agent/templates。needsDevice=需本機電腦、needsOAuth=需連外部帳號（即將開放）。
const QUICK_TASKS = popularTemplates();

function isToday(iso: string) {
  const d = new Date(iso); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function OfficeClient() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [brief, setBrief] = useState<string[]>([]);
  const [kpi, setKpi] = useState<{ total: number; successRate: number | null; avgSteps: number; interventionRate: number } | null>(null);
  const [decidingId, setDecidingId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [roaming, setRoaming] = useState<Set<string>>(new Set()); // 放養中的員工 id（本次）

  // 放養：派員工「出去逛」——讀取型瀏覽任務（逛論壇/網站→回來匯報）。純讀取、不對外留言（守紅線）。
  const roamOut = async (s: SkillItem) => {
    if (roaming.has(s.id)) return;
    const goal = `🦞 放養巡邏：以「${s.name}（${s.description || "團隊成員"}）」的職能角度，用 web.search / web.research 出去逛相關的論壇、社群、新聞或討論區，找 3–5 個有趣或值得注意的討論、新知或趨勢，帶回來跟我匯報（每則：標題 + 一句重點 + 連結）。純瀏覽閱讀、絕不對外留言或發文。`;
    setRoaming((p) => new Set(p).add(s.id));
    try {
      const r = await fetch("/api/agent/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal, skillId: s.id }) });
      if (!r.ok) { setRoaming((p) => { const n = new Set(p); n.delete(s.id); return n; }); }
      else { loadTasks(); }
    } catch { setRoaming((p) => { const n = new Set(p); n.delete(s.id); return n; }); }
  };
  // 新增排程表單
  const [schedOpen, setSchedOpen] = useState(false);
  const [sGoal, setSGoal] = useState("");
  const [sSkill, setSSkill] = useState("");
  const [sFreq, setSFreq] = useState<Frequency>("daily");
  const [sHour, setSHour] = useState(9);
  const [sWeekday, setSWeekday] = useState(1);
  const [sBusy, setSBusy] = useState(false);
  const [sErr, setSErr] = useState("");

  const loadApprovals = async () => {
    const d = await fetch("/api/agent/approvals").then((r) => (r.ok ? r.json() : { approvals: [] })).catch(() => ({ approvals: [] }));
    setApprovals(d.approvals ?? []);
  };
  const loadTasks = async () => {
    const d = await fetch("/api/agent/tasks").then((r) => (r.ok ? r.json() : { tasks: [] })).catch(() => ({ tasks: [] }));
    setTasks(d.tasks ?? []);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const [sk, dv, tk, sc, ap, kp, br] = await Promise.all([
        fetch("/api/agent/skills").then((r) => (r.ok ? r.json() : { skills: [] })).catch(() => ({ skills: [] })),
        fetch("/api/agent/devices").then((r) => (r.ok ? r.json() : { devices: [] })).catch(() => ({ devices: [] })),
        fetch("/api/agent/tasks").then((r) => (r.ok ? r.json() : { tasks: [] })).catch(() => ({ tasks: [] })),
        fetch("/api/agent/schedules").then((r) => (r.ok ? r.json() : { schedules: [] })).catch(() => ({ schedules: [] })),
        fetch("/api/agent/approvals").then((r) => (r.ok ? r.json() : { approvals: [] })).catch(() => ({ approvals: [] })),
        fetch("/api/agent/kpi").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/agent/daily-brief").then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
      ]);
      if (!alive) return;
      setSkills(sk.skills ?? []);
      setDevices(dv.devices ?? []);
      setTasks(tk.tasks ?? []);
      setSchedules(sc.schedules ?? []);
      setApprovals(ap.approvals ?? []);
      setKpi(kp && typeof kp.total === "number" ? kp : null);
      setBrief(Array.isArray(br?.items) ? br.items : []);
      setLoading(false);
    })();
    // 每 10 秒刷新「工作中的任務 + 待批准佇列」（看員工在工作 / 隨時冒出的待批准）。
    // 只有分頁在前景 + 有任務在跑（或有待批准）才刷、省流量。
    const iv = setInterval(() => {
      if (!alive || (typeof document !== "undefined" && document.visibilityState !== "visible")) return;
      const hasLive = tasksRef.current.some((t) => ["planning", "running", "awaiting_approval", "awaiting_device"].includes(t.status));
      if (hasLive || approvalsRef.current.length > 0) { loadTasks(); loadApprovals(); }
    }, 10000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  // 讓 interval 讀到最新的 tasks/approvals（避免閉包抓到初始空陣列 → 永遠不刷）
  const tasksRef = useRef<TaskItem[]>([]);
  const approvalsRef = useRef<Approval[]>([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { approvalsRef.current = approvals; }, [approvals]);

  const decideApproval = async (id: string, decision: "approved" | "denied") => {
    if (decidingId) return;
    setDecidingId(id);
    const prev = approvals;
    setApprovals((cur) => cur.filter((a) => a.id !== id)); // 樂觀移除
    const r = await fetch(`/api/agent/approvals/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
    }).catch(() => null);
    if (!r?.ok) setApprovals(prev); // 失敗回復
    setDecidingId("");
  };

  const addSchedule = async () => {
    const goal = sGoal.trim();
    if (!goal || sBusy) { if (!goal) setSErr("先寫要自動執行的指令"); return; }
    setSBusy(true); setSErr("");
    try {
      const r = await fetch("/api/agent/schedules", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, skillId: sSkill || undefined, frequency: sFreq, hour: sHour, weekday: sFreq === "weekly" ? sWeekday : undefined }),
      });
      const d = await r.json();
      if (!r.ok) { setSErr(d.error ?? "新增失敗"); return; }
      setSchedules((cur) => [d.schedule, ...cur]);
      setSGoal(""); setSSkill(""); setSchedOpen(false);
    } catch { setSErr("連線失敗"); } finally { setSBusy(false); }
  };

  const toggleSchedule = async (s: Schedule) => {
    const next = !s.enabled;
    setSchedules((cur) => cur.map((x) => (x.id === s.id ? { ...x, enabled: next } : x)));
    const r = await fetch(`/api/agent/schedules/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: next }) }).catch(() => null);
    if (r?.ok) { const d = await r.json(); setSchedules((cur) => cur.map((x) => (x.id === s.id ? d.schedule : x))); }
    else setSchedules((cur) => cur.map((x) => (x.id === s.id ? { ...x, enabled: s.enabled } : x))); // 失敗回復
  };

  const deleteSchedule = async (id: string) => {
    setSchedules((cur) => cur.filter((x) => x.id !== id));
    await fetch(`/api/agent/schedules/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const employees = skills.filter((s) => s.installed);
  const onlineDevice = devices.find((d) => d.online);
  const todayTasks = tasks.filter((t) => isToday(t.created_at));
  const liveCount = tasks.filter((t) => ["planning", "running", "awaiting_approval", "awaiting_device"].includes(t.status)).length;
  const doneToday = todayTasks.filter((t) => t.status === "succeeded").length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-5">
        <Link href={"/agent" as any} className="inline-flex items-center gap-1 text-xs text-black/50 dark:text-white/50 hover:text-violet-500 mb-2">
          <ChevronLeft className="w-3.5 h-3.5" /> 回下令列
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">🏢 AI 員工辦公室</h1>
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">看每位員工的狀態、一鍵派熱門任務、看今日產出。<b>對外動作（發文/報名）一律先問過你才做。</b></p>
          </div>
          <Link href={"/agent" as any} className="inline-flex items-center gap-1.5 text-xs rounded-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-2">
            <Bot className="w-4 h-4" /> 開下令列
          </Link>
        </div>
      </div>

      {/* 今日 3 件事（規則式建議、零 AI 成本）*/}
      {brief.length > 0 && (
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-4 mb-4">
          <div className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-violet-700 dark:text-violet-300"><Sparkles className="w-4 h-4" /> 今天值得做的 3 件事</div>
          <ol className="space-y-1.5">
            {brief.map((b, i) => (
              <li key={i} className="text-sm flex gap-2"><span className="text-violet-500 font-semibold shrink-0">{i + 1}.</span><span>{b}</span></li>
            ))}
          </ol>
        </div>
      )}

      {/* 狀態列（對標 Genspark 右側狀態面板）*/}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {/* 裝置狀態 */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-[11px] text-black/40 dark:text-white/40 mb-1.5">本機電腦</div>
          {onlineDevice ? (
            <div className="flex items-center gap-2">
              <Laptop className="w-5 h-5 text-emerald-500" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{onlineDevice.name}</div>
                <div className="text-[11px] text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> 已連線 · {onlineDevice.platform}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LaptopMinimal className="w-5 h-5 text-black/30 dark:text-white/30" />
                <div className="text-sm text-black/50 dark:text-white/50">未連線</div>
              </div>
              <Link href={"/agent" as any} className="text-[11px] text-violet-500 hover:underline shrink-0">去連結 →</Link>
            </div>
          )}
        </div>
        {/* 員工數 */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-[11px] text-black/40 dark:text-white/40 mb-1.5">我的 AI 員工</div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-500" />
            <div className="text-sm font-medium">{loading ? "…" : employees.length} 位在職</div>
            {liveCount > 0 && <span className="text-[11px] text-sky-500">· {liveCount} 位工作中</span>}
          </div>
        </div>
        {/* 今日產出 */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
          <div className="text-[11px] text-black/40 dark:text-white/40 mb-1.5">今日產出</div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div className="text-sm font-medium">{loading ? "…" : `${doneToday} 件完成`}</div>
            {todayTasks.length > doneToday && <span className="text-[11px] text-black/40 dark:text-white/40">· 共 {todayTasks.length} 件</span>}
          </div>
        </div>
      </div>

      {/* 分身表現（有完成過任務才顯示）*/}
      {kpi && kpi.total > 0 && kpi.successRate != null && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-black/50 dark:text-white/50 mb-5 -mt-2">
          <span>分身表現：成功率 <b className="text-emerald-600 dark:text-emerald-400">{kpi.successRate}%</b></span>
          <span>· 平均 {kpi.avgSteps} 步/任務</span>
          <span>· 你介入 {kpi.interventionRate}%</span>
          <span>· 共 {kpi.total} 個任務</span>
        </div>
      )}

      {/* 待批准佇列（有才顯示；對外/寫入動作在這裡一鍵放行）*/}
      {approvals.length > 0 && (
        <section className="mb-6">
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-4">
            <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4" /> 等你確認 <span className="text-[11px] font-normal">· {approvals.length} 個動作要你放行才做</span>
            </h2>
            <div className="space-y-1.5">
              {approvals.map((a) => (
                <div key={a.id} className="rounded-xl border border-black/10 dark:border-white/10 bg-bg-card/60 dark:bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-black/40 dark:text-white/40 truncate">任務：{a.goal || a.task_id}</div>
                      <div className="text-sm font-medium flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">{a.tool_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.risk === "dangerous" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>{a.risk === "dangerous" ? "高風險" : "會寫入"}</span>
                      </div>
                      {a.summary && Object.keys(a.summary).length > 0 && (
                        <div className="mt-1 text-[11px] text-black/55 dark:text-white/55 space-y-0.5">
                          {Object.entries(a.summary).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="break-words"><span className="text-black/40 dark:text-white/40">{k}：</span>{String(v)}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link href={`/agent?task=${a.task_id}` as any} className="text-[11px] text-violet-500 hover:underline px-1">看任務</Link>
                      <button onClick={() => decideApproval(a.id, "denied")} disabled={!!decidingId} className="inline-flex items-center gap-1 text-xs rounded-lg border border-black/15 dark:border-white/20 px-2.5 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"><X className="w-3.5 h-3.5" /> 取消</button>
                      <button onClick={() => decideApproval(a.id, "approved")} disabled={!!decidingId} className="inline-flex items-center gap-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> 允許</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 熱門任務 */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-500" /> 熱門任務 <span className="text-[11px] font-normal text-black/40 dark:text-white/40">· 點一下＝預填指令，看過再送出</span></h2>
          <Link href={"/agent/templates" as any} className="inline-flex items-center gap-1 text-[11px] text-violet-500 hover:underline shrink-0">看全部範本 <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {QUICK_TASKS.map((q) => {
            const deviceBlocked = q.needsDevice && !onlineDevice;
            const disabled = deviceBlocked || q.needsOAuth;
            const inner = (
              <>
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl leading-none">{q.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium flex items-center gap-1.5">{q.title}
                      {q.needsDevice && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">需電腦</span>}
                      {q.needsOAuth && <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400">即將開放</span>}
                    </div>
                    <div className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">{q.hint}</div>
                  </div>
                  {!disabled && <ArrowRight className="w-4 h-4 text-black/25 dark:text-white/25 shrink-0 mt-0.5" />}
                </div>
              </>
            );
            if (disabled) {
              return (
                <div key={q.id} title={q.needsOAuth ? "需連結外部帳號（Gmail / 行事曆），即將開放" : "先連結你的電腦（回下令列 → 連結電腦）"} className="rounded-xl border border-black/10 dark:border-white/10 p-3 opacity-50 cursor-not-allowed">
                  {inner}
                </div>
              );
            }
            return (
              <Link key={q.id} href={`/agent?goal=${encodeURIComponent(q.goal)}` as any} className="rounded-xl border border-black/10 dark:border-white/10 p-3 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 我的 AI 員工 */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><Bot className="w-4 h-4 text-violet-500" /> 我的 AI 員工</h2>
          <Link href={"/agent" as any} className="inline-flex items-center gap-1 text-[11px] text-violet-500 hover:underline"><Store className="w-3.5 h-3.5" /> 技能商店 · 招募</Link>
        </div>
        {loading ? (
          <div className="text-xs text-black/40 dark:text-white/40 py-6 text-center">載入中…</div>
        ) : employees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 dark:border-white/15 p-6 text-center">
            <div className="text-sm text-black/60 dark:text-white/60">還沒有在職員工</div>
            <Link href={"/agent" as any} className="inline-flex items-center gap-1.5 mt-2 text-xs rounded-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5"><Store className="w-3.5 h-3.5" /> 去技能商店招募</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {employees.map((s) => {
              const roam = roaming.has(s.id);
              return (
              <div key={s.id} className="rounded-xl border border-black/10 dark:border-white/10 p-3 hover:border-violet-400 dark:hover:border-violet-500 transition flex flex-col">
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl leading-none">{s.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">{s.name}{!s.is_builtin && <span className="text-[9px] text-violet-500">我訓練的</span>}</div>
                    <div className="text-[11px] text-black/50 dark:text-white/50 line-clamp-2">{s.description}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className={`text-[11px] flex items-center gap-1 ${roam ? "text-amber-500" : "text-emerald-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${roam ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} /> {roam ? "🦞 放養中·巡邏" : "🏢 在職"}
                  </span>
                  <span className="text-[10px] text-black/35 dark:text-white/35">{s.usage && s.usage.used > 0 ? `用過 ${s.usage.used} 次` : ""}</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Link href={`/agent?skill=${encodeURIComponent(s.id)}` as any} className="flex-1 text-center text-[11px] rounded-lg border border-black/10 dark:border-white/15 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center justify-center gap-0.5">派工 <ArrowRight className="w-3 h-3" /></Link>
                  <button onClick={() => roamOut(s)} disabled={roam} title="派他出去逛論壇/網站，回來匯報（純讀取、不留言）" className="flex-1 text-[11px] rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white py-1.5 disabled:opacity-50">🦞 放養</button>
                </div>
              </div>
              );
            })}
          </div>
        )}
        {employees.length > 0 && (
          <p className="text-[11px] text-black/40 dark:text-white/40 mt-2">🦞 放養＝派員工出去逛論壇/網站、回來在下方「最近工作」匯報所見所聞（純瀏覽、不對外留言）。</p>
        )}
      </section>

      {/* AI 員工會議室 */}
      <MeetingRoom employees={employees} />

      {/* 排程自動跑 */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-violet-500" /> 排程自動跑 <span className="text-[11px] font-normal text-black/40 dark:text-white/40">· 讓員工每天/每週自動做一件事</span></h2>
          <button onClick={() => { setSchedOpen((v) => !v); setSErr(""); }} className="inline-flex items-center gap-1 text-[11px] rounded-full border border-violet-500/40 text-violet-600 dark:text-violet-400 px-2.5 py-1 hover:bg-violet-500/10">
            <Plus className="w-3.5 h-3.5" /> 新增排程
          </button>
        </div>

        {/* 新增表單 */}
        {schedOpen && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 mb-2.5 space-y-2.5">
            <textarea value={sGoal} onChange={(e) => setSGoal(e.target.value)} rows={2} placeholder="要自動執行的指令（例：找 3 個近期截止的免費競賽，列出截止日和來源）" className="w-full resize-none rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-400" />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select value={sSkill} onChange={(e) => setSSkill(e.target.value)} className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1.5">
                <option value="">通用分身（不指定員工）</option>
                {employees.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
              </select>
              <select value={sFreq} onChange={(e) => setSFreq(e.target.value as Frequency)} className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1.5">
                <option value="daily">每天</option>
                <option value="weekly">每週</option>
              </select>
              {sFreq === "weekly" && (
                <select value={sWeekday} onChange={(e) => setSWeekday(Number(e.target.value))} className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1.5">
                  {["日", "一", "二", "三", "四", "五", "六"].map((w, i) => <option key={i} value={i}>週{w}</option>)}
                </select>
              )}
              <select value={sHour} onChange={(e) => setSHour(Number(e.target.value))} className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1.5">
                {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
              <span className="text-[11px] text-black/40 dark:text-white/40">台灣時間</span>
              <button onClick={addSchedule} disabled={sBusy} className="ml-auto text-xs rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 disabled:opacity-50">{sBusy ? "新增中…" : "新增"}</button>
            </div>
            {sErr && <div className="text-[11px] text-rose-500">{sErr}</div>}
            <p className="text-[11px] text-black/40 dark:text-white/40">排程只會「發起任務」；任務內若要對外（發文/報名）仍會先問過你才做。</p>
          </div>
        )}

        {/* 排程清單 */}
        {loading ? (
          <div className="text-xs text-black/40 dark:text-white/40 py-4 text-center">載入中…</div>
        ) : schedules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 dark:border-white/15 p-5 text-center text-xs text-black/50 dark:text-white/50">
            還沒有排程。設一個「每天早上找機會」試試？
          </div>
        ) : (
          <div className="space-y-1.5">
            {schedules.map((s) => {
              const emp = s.skill_id ? skills.find((k) => k.id === s.skill_id) : null;
              return (
                <div key={s.id} className={`rounded-xl border border-black/10 dark:border-white/10 px-3 py-2.5 ${s.enabled ? "" : "opacity-55"}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg leading-none mt-0.5">{emp?.emoji ?? "🕒"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.title || describeSchedule(s.frequency, s.hour, s.weekday)}</div>
                      <div className="text-[11px] text-black/50 dark:text-white/50 truncate">{s.goal}</div>
                      <div className="text-[11px] text-black/40 dark:text-white/40 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span className="text-violet-500">{describeSchedule(s.frequency, s.hour, s.weekday)}</span>
                        {emp && <span>· {emp.name}</span>}
                        {s.enabled ? <span>· 下次 {new Date(s.next_run_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</span> : <span>· 已暫停</span>}
                        {s.run_count > 0 && <span>· 已跑 {s.run_count} 次</span>}
                        {s.last_task_id && <Link href={`/agent?task=${s.last_task_id}` as any} className="text-violet-500 hover:underline">看上次結果</Link>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleSchedule(s)} title={s.enabled ? "暫停" : "啟用"} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${s.enabled ? "text-emerald-500" : "text-black/30 dark:text-white/30"}`}><Power className="w-4 h-4" /></button>
                      <button onClick={() => deleteSchedule(s.id)} title="刪除" className="p-1.5 rounded-lg hover:bg-rose-500/10 text-black/30 dark:text-white/30 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 今日 / 最近產出 */}
      <section>
        <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" /> 最近的工作</h2>
        {loading ? (
          <div className="text-xs text-black/40 dark:text-white/40 py-6 text-center">載入中…</div>
        ) : tasks.length === 0 ? (
          <div className="text-xs text-black/40 dark:text-white/40 py-6 text-center">還沒有任務。從上面的熱門任務開始吧。</div>
        ) : (
          <div className="space-y-1.5">
            {tasks.slice(0, 8).map((t) => {
              const st = STATUS[t.status] ?? { label: t.status, cls: "text-black/40", Icon: Clock };
              const Icon = st.Icon;
              return (
                <Link key={t.id} href={`/agent?task=${t.id}` as any} className="flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
                  <Icon className={`w-4 h-4 shrink-0 ${st.cls} ${t.status === "running" || t.status === "planning" ? "animate-spin" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{t.goal}</div>
                    <div className="text-[11px] text-black/40 dark:text-white/40">{new Date(t.created_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} · {t.step_count} 步</div>
                  </div>
                  <span className={`text-[11px] shrink-0 ${st.cls}`}>{st.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

// AI 員工會議室：設主題 → 各員工按職能+個性輪流發言（一個接一個吐、療癒向）。
function MeetingRoom({ employees }: { employees: SkillItem[] }) {
  const [topic, setTopic] = useState("");
  const [msgs, setMsgs] = useState<{ id: string; name: string; emoji: string; text: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const run = async () => {
    const t = topic.trim();
    if (!t || busy) return;
    setBusy(true); setNote(""); setMsgs([]);
    try {
      const r = await fetch("/api/agent/office/meeting", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: t }),
      });
      const d = await r.json();
      if (!r.ok) { setNote(d.error ?? "開會失敗"); return; }
      if (d.note) setNote(d.note);
      const list: { id: string; name: string; emoji: string; text: string }[] = d.messages ?? [];
      for (let i = 0; i < list.length; i++) {
        await new Promise((res) => setTimeout(res, i === 0 ? 0 : 550));
        setMsgs((m) => [...m, list[i]]);
      }
    } catch { setNote("開會失敗，稍後再試"); } finally { setBusy(false); }
  };

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">🗣️ 員工會議室 <span className="text-[11px] font-normal text-black/40 dark:text-white/40">· 設個主題，讓 AI 員工各抒己見</span></h2>
      </div>
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3">
        <div className="flex gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            placeholder="會議主題（例：這週要不要做 AI 開會功能？）"
            className="flex-1 rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-400" />
          <button onClick={run} disabled={busy || !topic.trim()} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white px-4 py-2 text-sm font-medium">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "開會"}
          </button>
        </div>
        {employees.length === 0 && <p className="text-[11px] text-black/40 dark:text-white/40 mt-2">還沒有在職員工——先去技能商店安裝或建員工。</p>}
        {note && <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">{note}</p>}
        {msgs.length > 0 && (
          <div className="mt-3 space-y-2">
            {msgs.map((m, i) => (
              <div key={i} className="flex gap-2 items-start animate-[fadeIn_.3s_ease]">
                <span className="text-lg leading-none shrink-0">{m.emoji}</span>
                <div className="min-w-0">
                  <div className="text-[11px] text-black/50 dark:text-white/50">{m.name} · 會議發言</div>
                  <div className="text-sm rounded-lg bg-black/5 dark:bg-white/5 px-3 py-1.5 mt-0.5 break-words">{m.text}</div>
                </div>
              </div>
            ))}
            {!busy && <button onClick={run} className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline mt-1">再開一輪 →</button>}
          </div>
        )}
      </div>
    </section>
  );
}
