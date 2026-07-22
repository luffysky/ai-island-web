"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, ArrowLeft, Trash2, CalendarClock, ExternalLink, Bot, AlertTriangle, ListChecks, Plus, ChevronDown, ChevronUp, Check, Wand2 } from "lucide-react";

interface OppLite {
  id: string; name: string; category?: string; organizer?: string; prize_text?: string;
  application_deadline?: string | null; status: string; official_url?: string;
  requires_demo?: boolean; requires_pitch?: boolean; requires_video?: boolean;
  requires_business_plan?: boolean; requires_team?: boolean; requires_student?: boolean; requires_company?: boolean;
}
interface RouteRow {
  id: string; opportunity_id: string; stage: string; note?: string;
  opportunity?: OppLite | null;
}
interface Task { id: string; opportunity_id: string; title: string; done: boolean; due_date?: string | null; sort_index: number; }

// 依機會的 requires_* 旗標推常見缺件清單（帶入建議用）
function suggestedItems(o: OppLite): string[] {
  const items = ["填寫線上報名表", "準備作品 / 專案簡介（300 字內）"];
  if (o.requires_demo) items.push("準備可運作的 Demo");
  if (o.requires_video) items.push("錄製 3 分鐘 Demo 影片");
  if (o.requires_pitch) items.push("做簡報並練習口頭 pitch");
  if (o.requires_business_plan) items.push("撰寫商業計畫書");
  if (o.requires_team) items.push("確認團隊成員與分工");
  if (o.requires_student) items.push("備妥在學證明 / 學生證");
  if (o.requires_company) items.push("備妥公司 / 法人登記文件");
  items.push("再次核對官網規則與截止時間");
  return items;
}

const STAGES = [
  { key: "saved", label: "已收藏" },
  { key: "preparing", label: "準備中" },
  { key: "submitted", label: "已投件" },
  { key: "done", label: "完成" },
];

function daysLeft(deadline?: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline + "T23:59:59").getTime() - Date.now()) / 86400000);
}

export function MyRoutesClient() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);          // 全部缺件（依 opportunity_id 分組用）
  const [openChecklist, setOpenChecklist] = useState<Set<string>>(new Set());  // 展開哪些機會的清單
  const [draft, setDraft] = useState<Record<string, string>>({});  // 各機會的新增輸入框

  const load = async () => {
    try {
      const [r, t] = await Promise.all([
        fetch("/api/opportunities/routes").then((x) => x.json()),
        fetch("/api/opportunities/submission-tasks").then((x) => x.json()),
      ]);
      setRoutes(r.routes ?? []);
      setTasks(t.tasks ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleChecklist = (oppId: string) =>
    setOpenChecklist((prev) => { const n = new Set(prev); n.has(oppId) ? n.delete(oppId) : n.add(oppId); return n; });

  const addTask = async (oppId: string, title: string) => {
    const t = title.trim();
    if (!t) return;
    setDraft((d) => ({ ...d, [oppId]: "" }));
    try {
      const r = await fetch("/api/opportunities/submission-tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: oppId, title: t }),
      });
      if (r.status === 401) { window.location.href = "/login?next=/opportunities/routes"; return; }
      const d = await r.json();
      if (d.tasks) setTasks((prev) => [...prev, ...d.tasks]);
    } catch { /* ignore */ }
  };
  const seedTasks = async (o: OppLite) => {
    const existing = new Set(tasks.filter((t) => t.opportunity_id === o.id).map((t) => t.title));
    const titles = suggestedItems(o).filter((t) => !existing.has(t));
    if (titles.length === 0) return;
    try {
      const r = await fetch("/api/opportunities/submission-tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: o.id, titles }),
      });
      if (r.status === 401) { window.location.href = "/login?next=/opportunities/routes"; return; }
      const d = await r.json();
      if (d.tasks) setTasks((prev) => [...prev, ...d.tasks]);
    } catch { /* ignore */ }
  };
  const toggleTask = async (task: Task) => {
    const done = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done } : t)));
    await fetch("/api/opportunities/submission-tasks", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, done }),
    }).catch(() => {});
  };
  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/opportunities/submission-tasks?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  const setStage = async (opportunityId: string, stage: string) => {
    setRoutes((prev) => prev.map((r) => (r.opportunity_id === opportunityId ? { ...r, stage } : r)));
    await fetch("/api/opportunities/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityId, stage }) }).catch(() => {});
  };
  const remove = async (opportunityId: string) => {
    setRoutes((prev) => prev.filter((r) => r.opportunity_id !== opportunityId));
    await fetch(`/api/opportunities/routes?id=${opportunityId}`, { method: "DELETE" }).catch(() => {});
  };

  // 排序：報名中且截止近的排前面；已截止/沒截止日排後面
  const rankOf = (dl: number | null) => (dl == null ? 2 : dl < 0 ? 1 : 0);
  const sorted = [...routes].sort((a, b) => {
    const la = daysLeft(a.opportunity?.application_deadline), lb = daysLeft(b.opportunity?.application_deadline);
    const ra = rankOf(la), rb = rankOf(lb);
    if (ra !== rb) return ra - rb;
    if (la != null && lb != null) return la - lb;
    return 0;
  });
  const urgentCount = routes.filter((r) => { const d = daysLeft(r.opportunity?.application_deadline); return d != null && d >= 0 && d <= 7; }).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <Link href="/opportunities" className="inline-flex items-center gap-1 text-sm text-black/50 dark:text-white/50 hover:text-violet-600 dark:hover:text-violet-400 mb-4">
        <ArrowLeft className="w-4 h-4" /> 機會島
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="w-6 h-6 text-violet-500" /> 我的航線</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mt-1">你收藏的機會 —— 追蹤截止日、更新投件進度。完成一站，下一站再出發。</p>

      {urgentCount > 0 && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1.5 text-xs font-medium">
          <AlertTriangle className="w-3.5 h-3.5" /> 有 {urgentCount} 個機會 7 天內截止，記得準備！
        </div>
      )}

      {loading ? (
        <div className="space-y-3 mt-5">{[1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />)}</div>
      ) : routes.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50 text-center py-12">航線還是空的。去 <Link href="/opportunities" className="text-violet-600 dark:text-violet-400 underline">機會島</Link> 加幾個機會吧。</p>
      ) : (
        <ul className="space-y-3 mt-5">
          {sorted.map((r) => {
            const o = r.opportunity;
            if (!o) return null;
            const dl = daysLeft(o.application_deadline);
            const urgent = dl != null && dl >= 0 && dl <= 7;
            const prepGoal = `幫我準備報名「${o.name}」${o.organizer ? `（主辦：${o.organizer}）` : ""}${o.application_deadline ? `，報名截止 ${o.application_deadline}` : ""}。請：① 列出報名要準備的文件清單 ② 把重要日期整理成待辦與截止提醒 ③ 建議我現在該先做的 3 件事。需要對外的動作（報名/寄信）先問過我。`;
            return (
              <li key={r.id} className={`rounded-2xl border p-4 ${urgent ? "border-rose-500/40 bg-rose-500/[0.04]" : "border-black/10 dark:border-white/10"}`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/opportunities/${o.id}`} className="font-bold hover:text-violet-600 dark:hover:text-violet-400">{o.name}</Link>
                      {urgent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold">快截止</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-black/60 dark:text-white/60">
                      {o.prize_text && <span>{o.prize_text}</span>}
                      {o.application_deadline && (
                        <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> 截止 {o.application_deadline}
                          {dl != null && dl >= 0 && <span className={dl <= 14 ? "text-rose-500 font-semibold ml-1" : "ml-1"}>· 剩 {dl} 天</span>}
                          {dl != null && dl < 0 && <span className="text-black/40 dark:text-white/40 ml-1">· 已截止</span>}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {STAGES.map((s) => (
                        <button key={s.key} onClick={() => setStage(o.id, s.key)}
                          className={`text-[11px] rounded-full px-2 py-0.5 border transition ${r.stage === s.key ? "bg-violet-600 border-violet-600 text-white" : "border-black/10 dark:border-white/15 text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10"}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
                      {dl != null && dl >= 0 && (
                        <Link href={`/agent?goal=${encodeURIComponent(prepGoal)}` as any} className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline">
                          <Bot className="w-3.5 h-3.5" /> 丟給分身島幫我準備
                        </Link>
                      )}
                      {(() => {
                        const list = tasks.filter((t) => t.opportunity_id === o.id);
                        const doneN = list.filter((t) => t.done).length;
                        return (
                          <button onClick={() => toggleChecklist(o.id)} className="inline-flex items-center gap-1 text-xs text-black/60 dark:text-white/60 hover:text-violet-600 dark:hover:text-violet-400">
                            <ListChecks className="w-3.5 h-3.5" /> 缺件清單
                            {list.length > 0 && <span className={`ml-0.5 tabular-nums ${doneN === list.length ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}>{doneN}/{list.length}</span>}
                            {openChecklist.has(o.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })()}
                    </div>

                    {openChecklist.has(o.id) && (() => {
                      const list = tasks.filter((t) => t.opportunity_id === o.id);
                      return (
                        <div className="mt-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.03] p-2.5">
                          {list.length === 0 ? (
                            <div className="text-xs text-black/50 dark:text-white/50 mb-2">還沒有缺件項目。可一鍵帶入這個機會的建議清單：</div>
                          ) : (
                            <ul className="space-y-1 mb-2">
                              {list.map((t) => (
                                <li key={t.id} className="flex items-center gap-2 group">
                                  <button onClick={() => toggleTask(t)} className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${t.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-black/25 dark:border-white/30"}`}>
                                    {t.done && <Check className="w-3 h-3" />}
                                  </button>
                                  <span className={`text-xs flex-1 min-w-0 ${t.done ? "line-through text-black/40 dark:text-white/40" : "text-black/75 dark:text-white/80"}`}>{t.title}</span>
                                  <button onClick={() => deleteTask(t.id)} className="shrink-0 text-black/20 dark:text-white/20 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="flex items-center gap-1.5">
                            <input
                              value={draft[o.id] ?? ""}
                              onChange={(e) => setDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") addTask(o.id, draft[o.id] ?? ""); }}
                              placeholder="新增一項要準備的東西…"
                              className="flex-1 min-w-0 bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/15 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-violet-500" />
                            <button onClick={() => addTask(o.id, draft[o.id] ?? "")} className="shrink-0 p-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white" title="新增"><Plus className="w-3.5 h-3.5" /></button>
                            <button onClick={() => seedTasks(o)} className="shrink-0 inline-flex items-center gap-1 text-[11px] rounded-lg border border-violet-500/40 text-violet-600 dark:text-violet-400 px-2 py-1 hover:bg-violet-500/10" title="依這個機會的要求帶入建議缺件"><Wand2 className="w-3.5 h-3.5" /> 建議缺件</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {o.official_url && <a href={o.official_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:text-violet-600"><ExternalLink className="w-4 h-4" /></a>}
                    <button onClick={() => remove(o.id)} title="移除" className="p-1.5 rounded-lg text-black/30 dark:text-white/30 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
