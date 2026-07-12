"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Compass, ExternalLink, Bookmark, BookmarkCheck, AlertTriangle, CalendarClock, Trophy } from "lucide-react";

interface Opp {
  id: string; type: string; name: string; organizer?: string; country?: string; category?: string;
  official_url?: string; prize_text?: string; application_deadline?: string | null;
  is_free?: boolean; requires_demo?: boolean; requires_pitch?: boolean; tags?: string[];
  status: string; source_confidence?: string; ai_island_fit_score?: number | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "開放中", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  upcoming: { label: "即將開始", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  closed: { label: "已截止", cls: "bg-black/10 dark:bg-white/10 text-black/50 dark:text-white/50" },
};
const CATS = ["AI", "創業", "設計", "音樂", "黑客松", "數位創新", "校園"];

function daysLeft(deadline?: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline + "T23:59:59").getTime() - Date.now();
  return Math.ceil(d / 86400000);
}

export function OpportunityBrowse() {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (cat) p.set("category", cat);
    if (freeOnly) p.set("free", "1");
    if (status) p.set("status", status);
    try {
      const r = await fetch(`/api/opportunities?${p.toString()}`);
      const d = await r.json();
      setOpps(d.opportunities ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [q, cat, freeOnly, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/opportunities/routes");
        const d = await r.json();
        setSaved(new Set((d.routes ?? []).map((x: any) => x.opportunity_id)));
      } catch { /* ignore */ }
    })();
  }, []);

  const toggleSave = async (id: string) => {
    const has = saved.has(id);
    setSaved((prev) => { const n = new Set(prev); if (has) n.delete(id); else n.add(id); return n; });
    try {
      if (has) await fetch(`/api/opportunities/routes?id=${id}`, { method: "DELETE" });
      else {
        const r = await fetch("/api/opportunities/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityId: id }) });
        if (r.status === 401) { window.location.href = "/login?next=/opportunities"; return; }
      }
    } catch { /* ignore；下次 load 會校正 */ }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      {/* Hero */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Compass className="w-7 h-7 text-violet-500" /> 機會島</h1>
          <Link href="/opportunities/routes" className="text-sm rounded-full px-3 py-1.5 border border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10">🧭 我的航線</Link>
        </div>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">競賽 · 補助 · 創投 · 徵件 —— 找到適合你的機會，加入「我的航線」追蹤截止日。</p>
        <p className="text-[11px] text-amber-600/90 dark:text-amber-400/80 mt-1 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 目前為初始資料、部分欄位「待人工核實」，實際以官網為準。</p>
      </div>

      {/* 搜尋 + 篩選 */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-3 mb-5">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋競賽名稱 / 主辦 / 類別…"
            className="flex-1 bg-transparent outline-none text-sm min-w-0" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <button onClick={() => setCat("")} className={`text-xs rounded-full px-2.5 py-1 border ${!cat ? "bg-violet-600 border-violet-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>全部</button>
          {CATS.map((cName) => (
            <button key={cName} onClick={() => setCat(cName === cat ? "" : cName)} className={`text-xs rounded-full px-2.5 py-1 border ${cat === cName ? "bg-violet-600 border-violet-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"}`}>{cName}</button>
          ))}
          <span className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
          <button onClick={() => setFreeOnly((v) => !v)} className={`text-xs rounded-full px-2.5 py-1 border ${freeOnly ? "bg-emerald-600 border-emerald-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>免報名費</button>
          <button onClick={() => setStatus(status === "open" ? "" : "open")} className={`text-xs rounded-full px-2.5 py-1 border ${status === "open" ? "bg-emerald-600 border-emerald-600 text-white" : "border-black/10 dark:border-white/15 text-black/70 dark:text-white/70"}`}>開放中</button>
        </div>
      </div>

      {/* 清單 */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />)}</div>
      ) : opps.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50 text-center py-10">找不到符合的機會，換個條件試試。</p>
      ) : (
        <ul className="space-y-3">
          {opps.map((o) => {
            const dl = daysLeft(o.application_deadline);
            const st = STATUS[o.status] ?? STATUS.open;
            const isSaved = saved.has(o.id);
            return (
              <li key={o.id} className="rounded-2xl border border-black/10 dark:border-white/10 p-4 hover:border-violet-500/30 transition">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      {o.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">{o.category}</span>}
                      {o.is_free && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">免報名費</span>}
                      {o.source_confidence !== "verified" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">待核實</span>}
                    </div>
                    <Link href={`/opportunities/${o.id}`} className="font-bold text-base leading-snug hover:text-violet-600 dark:hover:text-violet-400">{o.name}</Link>
                    {o.organizer && <div className="text-xs text-black/50 dark:text-white/50 mt-0.5">{o.organizer}</div>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-black/60 dark:text-white/60">
                      {o.prize_text && <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-500" /> {o.prize_text}</span>}
                      {o.application_deadline && (
                        <span className="inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> 截止 {o.application_deadline}
                          {dl != null && dl >= 0 && <span className={`ml-1 ${dl <= 14 ? "text-rose-500 font-semibold" : ""}`}>· 剩 {dl} 天</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => toggleSave(o.id)} title={isSaved ? "從航線移除" : "加入我的航線"}
                      className={`p-2 rounded-xl border transition ${isSaved ? "border-violet-500/40 text-violet-600 dark:text-violet-400 bg-violet-500/10" : "border-black/10 dark:border-white/15 text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/10"}`}>
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                    {o.official_url && (
                      <a href={o.official_url} target="_blank" rel="noreferrer" title="官方網站" className="p-2 rounded-xl border border-black/10 dark:border-white/15 text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/10">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
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
