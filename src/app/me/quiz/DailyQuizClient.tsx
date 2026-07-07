"use client";

import { useEffect, useState } from "react";
import { Loader2, Trophy, RotateCcw, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";

type Question = {
  q: string;
  options: { label: string; value: string }[];
  answer: string;
  source: "chapter" | "leetcode";
  source_id?: string;
  explanation?: string;
};

type Attempt = {
  id: string;
  questions: Question[];
  answers: string[] | null;
  correct: number | null;
  total: number | null;
  reward_xp: number;
  reward_z: number;
  submitted_at: string | null;
};

export function DailyQuizClient() {
  const toast = useToast();
  const t = useTranslations("learn");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [empty, setEmpty] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correct: number; total: number; pass: boolean; reward_xp: number; reward_z: number } | null>(null);
  const [creditsLeft, setCreditsLeft] = useState(0);
  const [reloading, setReloading] = useState(false);

  const applyPayload = (j: any) => {
    if (j.empty) {
      setEmpty(j.message);
      setAttempt(null);
      return;
    }
    setEmpty(null);
    if (typeof j.creditsLeft === "number") setCreditsLeft(j.creditsLeft);
    if (j.attempt) {
      setAttempt(j.attempt);
      if (j.finished && j.attempt.submitted_at) {
        setResult({
          correct: j.attempt.correct ?? 0,
          total: j.attempt.total ?? 0,
          pass: (j.attempt.correct ?? 0) / (j.attempt.total || 1) >= 0.6,
          reward_xp: j.attempt.reward_xp,
          reward_z: j.attempt.reward_z,
        });
        setAnswers(j.attempt.answers ?? []);
      } else {
        setResult(null);
        setAnswers(Array(j.attempt.questions.length).fill(""));
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/quiz/today")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        applyPayload(j);
      })
      .catch(() => toast.error(t("toastLoadQuizFailed")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // #89 商店「額外測驗次數」：消耗 1 次 credit、重抽今日考卷
  const retryExtra = async () => {
    setReloading(true);
    try {
      const j = await fetch("/api/quiz/today?extra=1").then((r) => r.json());
      if (j.noCredit) {
        setCreditsLeft(0);
        toast.warning(t("toastNoCredits"));
        return;
      }
      applyPayload(j);
      toast.success(t("toastRedrawn"));
    } catch {
      toast.error(t("toastRedrawFailed"));
    } finally {
      setReloading(false);
    }
  };

  const submit = async () => {
    if (!attempt) return;
    if (answers.some((a) => !a)) {
      toast.warning(t("toastAnswerAll"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz/today/submit", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || t("failed"));
      setResult({ correct: j.correct, total: j.total, pass: j.pass, reward_xp: j.reward_xp, reward_z: j.reward_z });
      toast.success(t("toastQuizResult", { correct: j.correct, total: j.total, xp: j.reward_xp, z: j.reward_z }));
      // 島嶼每日學習任務 — 做完一次每日測驗
      import("@/components/island/island-bus").then((m) => m.bumpQuest("quiz", 1)).catch(() => {});
      // 每日任務進度（daily_quests）
      fetch("/api/quests/progress", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "daily_quiz", delta: 1 }),
      }).catch(() => {});
    } catch (e: any) {
      toast.error(t("toastSubmitError", { msg: e?.message || "" }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-fg-muted">
        <Loader2 size={20} className="animate-spin inline mr-2" /> {t("loading")}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-xl bg-bg-card border border-border p-12 text-center">
        <Trophy size={40} className="mx-auto mb-3 text-fg-muted opacity-50" />
        <p className="text-fg-muted">{empty}</p>
      </div>
    );
  }
  if (!attempt) return null;

  const questions = attempt.questions ?? [];

  return (
    <div className="space-y-4">
      {result && (
        <div className={`rounded-xl p-5 border-2 ${result.pass ? "border-emerald-500 bg-emerald-500/10" : "border-orange-500 bg-orange-500/10"}`}>
          <div className="text-2xl font-bold flex items-center gap-2">
            {result.pass ? t("passTitle") : t("failTitle")}
          </div>
          <div className="mt-2 text-sm">
            {t("correctCount")} <span className="font-bold text-2xl">{result.correct}</span> / {result.total}
            {result.reward_xp > 0 && (
              <span className="ml-3">· {t("rewardLabel")}<span className="text-accent font-bold">+{result.reward_xp} XP</span> + <span className="text-yellow-400 font-bold">+{result.reward_z} 🪙</span></span>
            )}
          </div>
          <div className="text-xs text-fg-muted mt-2">
            {t("quizComeBackTomorrow")}
          </div>
          {creditsLeft > 0 && (
            <button
              onClick={retryExtra}
              disabled={reloading}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/15 text-accent font-semibold text-sm hover:bg-accent/25 disabled:opacity-50"
            >
              {reloading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              {t("retryQuiz", { n: creditsLeft })}
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, i) => {
          const userAns = answers[i];
          const showAnswer = !!result;
          const isCorrect = userAns === q.answer;
          return (
            <div key={i} className="rounded-xl bg-bg-card border border-border p-4">
              <div className="flex items-start gap-2 mb-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">
                  {q.source === "chapter" ? t("sourceChapter") : t("sourceLeetcode")}
                </span>
                {showAnswer && (
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isCorrect ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200" : "bg-red-500/15 text-red-900 dark:text-red-200"}`}>
                    {isCorrect ? t("answerCorrect") : t("answerWrong")}
                  </span>
                )}
              </div>
              <div className="prose-custom text-sm mb-3 whitespace-pre-wrap">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.q}</ReactMarkdown>
              </div>
              <div className="space-y-1.5">
                {q.options.map((opt) => {
                  const selected = userAns === opt.value;
                  const isAnswer = q.answer === opt.value;
                  const tone = !showAnswer
                    ? selected ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"
                    : isAnswer ? "border-emerald-500 bg-emerald-500/10"
                    : selected && !isAnswer ? "border-red-500 bg-red-500/10"
                    : "border-border opacity-60";
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition ${tone}`}
                    >
                      <input
                        type="radio"
                        name={`q-${i}`}
                        value={opt.value}
                        checked={selected}
                        disabled={!!result}
                        onChange={(e) => {
                          const next = [...answers];
                          next[i] = e.target.value;
                          setAnswers(next);
                        }}
                      />
                      <span className="font-mono text-[10px] text-fg-muted">{opt.value.toUpperCase()}</span>
                      <span className="flex-1">{opt.label}</span>
                      {showAnswer && isAnswer && <Check size={14} className="text-emerald-400" />}
                      {showAnswer && selected && !isAnswer && <X size={14} className="text-red-400" />}
                    </label>
                  );
                })}
              </div>
              {showAnswer && q.explanation && (
                <div className="mt-3 p-2 bg-bg rounded text-xs text-fg-muted">
                  💡 {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!result && (
        <div className="sticky bottom-4">
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full px-6 py-3 rounded-xl bg-accent text-black font-bold shadow-2xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
            {submitting ? t("submittingAnswers") : t("submitAnswers")}
          </button>
        </div>
      )}
    </div>
  );
}
