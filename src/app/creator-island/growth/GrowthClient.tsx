"use client";

import Link from "next/link";
import { useState } from "react";
import { TrendingUp, ArrowLeft, Dna, Palmtree, AlertTriangle, Sparkles, Target, CheckCircle2, Flag } from "lucide-react";

type Dna = { traits: any; confidence: number; updated_at: string } | null;
type WsLite = { id: string; name: string; type: "personal" | "studio" };
type Equipped = { title?: string; name_color?: string; avatar_frame?: string };

function nameColorClass(v?: string): string {
  if (v === "aurora") return "bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent";
  if (v === "gold") return "text-amber-500 dark:text-amber-300";
  return "";
}

export function GrowthClient({ stats, initialDna, workspaces = [], scope = "all", equipped = {}, displayName = "創作者" }: { stats: { fragments: number; works: number; aiRuns: number }; initialDna: Dna; workspaces?: WsLite[]; scope?: string; equipped?: Equipped; displayName?: string }) {
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
        <h1 className="text-2xl font-bold inline-flex items-center gap-1.5"><TrendingUp size={20} /> 成長</h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> 回島</Link>
      </header>

      {/* 身分：名稱（可帶名稱顏色）+ 裝備中的稱號 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-lg font-bold ${nameColorClass(equipped.name_color)}`}>{displayName}</span>
        {equipped.title && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-bold">{equipped.title}</span>}
        <Link href="/store?tab=redeem" className="text-[11px] text-fg-muted hover:text-accent">＋ 裝飾</Link>
      </div>

      {/* 範圍切換：個人島 vs 各工作室 vs 全部（碎片/作品本來就綁工作室、要能分開看） */}
      {workspaces.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-fg-muted mr-0.5">範圍：</span>
          {workspaces.map((w) => {
            const on = scope === w.id;
            return (
              <Link key={w.id} href={`/creator-island/growth?ws=${w.id}`}
                className={`px-2.5 py-1 rounded-full border transition inline-flex items-center gap-1 ${on ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
                {w.type === "personal" ? <><Palmtree size={12} /> 個人島</> : w.name}
              </Link>
            );
          })}
          <Link href="/creator-island/growth?ws=all"
            className={`px-2.5 py-1 rounded-full border transition ${scope === "all" ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
            全部加總
          </Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[["碎片", stats.fragments], ["作品", stats.works], ["AI 動作", stats.aiRuns]].map(([l, v]) => (
          <div key={l as string} className="bg-bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-accent">{v as number}</div>
            <div className="text-xs text-fg-muted mt-1">{l as string}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-fg-muted -mt-2">{scope === "all" ? "目前顯示：你所有工作室加總。" : "目前顯示：此工作室的統計。切換上方範圍看個人島或其他工作室。"}</p>

      {/* E9 創作 DNA 卡 */}
      <div className="bg-gradient-to-br from-accent-3/10 via-pink-500/10 to-violet-500/10 border border-accent-3/30 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold inline-flex items-center gap-1.5"><Dna size={16} /> 我的創作 DNA</div>
          <button onClick={recompute} disabled={busy} className="text-xs px-3 py-1.5 rounded-full bg-accent text-white disabled:opacity-40">{busy ? "分析中…" : dna ? "更新" : "產生"}</button>
        </div>
        {err && <div className="text-xs text-red-400 inline-flex items-center gap-1"><AlertTriangle size={12} className="shrink-0" /> {err}</div>}
        {!dna && <p className="text-sm text-fg-muted">還沒建立。多寫幾個碎片/作品後，按「產生」讓 AI 歸納你的風格指紋。</p>}
        {dna && (
          <div className="space-y-2 text-sm">
            {t.tone && <div><b className="text-accent-3">語氣：</b>{t.tone}</div>}
            {t.imagery?.length > 0 && <div><b className="text-accent-3">常見意象：</b>{t.imagery.join("、")}</div>}
            {t.strengths?.length > 0 && <div><b className="text-emerald-400">強項：</b>{t.strengths.join("、")}</div>}
            {t.weaknesses?.length > 0 && <div><b className="text-amber-400">可加強：</b>{t.weaknesses.join("、")}</div>}
            {t.formats?.length > 0 && <div><b className="text-accent-3">擅長形式：</b>{t.formats.join("、")}</div>}
            <div className="text-[10px] text-fg-muted pt-1">信心 {Math.round((dna.confidence ?? 0) * 100)}% · 更新於 {new Date(dna.updated_at).toLocaleDateString("zh-TW")}</div>
          </div>
        )}
      </div>

      {/* AI 教練週報 */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold inline-flex items-center gap-1.5"><Sparkles size={16} className="text-accent" /> AI 教練・本週建議</div>
          <button onClick={getCoach} disabled={coachBusy} className="text-xs px-3 py-1.5 rounded-full bg-accent text-white disabled:opacity-40">{coachBusy ? "思考中…" : coach ? "重新產生" : "產生建議"}</button>
        </div>
        {coachErr && <div className="text-xs text-red-400 inline-flex items-center gap-1"><AlertTriangle size={12} className="shrink-0" /> {coachErr}</div>}
        {!coach && !coachErr && <p className="text-sm text-fg-muted">按「產生建議」，教練會看你的統計、DNA 與近期題材，給這一週的方向。</p>}
        {coach && (
          <div className="space-y-3 text-sm">
            <p className="text-fg">{coach.encouragement}</p>
            {coach.wins?.length > 0 && (
              <div><div className="text-emerald-500 font-bold inline-flex items-center gap-1 mb-1"><CheckCircle2 size={14} /> 最近做得好</div>
                <ul className="space-y-0.5">{coach.wins.map((w: string, i: number) => <li key={i} className="text-fg-muted">・{w}</li>)}</ul></div>
            )}
            {coach.focus && <div className="bg-accent/[0.06] border border-accent/20 rounded-xl p-3"><div className="text-accent font-bold inline-flex items-center gap-1 mb-0.5"><Target size={14} /> 本週重點</div><div>{coach.focus}</div></div>}
            {coach.nextSteps?.length > 0 && (
              <div><div className="font-bold mb-1">具體行動</div>
                <ul className="space-y-0.5">{coach.nextSteps.map((s: string, i: number) => <li key={i} className="text-fg-muted">{i + 1}. {s}</li>)}</ul></div>
            )}
            {coach.challenge && <div className="text-fg-muted inline-flex items-start gap-1.5"><Flag size={14} className="mt-0.5 shrink-0 text-pink-500" /> <span><b>小挑戰：</b>{coach.challenge}</span></div>}
          </div>
        )}
      </div>

      <p className="text-[11px] text-fg-muted">技能圖、時間軸 — 之後再加。</p>
    </div>
  );
}
