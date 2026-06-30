"use client";

import Link from "next/link";
import { useState } from "react";
import { TrendingUp, ArrowLeft, Dna } from "lucide-react";

type Dna = { traits: any; confidence: number; updated_at: string } | null;

export function GrowthClient({ stats, initialDna }: { stats: { fragments: number; works: number; aiRuns: number }; initialDna: Dna }) {
  const [dna, setDna] = useState<Dna>(initialDna);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const t = dna?.traits ?? {};

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

      <div className="grid grid-cols-3 gap-3">
        {[["碎片", stats.fragments], ["作品", stats.works], ["AI 動作", stats.aiRuns]].map(([l, v]) => (
          <div key={l as string} className="bg-bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-accent">{v as number}</div>
            <div className="text-xs text-fg-muted mt-1">{l as string}</div>
          </div>
        ))}
      </div>

      {/* E9 創作 DNA 卡 */}
      <div className="bg-gradient-to-br from-accent-3/10 via-pink-500/10 to-violet-500/10 border border-accent-3/30 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold inline-flex items-center gap-1.5"><Dna size={16} /> 我的創作 DNA</div>
          <button onClick={recompute} disabled={busy} className="text-xs px-3 py-1.5 rounded-full bg-accent text-white disabled:opacity-40">{busy ? "分析中…" : dna ? "更新" : "產生"}</button>
        </div>
        {err && <div className="text-xs text-red-400">⚠️ {err}</div>}
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

      <p className="text-xs text-fg-muted">技能圖、時間軸、AI 教練週報 — 即將推出。</p>
    </div>
  );
}
