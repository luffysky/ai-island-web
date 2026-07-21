"use client";

import Link from "next/link";
import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, ArrowLeft, Dna, Palmtree, AlertTriangle, Sparkles, Target, CheckCircle2, Flag, Cpu } from "lucide-react";

type Dna = { traits: any; confidence: number; updated_at: string } | null;
type WsLite = { id: string; name: string; type: "personal" | "studio" };
type Equipped = { title?: string; name_color?: string; avatar_frame?: string };

function nameColorClass(v?: string): string {
  if (v === "aurora") return "bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent";
  if (v === "gold") return "text-amber-500 dark:text-amber-300";
  return "";
}

export function GrowthClient({ stats, initialDna, workspaces = [], scope = "all", equipped = {}, displayName = "創作者" }: { stats: { fragments: number; works: number; aiRuns: number; creatorXp?: number; creatorLevel?: number }; initialDna: Dna; workspaces?: WsLite[]; scope?: string; equipped?: Equipped; displayName?: string }) {
  const tr = useTranslations("creator");
  const [dna, setDna] = useState<Dna>(initialDna);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const t = dna?.traits ?? {};
  const [coach, setCoach] = useState<any | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachErr, setCoachErr] = useState<string | null>(null);

  async function getCoach() {
    setCoachBusy(true); setCoachErr(null);
    try {
      const res = await fetch("/api/creator-island/growth/coach", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error);
      setCoach(j.advice);
    } catch (e: any) { setCoachErr(e.message); } finally { setCoachBusy(false); }
  }

  async function recompute() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/creator-island/growth/dna", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error);
      setDna({ traits: j.traits, confidence: 0.6, updated_at: new Date().toISOString() });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold inline-flex items-center gap-1.5"><TrendingUp size={20} /> {tr("growthTitle")}</h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> {tr("growthBackToIsland")}</Link>
      </header>

      {/* 身分：名稱（可帶名稱顏色）+ 裝備中的稱號 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-lg font-bold ${nameColorClass(equipped.name_color)}`}>{displayName}</span>
        {equipped.title && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-bold">{equipped.title}</span>}
        <Link href="/store?tab=redeem" className="text-[11px] text-fg-muted hover:text-accent">＋ {tr("growthDecorate")}</Link>
      </div>

      {/* 範圍切換：個人島 vs 各工作室 vs 全部（碎片/作品本來就綁工作室、要能分開看） */}
      {workspaces.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-fg-muted mr-0.5">{tr("growthScope")}</span>
          {workspaces.map((w) => {
            const on = scope === w.id;
            return (
              <Link key={w.id} href={`/creator-island/growth?ws=${w.id}`}
                className={`px-2.5 py-1 rounded-full border transition inline-flex items-center gap-1 ${on ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
                {w.type === "personal" ? <><Palmtree size={12} /> {tr("growthPersonalIsland")}</> : w.name}
              </Link>
            );
          })}
          <Link href="/creator-island/growth?ws=all"
            className={`px-2.5 py-1 rounded-full border transition ${scope === "all" ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
            {tr("growthAllTotal")}
          </Link>
        </div>
      )}

      {/* #91 Creator XP / 等級（創作行為累積，與平台 XP 分開）*/}
      {(stats.creatorXp ?? 0) > 0 && (
        <div className="bg-gradient-to-r from-accent/10 to-accent-3/10 border border-accent/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="font-bold inline-flex items-center gap-1.5">🎨 {tr("growthCreatorLv")} {stats.creatorLevel ?? 1}</div>
          <div className="text-sm text-fg-muted">{tr("growthCreatorXp", { n: stats.creatorXp ?? 0 })}</div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[[tr("growthFragments"), stats.fragments], [tr("growthWorks"), stats.works], [tr("growthAiActions"), stats.aiRuns]].map(([l, v]) => (
          <div key={l as string} className="bg-bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-accent">{v as number}</div>
            <div className="text-xs text-fg-muted mt-1">{l as string}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-fg-muted -mt-2">{scope === "all" ? tr("growthScopeAll") : tr("growthScopeOne")}</p>

      {/* E9 創作 DNA 卡 */}
      <div className="bg-gradient-to-br from-accent-3/10 via-pink-500/10 to-violet-500/10 border border-accent-3/30 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold inline-flex items-center gap-1.5"><Dna size={16} /> {tr("growthMyDna")}</div>
          <button onClick={recompute} disabled={busy} className="text-xs px-3 py-1.5 rounded-full bg-accent text-white disabled:opacity-40">{busy ? tr("growthAnalyzing") : dna ? tr("growthUpdate") : tr("growthGenerate")}</button>
        </div>
        {err && <div className="text-xs text-red-400 inline-flex items-center gap-1"><AlertTriangle size={12} className="shrink-0" /> {err}</div>}
        {!dna && <p className="text-sm text-fg-muted">{tr("growthDnaEmpty")}</p>}
        {dna && (
          <div className="space-y-2 text-sm">
            {t.tone && <div><b className="text-accent-3">{tr("growthTone")}</b>{t.tone}</div>}
            {t.imagery?.length > 0 && <div><b className="text-accent-3">{tr("growthImagery")}</b>{t.imagery.join("、")}</div>}
            {t.strengths?.length > 0 && <div><b className="text-emerald-400">{tr("growthStrengths")}</b>{t.strengths.join("、")}</div>}
            {t.weaknesses?.length > 0 && <div><b className="text-amber-400">{tr("growthWeaknesses")}</b>{t.weaknesses.join("、")}</div>}
            {t.formats?.length > 0 && <div><b className="text-accent-3">{tr("growthFormats")}</b>{t.formats.join("、")}</div>}
            <div className="text-[10px] text-fg-muted pt-1">{tr("growthDnaMeta", { pct: Math.round((dna.confidence ?? 0) * 100), date: new Date(dna.updated_at).toLocaleDateString("zh-TW") })}</div>
          </div>
        )}
      </div>

      {/* AI 教練週報 */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold inline-flex items-center gap-1.5"><Sparkles size={16} className="text-accent" /> {tr("growthCoachTitle")}</div>
          <button onClick={getCoach} disabled={coachBusy} className="text-xs px-3 py-1.5 rounded-full bg-accent text-white disabled:opacity-40">{coachBusy ? tr("growthThinking") : coach ? tr("growthRegenerate") : tr("growthGenAdvice")}</button>
        </div>
        {coachErr && <div className="text-xs text-red-400 inline-flex items-center gap-1"><AlertTriangle size={12} className="shrink-0" /> {coachErr}</div>}
        {!coach && !coachErr && <p className="text-sm text-fg-muted">{tr("growthCoachEmpty")}</p>}
        {coach && (
          <div className="space-y-3 text-sm">
            <p className="text-fg">{coach.encouragement}</p>
            {coach.wins?.length > 0 && (
              <div><div className="text-emerald-500 font-bold inline-flex items-center gap-1 mb-1"><CheckCircle2 size={14} /> {tr("growthRecentWins")}</div>
                <ul className="space-y-0.5">{coach.wins.map((w: string, i: number) => <li key={i} className="text-fg-muted">・{w}</li>)}</ul></div>
            )}
            {coach.focus && <div className="bg-accent/[0.06] border border-accent/20 rounded-xl p-3"><div className="text-accent font-bold inline-flex items-center gap-1 mb-0.5"><Target size={14} /> {tr("growthWeekFocus")}</div><div>{coach.focus}</div></div>}
            {coach.nextSteps?.length > 0 && (
              <div><div className="font-bold mb-1">{tr("growthNextSteps")}</div>
                <ul className="space-y-0.5">{coach.nextSteps.map((s: string, i: number) => <li key={i} className="text-fg-muted">{i + 1}. {s}</li>)}</ul></div>
            )}
            {coach.challenge && <div className="text-fg-muted inline-flex items-start gap-1.5"><Flag size={14} className="mt-0.5 shrink-0 text-pink-500" /> <span><b>{tr("growthChallenge")}</b>{coach.challenge}</span></div>}
          </div>
        )}
      </div>

      {/* AI 用量 / 成本 */}
      <AiRunsSection workspaces={workspaces} />

      <p className="text-[11px] text-fg-muted">{tr("growthComingSoon")}</p>
    </div>
  );
}

type Run = { id: string; agent_type: string; model: string; provider: string; tokens_input: number; tokens_output: number; cost_usd: number; z_charged: number; status: string; created_at: string };

function AiRunsSection({ workspaces }: { workspaces: WsLite[] }) {
  const [wsId, setWsId] = useState(workspaces[0]?.id ?? "");
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (id: string, cur?: string) => {
    if (!id) { setRuns([]); return; }
    setLoading(true);
    try {
      const u = `/api/creator-island/ai/runs?workspaceId=${id}&limit=20${cur ? `&cursor=${encodeURIComponent(cur)}` : ""}`;
      const r = await fetch(u);
      const j = await r.json();
      if (r.ok) { setRuns((prev) => (cur ? [...(prev ?? []), ...(j.items ?? [])] : (j.items ?? []))); setCursor(j.nextCursor ?? null); }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (wsId) { setRuns(null); setCursor(null); load(wsId); } }, [wsId, load]);

  const totalCost = (runs ?? []).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const totalTok = (runs ?? []).reduce((s, r) => s + (r.tokens_input || 0) + (r.tokens_output || 0), 0);

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-bold text-sm inline-flex items-center gap-1.5"><Cpu size={15} /> AI 用量 / 成本</div>
        {workspaces.length > 1 && (
          <select value={wsId} onChange={(e) => setWsId(e.target.value)} className="text-xs bg-bg-elevated border border-border rounded-lg px-2 py-1">
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
      </div>
      {runs && runs.length > 0 && (
        <div className="flex gap-4 text-xs text-fg-muted mb-2">
          <span>本次載入 <b className="text-fg">{runs.length}</b> 筆</span>
          <span>tokens <b className="text-fg">{totalTok.toLocaleString()}</b></span>
          <span>成本 <b className="text-fg">${totalCost.toFixed(4)}</b></span>
        </div>
      )}
      {runs === null ? (
        <div className="text-xs text-fg-muted">載入中…</div>
      ) : runs.length === 0 ? (
        <div className="text-xs text-fg-muted">還沒有 AI 執行紀錄。</div>
      ) : (
        <>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {runs.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-xs bg-bg-elevated rounded-lg px-2.5 py-1.5">
                <div className="min-w-0">
                  <div className="truncate"><span className="font-medium">{r.agent_type}</span> <span className="text-fg-muted">{r.model}</span></div>
                  <div className="text-[10px] text-fg-muted">{new Date(r.created_at).toLocaleString("zh-TW")} · {(r.tokens_input + r.tokens_output).toLocaleString()} tok{r.z_charged ? ` · ${r.z_charged}Z` : ""}</div>
                </div>
                <span className={`shrink-0 ${r.status === "succeeded" ? "text-emerald-500" : r.status === "failed" ? "text-rose-500" : "text-fg-muted"}`}>${(Number(r.cost_usd) || 0).toFixed(4)}</span>
              </div>
            ))}
          </div>
          {cursor && (
            <button onClick={() => load(wsId, cursor)} disabled={loading} className="mt-2 text-xs text-accent hover:underline disabled:opacity-50">
              {loading ? "載入中…" : "載入更多"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
