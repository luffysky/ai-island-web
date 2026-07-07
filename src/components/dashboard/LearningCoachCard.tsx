"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, RefreshCw, Lightbulb, AlertTriangle, ArrowRight } from "lucide-react";

type CoachReport = {
  thisWeek: string;
  stuckOn: string;
  nextSteps: string[];
};

const ENDPOINT = "/api/cron/learning-coach";

export function LearningCoachCard() {
  const t = useTranslations("dashboard");
  const [report, setReport] = useState<CoachReport | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 初次載入：讀最新一份（唯讀、不呼叫 AI）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(ENDPOINT, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (data?.latest?.report) {
          setReport(data.latest.report);
          setWeekStart(data.latest.weekStart ?? null);
        }
      } catch {
        /* 靜默：卡片維持「產生報告」狀態 */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const regenerate = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(ENDPOINT, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.message || t("genFailed"));
      if (data.report) {
        setReport(data.report);
        setWeekStart(data.weekStart ?? null);
      } else {
        setErr(data.message || t("noRecordThisWeek"));
      }
    } catch (e: any) {
      setErr(e?.message || t("genFailedRetry"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="font-bold flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          {t("aiCoach")}
          {weekStart && <span className="text-[10px] text-fg-muted font-normal">{t("thisWeekDate", { date: weekStart })}</span>}
        </h2>
        <button
          onClick={regenerate}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent disabled:opacity-50 flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
          {busy ? t("generating") : report ? t("regenerate") : t("generateReport")}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-fg-muted">{t("loading")}</p>
      ) : report ? (
        <div className="space-y-3 text-sm">
          <p className="leading-relaxed">{report.thisWeek}</p>

          {report.stuckOn && (
            <div className="flex items-start gap-2 rounded-lg bg-bg-elevated border border-border p-3">
              <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
              <span className="text-fg-muted">{report.stuckOn}</span>
            </div>
          )}

          {report.nextSteps?.length > 0 && (
            <div>
              <div className="text-xs font-bold text-fg-muted flex items-center gap-1.5 mb-2">
                <Lightbulb size={13} className="text-accent" /> {t("nextStepSuggestions")}
              </div>
              <ul className="space-y-1.5">
                {report.nextSteps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ArrowRight size={14} className="text-accent shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-fg-muted">
          {err || t("coachEmpty")}
        </p>
      )}

      {report && err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}
