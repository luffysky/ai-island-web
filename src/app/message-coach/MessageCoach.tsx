"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquareHeart, Loader2, Copy, Check, Sparkles, ArrowLeft, RefreshCw, Wand2,
  TrendingUp, Ban, HeartHandshake, Receipt, Palmtree, Home, GraduationCap,
  Handshake, MessageSquareWarning, HeartCrack, Flower2, ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { LottieIcon } from "@/components/ui/LottieIcon";
import { SCENARIOS, TONES, type ToneId, type CoachVersion, MC_MAX_POINTS } from "@/lib/message-coach";

// 情境 → line-icon（Lottie 沒設時的 fallback、會自己一直動）＋配色
const SCENARIO_ICON: Record<string, { Icon: LucideIcon; cls: string }> = {
  raise: { Icon: TrendingUp, cls: "text-emerald-500 bg-emerald-500/12" },
  decline: { Icon: Ban, cls: "text-rose-500 bg-rose-500/12" },
  apology: { Icon: HeartHandshake, cls: "text-pink-500 bg-pink-500/12" },
  collect: { Icon: Receipt, cls: "text-amber-500 bg-amber-500/12" },
  leave: { Icon: Palmtree, cls: "text-teal-500 bg-teal-500/12" },
  landlord: { Icon: Home, cls: "text-orange-500 bg-orange-500/12" },
  teacher: { Icon: GraduationCap, cls: "text-sky-500 bg-sky-500/12" },
  client: { Icon: Handshake, cls: "text-indigo-500 bg-indigo-500/12" },
  complaint: { Icon: MessageSquareWarning, cls: "text-red-500 bg-red-500/12" },
  ex: { Icon: HeartCrack, cls: "text-fuchsia-500 bg-fuchsia-500/12" },
  reject_confess: { Icon: Flower2, cls: "text-violet-500 bg-violet-500/12" },
  boundary: { Icon: ShieldAlert, cls: "text-cyan-500 bg-cyan-500/12" },
};

const COACH_IDS = SCENARIOS.map((s) => s.id);
const lottieKey = (id: string) => `coach_lottie_${id}_url`;

/**
 * 情境 icon：後台有設 Lottie URL（coach_lottie_<id>_url、/admin/lottie-settings）→ 用 Lottie 動畫（autoplay+loop）；
 * 沒設 → fallback 用會自己一直動的 lucide 線條 icon（非 hover 觸發）。
 */
function ScenarioIcon({ id, size = "md", lottieUrl }: { id: string; size?: "md" | "sm"; lottieUrl?: string }) {
  const m = SCENARIO_ICON[id] ?? { Icon: MessageSquareHeart, cls: "text-indigo-500 bg-indigo-500/12" };
  const box = size === "sm" ? "w-9 h-9 rounded-lg" : "w-11 h-11 rounded-xl";
  const ic = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const px = size === "sm" ? 20 : 24;
  const glyph = <m.Icon className={`${ic} coach-icon-live`} strokeWidth={2} />;
  return (
    <span className={`inline-flex items-center justify-center ${box} ${m.cls} transition-transform duration-300 group-hover:scale-110`}>
      {lottieUrl ? <LottieIcon src={lottieUrl} size={px} fallback={glyph} /> : glyph}
    </span>
  );
}

type GenResp = {
  versions?: CoachVersion[];
  remaining?: number | null;
  unlimited?: boolean;
  error?: string;
  message?: string;
};

const REFINES = [
  { key: "shorter", instr: "請把訊息再精簡、更短。" },
  { key: "gentler", instr: "請講得更委婉、更留餘地。" },
  { key: "firmer", instr: "請立場再明確、更堅定一點。" },
  { key: "warmer", instr: "請更溫暖、更照顧對方感受。" },
];

export function MessageCoach() {
  const t = useTranslations("messageCoach");
  const [scenarioId, setScenarioId] = useState<string>("");
  const [points, setPoints] = useState("");
  const [tone, setTone] = useState<ToneId>("polite");
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<CoachVersion[] | null>(null);
  const [quota, setQuota] = useState<{ remaining: number | null; unlimited: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [lottieMap, setLottieMap] = useState<Record<string, string>>({});

  // 讀後台設定的情境 Lottie URL（/admin/lottie-settings，沒設就用會動的 lucide fallback）
  useEffect(() => {
    const keys = COACH_IDS.map(lottieKey).join(",");
    fetch(`/api/app-settings?keys=${encodeURIComponent(keys)}`)
      .then((r) => r.json())
      .then((d) => setLottieMap(d?.settings ?? {}))
      .catch(() => { /* 讀不到就維持 fallback */ });
  }, []);

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
        setErr(d.message || t("errors.quota"));
        setLoading(false);
        return;
      }
      if (!r.ok || !d.versions?.length) {
        setErr(d.message || t("errors.failed"));
        setLoading(false);
        return;
      }
      setVersions(d.versions);
      setQuota({ remaining: d.remaining ?? null, unlimited: !!d.unlimited });
    } catch {
      setErr(t("errors.network"));
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
          <h1 className="text-2xl font-bold text-black/85 dark:text-white/90">{t("meta.title")}</h1>
          <p className="text-sm text-black/55 dark:text-white/55 mt-1">{t("meta.subtitle")}</p>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SCENARIOS.map((s) => (
            <button key={s.id} onClick={() => pick(s.id)}
              className="group rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4 text-left hover:border-indigo-400/50 hover:bg-indigo-500/5 transition active:scale-[0.98]">
              <div className="mb-2"><ScenarioIcon id={s.id} lottieUrl={lottieMap[lottieKey(s.id)]} /></div>
              <div className="text-sm font-semibold text-black/80 dark:text-white/85 leading-snug">{t(`scenarios.${s.id}`)}</div>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-black/35 dark:text-white/35 pt-6">
          {t("meta.disclaimer")}
        </p>
      </div>
    );
  }

  // 填要點 + 結果畫面
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5">
      <button onClick={() => { setScenarioId(""); setPoints(""); setVersions(null); }}
        className="inline-flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 hover:text-indigo-500">
        <ArrowLeft className="w-4 h-4" /> {t("form.changeScenario")}
      </button>

      <div className="group rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <ScenarioIcon id={scenario.id} size="sm" lottieUrl={lottieMap[lottieKey(scenario.id)]} />
          <h1 className="text-lg font-bold text-black/85 dark:text-white/90">{t(`scenarios.${scenario.id}`)}</h1>
        </div>

        <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-1">{t("form.pointsLabel")}</label>
        <textarea value={points} onChange={(e) => setPoints(e.target.value.slice(0, MC_MAX_POINTS))}
          rows={3} placeholder={t(`scenarios.${scenario.id}Desc`)}
          className="w-full px-3 py-2 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 text-black/80 dark:text-white/85 text-sm resize-y" />
        <div className="text-right text-[11px] text-black/35 dark:text-white/35">{points.length}/{MC_MAX_POINTS}</div>

        <label className="block text-sm font-medium text-black/70 dark:text-white/70 mt-2 mb-1.5">{t("form.toneLabel")}</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((tn) => (
            <button key={tn.id} type="button" onClick={() => setTone(tn.id)} title={t(`tones.${tn.id}Desc`)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${tone === tn.id ? "bg-indigo-600 text-white border-indigo-600" : "border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-indigo-400/50"}`}>
              {t(`tones.${tn.id}`)}
            </button>
          ))}
        </div>

        <button onClick={() => generate()} disabled={!points.trim() || loading}
          className="mt-4 w-full py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("form.thinking")}</> : <><Sparkles className="w-4 h-4" /> {t("form.submit")}</>}
        </button>
        {err && <p className="mt-3 text-sm text-rose-500 text-center">{err}</p>}
      </div>

      {versions && versions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black/70 dark:text-white/70">{t("result.versionCount", { n: versions.length })}</h2>
            {quota && !quota.unlimited && typeof quota.remaining === "number" && (
              <span className="text-xs text-black/40 dark:text-white/40">{t("result.remaining", { n: quota.remaining })}</span>
            )}
          </div>
          {versions.map((v, i) => (
            <div key={i} className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">{v.style}</span>
                <button onClick={() => copy(v.message, i)} className="inline-flex items-center gap-1 text-xs text-black/50 dark:text-white/50 hover:text-indigo-500">
                  {copiedIdx === i ? <><Check className="w-3.5 h-3.5" /> {t("result.copied")}</> : <><Copy className="w-3.5 h-3.5" /> {t("result.copy")}</>}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-black/80 dark:text-white/85 whitespace-pre-wrap">{v.message}</p>
            </div>
          ))}

          {/* 微調 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-xs text-black/45 dark:text-white/45"><Wand2 className="w-3.5 h-3.5" /> {t("refine.label")}</span>
            {REFINES.map((rf) => (
              <button key={rf.key} onClick={() => generate(rf.instr)} disabled={loading}
                className="px-3 py-1 rounded-full text-xs border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-indigo-400/50 disabled:opacity-50">
                {t(`refine.${rf.key}`)}
              </button>
            ))}
            <button onClick={() => generate()} disabled={loading}
              className="px-3 py-1 rounded-full text-xs border border-black/15 dark:border-white/15 text-black/60 dark:text-white/60 hover:border-indigo-400/50 disabled:opacity-50 inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> {t("refine.regenerate")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
