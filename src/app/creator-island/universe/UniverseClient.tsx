"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, Sparkles, Loader2, RefreshCw, Telescope } from "lucide-react";

type Stats = {
  count: number;
  categories: { name: string; count: number }[];
  moods: { name: string; count: number }[];
  topTags: { name: string; count: number }[];
  firstAt: string | null; lastAt: string | null; spanDays: number; activeMonths: number;
};
type Report = {
  headline: string; hiddenCore: string; throughLine: string;
  themes: { name: string; essence: string }[]; surprising: string; encouragement: string;
};

export function UniverseClient({ stats, initialReport, generatedAt }: { stats: Stats; initialReport: Report | null; generatedAt: string | null }) {
  const tr = useTranslations("creator");
  const [report, setReport] = useState<Report | null>(initialReport);
  const [genAt, setGenAt] = useState<string | null>(generatedAt);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canGen = stats.count >= 8;

  async function generate() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/creator-island/growth/universe", { method: "POST" });
      const raw = await res.text();
      let j: any = null; try { j = raw ? JSON.parse(raw) : null; } catch { throw new Error(tr("universeServerBusy")); }
      if (!res.ok) throw new Error(j?.message || tr("universeGenerateFailed"));
      setReport(j.report); setGenAt(new Date().toISOString());
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const maxTag = Math.max(1, ...stats.topTags.map((t) => t.count));
  const maxCat = Math.max(1, ...stats.categories.map((c) => c.count));

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 宇宙背景 */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950 via-[#0b0b1e] to-black" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{ backgroundImage: "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 20%, #cbd5ff, transparent), radial-gradient(1.5px 1.5px at 40% 70%, #fff, transparent), radial-gradient(1px 1px at 85% 60%, #a5b4fc, transparent), radial-gradient(1px 1px at 55% 45%, #fff, transparent), radial-gradient(1.5px 1.5px at 15% 80%, #ddd6fe, transparent)", backgroundRepeat: "repeat", backgroundSize: "320px 320px" }} />
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 -z-10 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8 text-slate-100">
        <header className="flex items-center justify-between gap-2 mb-6">
          <h1 className="text-2xl font-bold inline-flex items-center gap-2"><span className="text-2xl">🌌</span> {tr("universeTitle")}</h1>
          <Link href="/creator-island" className="text-sm text-fuchsia-300 hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> {tr("universeBackToIsland")}</Link>
        </header>

        {/* 統計星軌 */}
        <div className="flex flex-wrap gap-2 text-xs mb-6">
          <Stat label={tr("universeStatFragments")} value={stats.count} />
          <Stat label={tr("universeStatSpanDays")} value={stats.spanDays} />
          <Stat label={tr("universeStatActiveMonths")} value={stats.activeMonths} />
          <Stat label={tr("universeStatCategories")} value={stats.categories.length} />
        </div>

        {err && <div className="bg-red-500/15 border border-red-400/30 text-red-200 rounded-xl px-4 py-2 text-sm mb-4">{err}</div>}

        {!report ? (
          /* 尚未生成 */
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8 text-center">
            <Telescope size={40} className="mx-auto text-fuchsia-300 mb-3" />
            <h2 className="text-lg font-bold mb-1">{tr("universeIntroHeading")}</h2>
            <p className="text-sm text-slate-300/80 mb-5">{tr("universeIntroDesc", { n: stats.count })}</p>
            <button onClick={generate} disabled={busy || !canGen}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-bold shadow-lg shadow-fuchsia-500/25 disabled:opacity-40">
              {busy ? <><Loader2 size={18} className="animate-spin" /> {tr("universeObserving")}</> : <><Sparkles size={18} /> {tr("universeGenerate")}</>}
            </button>
            {!canGen && <p className="text-xs text-slate-400 mt-3">{tr("universeNeedMore", { n: stats.count })}</p>}
          </motion.div>
        ) : (
          <div className="space-y-5">
            {/* Headline + 核心 */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/[0.12] to-indigo-500/[0.08] backdrop-blur-sm p-6 sm:p-7">
              <div className="text-lg sm:text-xl font-bold leading-relaxed">{report.headline}</div>
              {report.hiddenCore && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 border border-fuchsia-400/30">
                  <span className="text-xs text-slate-300">{tr("universeHiddenCore")}</span>
                  <span className="font-bold text-fuchsia-200">✦ {report.hiddenCore}</span>
                </div>
              )}
              {report.throughLine && <p className="mt-4 text-sm text-slate-200/90 leading-relaxed">{report.throughLine}</p>}
            </motion.div>

            {/* 母題星系 */}
            {report.themes.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {report.themes.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="font-bold text-fuchsia-200 inline-flex items-center gap-1.5"><span className="text-xs">✦</span>{t.name}</div>
                    <p className="text-sm text-slate-300/85 mt-1">{t.essence}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 反直覺發現 */}
            {report.surprising && (
              <div className="rounded-2xl border border-amber-300/25 bg-amber-400/[0.08] p-4">
                <div className="text-xs font-bold text-amber-200 mb-1">🤯 {tr("universeSurprisingLabel")}</div>
                <p className="text-sm text-slate-100/90">{report.surprising}</p>
              </div>
            )}

            {/* 星圖：常用標籤（大小依次數）*/}
            {stats.topTags.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs text-slate-400 mb-3">{tr("universeStarMap")}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-baseline">
                  {stats.topTags.map((t) => (
                    <span key={t.name} className="text-fuchsia-100/90"
                      style={{ fontSize: `${0.8 + (t.count / maxTag) * 1.1}rem`, opacity: 0.5 + (t.count / maxTag) * 0.5 }}>
                      {t.name}<sub className="text-[10px] text-slate-400 ml-0.5">{t.count}</sub>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 題材分布 */}
            {stats.categories.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs text-slate-400 mb-3">{tr("universeCategoryDist")}</div>
                <div className="space-y-1.5">
                  {stats.categories.map((cCat) => (
                    <div key={cCat.name} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 truncate text-slate-300">{cCat.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-indigo-400" style={{ width: `${(cCat.count / maxCat) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-slate-400">{cCat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.encouragement && (
              <p className="text-center text-sm text-slate-300/80 italic px-4">🌙 {report.encouragement}</p>
            )}

            <div className="flex items-center justify-center gap-3 pt-1">
              <button onClick={generate} disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white border border-white/15 rounded-full px-4 py-2 disabled:opacity-40">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {tr("universeReobserve")}
              </button>
              {genAt && <span className="text-[11px] text-slate-500">{tr("universeLastGen", { date: new Date(genAt).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" }) })}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10">
      <b className="text-fuchsia-200">{value.toLocaleString()}</b><span className="text-slate-400">{label}</span>
    </span>
  );
}
