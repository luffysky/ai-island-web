"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, ArrowLeft, Trash2, CalendarClock, ExternalLink, Bot, AlertTriangle } from "lucide-react";

interface RouteRow {
  id: string; opportunity_id: string; stage: string; note?: string;
  opportunity?: { id: string; name: string; category?: string; organizer?: string; prize_text?: string; application_deadline?: string | null; status: string; official_url?: string } | null;
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

  const load = async () => {
    try { const r = await fetch("/api/opportunities/routes"); const d = await r.json(); setRoutes(d.routes ?? []); } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

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
                    {dl != null && dl >= 0 && (
                      <Link href={`/agent?goal=${encodeURIComponent(prepGoal)}` as any} className="inline-flex items-center gap-1 mt-2.5 text-xs text-violet-600 dark:text-violet-400 hover:underline">
                        <Bot className="w-3.5 h-3.5" /> 丟給分身島幫我準備
                      </Link>
                    )}
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
