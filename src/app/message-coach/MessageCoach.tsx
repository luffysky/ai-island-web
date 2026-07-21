"use client";

import { useState } from "react";
import {
  MessageSquareHeart, Loader2, Copy, Check, Sparkles, ArrowLeft, RefreshCw, Wand2,
} from "lucide-react";
import { SCENARIOS, TONES, type ToneId, type CoachVersion, MC_MAX_POINTS } from "@/lib/message-coach";

type GenResp = {
  versions?: CoachVersion[];
  remaining?: number | null;
  unlimited?: boolean;
  error?: string;
  message?: string;
};

const REFINES = [
  { key: "shorter", label: "再短一點", instr: "請把訊息再精簡、更短。" },
  { key: "gentler", label: "再委婉", instr: "請講得更委婉、更留餘地。" },
  { key: "firmer", label: "更堅定", instr: "請立場再明確、更堅定一點。" },
  { key: "warmer", label: "更有溫度", instr: "請更溫暖、更照顧對方感受。" },
];

export function MessageCoach() {
  const [scenarioId, setScenarioId] = useState<string>("");
  const [points, setPoints] = useState("");
  const [tone, setTone] = useState<ToneId>("polite");
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<CoachVersion[] | null>(null);
  const [quota, setQuota] = useState<{ remaining: number | null; unlimited: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

  const pick = (id: string) => {
    setScenarioId(id);
    setVersions(null);
    setErr("");
    const s = SCENARIOS.find((x) => x.id === id);
    if (s) setTone(s.defaultTone);
  };

  const generate = async (extra?: string) => {
    if (!scenario || !points.trim() || loading) return;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/message-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.id, tone, points: points.trim(), refine: extra }),
      });
      const d: GenResp = await r.json();
      if (r.status === 429) {
        setErr(d.message || "今天的免費次數用完了，明天再來，或升級無限使用。");
        setLoading(false);
        return;
      }
      if (!r.ok || !d.versions?.length) {
        setErr(d.message || "產生失敗，換個說法再試一次。");
        setLoading(false);
        return;
      }
      setVersions(d.versions);
      setQuota({ remaining: d.remaining ?? null, unlimited: !!d.unlimited });
    } catch {
      setErr("網路不太順，再試一次。");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 2000);
    } catch { /* ignore */ }
  };

  // 情境選擇畫面
  if (!scenario) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-500 mb-3">
            <MessageSquareHeart className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-black/85 dark:text-white/90">訊息軍師</h1>
          <p className="text-sm text-black/55 dark:text-white/55 mt-1">難開口的話，幫你講得得體又有效。先選一個情境 👇</p>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SCENARIOS.map((s) => (
            <button key={s.id} onClick={() => pick(s.id)}
              className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 text-left hover:border-indigo-400/50 hover:bg-indigo-500/5 transition active:scale-[0.98]">
              <div className="text-2xl mb-1.5">{s.emoji}</div>
              <div className="text-sm font-semibold text-black/80 dark:text-white/85 leading-snug">{s.label}</div>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-black/35 dark:text-white/35 pt-6">
          軍師只給你參考版本、最終怎麼傳由你決定；不代發、不保證結果。
        </p>
      </div>
    );
  }

  // 填要點 + 結果畫面
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5">
      <button onClick={() => { setScenarioId(""); setPoints(""); setVersions(null); }}
        className="inline-flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 hover:text-indigo-500">
        <ArrowLeft className="w-4 h-4" /> 換情境
      </button>

      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-2xl">{scenario.emoji}</span>
          <h1 className="text-lg font-bold text-black/85 dark:text-white/90">{scenario.label}</h1>
        </div>

        <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-1">你想表達的重點</label>
        <textarea value={points} onChange={(e) => setPoints(e.target.value.slice(0, MC_MAX_POINTS))}
          rows={3} placeholder={scenario.hint}
          className="w-full px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 text-black/80 dark:text-white/85 text-sm resize-y" />
        <div className="text-right text-[11px] text-black/35 dark:text-white/35">{points.length}/{MC_MAX_POINTS}</div>

        <label className="block text-sm font-medium text-black/70 dark:text-white/70 mt-2 mb-1.5">語氣</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button key={t.id} type="button" onClick={() => setTone(t.id)} title={t.desc}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${tone === t.id ? "bg-indigo-600 text-white border-indigo-600" : "border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-indigo-400/50"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={() => generate()} disabled={!points.trim() || loading}
          className="mt-4 w-full py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 軍師思考中…</> : <><Sparkles className="w-4 h-4" /> 幫我寫</>}
        </button>
        {err && <p className="mt-3 text-sm text-rose-500 text-center">{err}</p>}
      </div>

      {versions && versions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black/70 dark:text-white/70">給你 {versions.length} 個版本</h2>
            {quota && !quota.unlimited && typeof quota.remaining === "number" && (
              <span className="text-xs text-black/40 dark:text-white/40">今天還剩 {quota.remaining} 次</span>
            )}
          </div>
          {versions.map((v, i) => (
            <div key={i} className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">{v.style}</span>
                <button onClick={() => copy(v.message, i)} className="inline-flex items-center gap-1 text-xs text-black/50 dark:text-white/50 hover:text-indigo-500">
                  {copiedIdx === i ? <><Check className="w-3.5 h-3.5" /> 已複製</> : <><Copy className="w-3.5 h-3.5" /> 複製</>}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-black/80 dark:text-white/85 whitespace-pre-wrap">{v.message}</p>
            </div>
          ))}

          {/* 微調 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-xs text-black/45 dark:text-white/45"><Wand2 className="w-3.5 h-3.5" /> 微調：</span>
            {REFINES.map((rf) => (
              <button key={rf.key} onClick={() => generate(rf.instr)} disabled={loading}
                className="px-3 py-1 rounded-full text-xs border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-indigo-400/50 disabled:opacity-50">
                {rf.label}
              </button>
            ))}
            <button onClick={() => generate()} disabled={loading}
              className="px-3 py-1 rounded-full text-xs border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-indigo-400/50 disabled:opacity-50 inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> 換一批
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
