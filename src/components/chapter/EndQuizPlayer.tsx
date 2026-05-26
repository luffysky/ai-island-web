"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Trophy, RotateCw, Check, X, Lock } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";

type Question = {
  type?: "single" | "true_false";
  question: string;
  options: string[];
  answer: number;
  hint?: string;
  explanation?: string;
};

type Quiz = {
  chapter_id: number;
  title: string | null;
  description: string | null;
  xp_per_correct: number;
  passing_score: number;
  questions: Question[];
  is_published: boolean;
};

type SubmitResult = {
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  perfect: boolean;
  xpAwarded: number;
  zCoinAwarded: number;
  isFirstAttempt: boolean;
  perQuestion: Array<{
    questionIndex: number;
    chosen: number;
    correctAnswer: number;
    ok: boolean;
    explanation: string | null;
  }>;
};

type Stage = "preview" | "playing" | "result";

export function EndQuizPlayer({ chapterId }: { chapterId: number }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("preview");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load quiz
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("chapter_quizzes")
        .select(
          "chapter_id, title, description, xp_per_correct, passing_score, questions, is_published",
        )
        .eq("chapter_id", chapterId)
        .eq("is_published", true)
        .maybeSingle();
      if (!alive) return;
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuiz(data as Quiz);
      }
    })();
    return () => {
      alive = false;
    };
  }, [chapterId, supabase]);

  // Load best score
  useEffect(() => {
    if (!user || !quiz) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("score")
        .eq("user_id", user.id)
        .eq("chapter_id", chapterId)
        .eq("quiz_id", `chapter_end_${chapterId}`)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      if (data) setBestScore(data.score);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, quiz?.chapter_id, chapterId, supabase, quiz]);

  if (!quiz) return null;

  const total = quiz.questions.length;
  const maxXp = total * quiz.xp_per_correct + 20; // + perfect bonus

  const start = () => {
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setAnswers({});
    setResult(null);
    setError(null);
    setStage("playing");
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        chapterId,
        answers: Object.entries(answers).map(([i, c]) => ({
          questionIndex: Number(i),
          choice: c,
        })),
      };
      const res = await fetch("/api/quiz/chapter/submit", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "submit_failed");
        setSubmitting(false);
        return;
      }
      setResult(data);
      setStage("result");
      // Update best
      setBestScore((prev) => (prev === null ? data.score : Math.max(prev, data.score)));
      // 通知寵物
      if (typeof window !== "undefined") {
        if (data.perfect) {
          window.dispatchEvent(new CustomEvent("pet:quiz-perfect", { detail: { chapterId } }));
        } else if (data.passed) {
          window.dispatchEvent(new CustomEvent("pet:quiz-passed", { detail: { chapterId } }));
        } else {
          window.dispatchEvent(new CustomEvent("pet:quiz-failed", { detail: { chapterId } }));
        }
        if (data.xpAwarded > 0) {
          window.dispatchEvent(new CustomEvent("pet:xp-earned", { detail: { xp: data.xpAwarded } }));
        }
      }
    } catch (e: any) {
      setError(e?.message || "network_error");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Preview ───
  if (stage === "preview") {
    return (
      <section className="mt-12 rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-bg-card to-bg-elevated p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
            <Sparkles className="text-accent" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-fg-muted mb-1">章末綜合測驗</div>
            <h2 className="text-xl font-bold mb-1">{quiz.title || `Ch${String(chapterId).padStart(2, "0")} 全章測驗`}</h2>
            {quiz.description && (
              <p className="text-sm text-fg-muted mb-3">{quiz.description}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4">
              <div className="p-2 rounded bg-bg">
                <div className="text-fg-muted">題數</div>
                <div className="font-bold mt-0.5">{total} 題</div>
              </div>
              <div className="p-2 rounded bg-bg">
                <div className="text-fg-muted">每題</div>
                <div className="font-bold mt-0.5">+{quiz.xp_per_correct} XP</div>
              </div>
              <div className="p-2 rounded bg-bg">
                <div className="text-fg-muted">通過</div>
                <div className="font-bold mt-0.5">{quiz.passing_score} 題</div>
              </div>
              <div className="p-2 rounded bg-bg">
                <div className="text-fg-muted">滿分</div>
                <div className="font-bold mt-0.5 text-accent">{maxXp} XP</div>
              </div>
            </div>

            {bestScore !== null && (
              <div className="mb-4 p-3 rounded-lg bg-bg border border-border text-sm">
                <div className="flex items-center gap-2 text-fg-muted">
                  <Trophy size={14} className="text-yellow-400" />
                  你之前最佳成績：<span className="font-bold text-fg">{bestScore} / 100</span>
                  <span className="text-xs ml-auto">重新挑戰不會再發 XP、純練習</span>
                </div>
              </div>
            )}

            <button
              onClick={start}
              className="px-5 py-2 bg-accent text-black font-bold rounded-lg hover:scale-[1.02] transition-transform flex items-center gap-2"
            >
              <Sparkles size={16} />
              {bestScore !== null ? "再挑戰一次" : "開始測驗"}
            </button>
            {!user && (
              <div className="mt-2 text-xs text-fg-muted flex items-center gap-1">
                <Lock size={12} /> 請先登入才能計分
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ─── Playing ───
  if (stage === "playing") {
    const allAnswered = Object.keys(answers).length === total;
    return (
      <section className="mt-12 rounded-2xl border border-border bg-bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{quiz.title}</h2>
          <span className="text-sm text-fg-muted">
            已答 {Object.keys(answers).length} / {total}
          </span>
        </div>

        <div className="space-y-4">
          {quiz.questions.map((q, idx) => {
            const selected = answers[idx];
            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border bg-bg"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  <p className="font-medium flex-1 whitespace-pre-wrap">{q.question}</p>
                </div>
                <div className="space-y-1.5 pl-10">
                  {q.options.map((opt, oi) => {
                    const active = selected === oi;
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [idx]: oi }))}
                        className={`w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                          active
                            ? "bg-accent/15 border-accent text-fg"
                            : "border-border hover:border-accent/60"
                        }`}
                      >
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            active
                              ? "bg-accent text-black"
                              : "bg-bg-elevated text-fg-muted"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {q.hint && selected === undefined && (
                  <details className="mt-2 pl-10 text-xs text-fg-muted">
                    <summary className="cursor-pointer">💡 提示</summary>
                    <p className="mt-1">{q.hint}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setStage("preview")}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-bg-elevated"
          >
            放棄
          </button>
          <button
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="px-6 py-2 bg-accent text-black font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
          >
            {submitting ? "送出中…" : allAnswered ? "送出答案" : `還剩 ${total - Object.keys(answers).length} 題`}
          </button>
        </div>
      </section>
    );
  }

  // ─── Result ───
  if (!result) return null;
  return (
    <section className="mt-12 rounded-2xl border border-border bg-bg-card p-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">
          {result.perfect ? "🏆" : result.passed ? "🎉" : "💪"}
        </div>
        <h2 className="text-2xl font-bold mb-1">
          {result.perfect
            ? "全對！你是真的會"
            : result.passed
              ? "通過！"
              : "再加油、複習一下"}
        </h2>
        <div className="text-sm text-fg-muted">
          {result.correct} / {result.total} 題（{result.score} 分）
        </div>
        {(result.xpAwarded > 0 || result.zCoinAwarded > 0) && (
          <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-accent/15 text-sm">
            {result.xpAwarded > 0 && (
              <span>
                ⚡ <span className="font-bold text-accent">+{result.xpAwarded} XP</span>
              </span>
            )}
            {result.zCoinAwarded > 0 && (
              <span>
                🪙 <span className="font-bold text-yellow-400">+{result.zCoinAwarded}</span>
              </span>
            )}
          </div>
        )}
        {!result.isFirstAttempt && result.xpAwarded === 0 && (
          <div className="mt-3 text-xs text-fg-muted">
            重複挑戰、僅供練習、不發 XP
          </div>
        )}
      </div>

      <details className="rounded-xl border border-border p-4 bg-bg">
        <summary className="cursor-pointer font-semibold text-sm">逐題檢討（{result.perQuestion.filter((p) => !p.ok).length} 題答錯）</summary>
        <div className="mt-3 space-y-3">
          {result.perQuestion.map((p) => {
            const q = quiz.questions[p.questionIndex];
            return (
              <div key={p.questionIndex} className="text-sm border-t border-border pt-3 first:border-0 first:pt-0">
                <div className="flex items-start gap-2 mb-1.5">
                  {p.ok ? (
                    <Check size={14} className="mt-0.5 text-emerald-400 shrink-0" />
                  ) : (
                    <X size={14} className="mt-0.5 text-red-400 shrink-0" />
                  )}
                  <span className="font-medium flex-1">
                    {p.questionIndex + 1}. {q.question}
                  </span>
                </div>
                <div className="pl-6 text-xs space-y-0.5">
                  <div>
                    你的答案：
                    <span className={p.ok ? "text-emerald-400" : "text-red-400"}>
                      {p.chosen >= 0 ? `${String.fromCharCode(65 + p.chosen)}. ${q.options[p.chosen]}` : "（未作答）"}
                    </span>
                  </div>
                  {!p.ok && (
                    <div>
                      正解：
                      <span className="text-emerald-400">
                        {String.fromCharCode(65 + p.correctAnswer)}. {q.options[p.correctAnswer]}
                      </span>
                    </div>
                  )}
                  {p.explanation && (
                    <div className="mt-1 text-fg-muted">💡 {p.explanation}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </details>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={() => {
            setResult(null);
            setStage("preview");
          }}
          className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-bg-elevated flex items-center gap-1.5"
        >
          <RotateCw size={14} /> 再來一次
        </button>
      </div>
    </section>
  );
}
