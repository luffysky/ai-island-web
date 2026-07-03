"use client";

import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Lightbulb, AlertTriangle, ArrowRight } from "lucide-react";

type CoachReport = {
  thisWeek: string;
  stuckOn: string;
  nextSteps: string[];
};

const ENDPOINT = "/api/cron/learning-coach";

export function LearningCoachCard() {
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
      if (!res.ok || !data?.ok) throw new Error(data?.message || "產生失敗");
      if (data.report) {
        setReport(data.report);
        setWeekStart(data.weekStart ?? null);
      } else {
        setErr(data.message || "這週還沒有學習紀錄");
      }
    } catch (e: any) {
      setErr(e?.message || "產生失敗、請稍後再試");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="font-bold flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          AI 學習教練
          {weekStart && <span className="text-[10px] text-fg-muted font-normal">本週 {weekStart}</span>}
        </h2>
        <button
          onClick={regenerate}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent disabled:opacity-50 flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
          {busy ? "產生中…" : report ? "重新產生" : "產生報告"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-fg-muted">載入中…</p>
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
                <Lightbulb size={13} className="text-accent" /> 下一步建議
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
          {err || "還沒有本週報告。點「產生報告」，讓 AI 教練根據你近 7 天的學習狀況給你回饋與建議。"}
        </p>
      )}

      {report && err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}
