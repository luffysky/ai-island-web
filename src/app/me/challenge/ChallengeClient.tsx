"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink, Trophy, Send, RotateCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useAlert } from "@/components/ui/ConfirmDialog";
import { useTranslations } from "next-intl";

const LANGS = ["python", "javascript", "typescript", "go", "rust", "java", "cpp"];

export function ChallengeClient() {
  const toast = useToast();
  const alert = useAlert();
  const t = useTranslations("learn");
  const [state, setState] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/me/challenge", { credentials: "include" });
      const j = await r.json();
      setState(j);
      if (j.mine?.code) { setCode(j.mine.code); setLanguage(j.mine.language); }
    } finally { setLoading(false); }
  }

  async function submit() {
    if (!code.trim() || code.length < 20) {
      toast.error(t("toastCodeTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/me/challenge", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });
      const j = await r.json();
      if (j.ok) {
        await alert({ title: t("scoreTitle", { score: j.score }), description: j.comment });
        await load();
      } else {
        toast.error(j.error ?? t("failed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-16 text-center text-fg-muted"><Loader2 size={20} className="animate-spin mx-auto" /></div>;
  if (!state?.problem) return <p className="text-fg-muted">{t("challengeNotReady")}</p>;

  const p = state.problem;
  const mine = state.mine;
  const lb = state.leaderboard ?? [];

  return (
    <div className="space-y-4">
      {/* 本週題目 */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="chip chip-info">📅 {state.week}</span>
          <span className="chip chip-warn">{t("difficultyLabel")}{p.difficulty}</span>
        </div>
        <h2 className="text-xl font-bold mb-2">#{p.number} {p.title}</h2>
        <div className="flex flex-wrap gap-1 mb-3">
          {(p.tags ?? []).slice(0, 6).map((t: string) => (
            <span key={t} className="chip chip-neutral text-[10px]">#{t}</span>
          ))}
        </div>
        <a href={p.url} target="_blank" rel="noopener noreferrer"
          className="btn-chip btn-chip-info text-sm">
          <ExternalLink size={12} /> {t("viewOnLeetcode")}
        </a>
      </div>

      {/* 我的 submission */}
      {mine && (
        <div className="bg-bg-card border-2 border-accent/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-bold flex items-center gap-2">✅ {t("mySubmission")}</h3>
            {mine.score !== null && mine.score !== undefined && (
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <span className="text-2xl font-extrabold text-accent">{mine.score}</span>
                <span className="text-xs text-fg-muted">/ 100</span>
              </div>
            )}
          </div>
          {mine.comment && (
            <blockquote className="border-l-2 border-accent-2 pl-3 italic text-sm">
              💬 {mine.comment}
            </blockquote>
          )}
          <p className="text-xs text-fg-muted mt-2">{t("submittedAt", { date: new Date(mine.submitted_at).toLocaleString("zh-TW") })}</p>
        </div>
      )}

      {/* 提交區 */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          {mine ? <RotateCw size={16} /> : <Send size={16} />}
          {mine ? t("updateAnswer") : t("submitAnswer")}
        </h3>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}
          className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm mb-3">
          {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("pasteCodePlaceholder", { lang: language })}
          rows={12}
          className="w-full bg-bg-elevated border border-border rounded-lg p-3 text-sm font-mono outline-none focus:border-accent mb-3"
        />
        <button onClick={submit} disabled={submitting || !code.trim()}
          className="btn-chip btn-chip-success w-full justify-center py-2.5 disabled:opacity-50">
          {submitting ? <><Loader2 size={14} className="animate-spin" /> {t("scoringInProgress")}</> : <><Send size={14} /> {t("submitAndScore")}</>}
        </button>
      </div>

      {/* Leaderboard */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">🏆 {t("weeklyLeaderboard", { n: lb.length || 10 })}</h3>
        {lb.length === 0 ? (
          <p className="text-sm text-fg-muted">{t("noSubmissionsYet")}</p>
        ) : (
          <div className="space-y-1.5">
            {lb.map((r: any) => (
              <div key={r.rank} className="flex items-center gap-3 bg-bg-elevated rounded p-2.5 text-sm">
                <span className="font-bold w-7 text-center text-accent">
                  {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                </span>
                <span className="flex-1 font-medium">{r.name}</span>
                <span className="text-xs text-fg-muted">{r.language}</span>
                <span className="font-bold text-accent">{r.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
