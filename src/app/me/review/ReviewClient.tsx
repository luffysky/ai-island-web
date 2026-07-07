"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, X, Lightbulb, PartyPopper, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MiniQuiz } from "@/lib/types";

interface SrsReview {
  id: string;
  lesson_ref: string;
  question: MiniQuiz;
  interval_days: number;
  ease: number;
  due_at: string;
}

export function ReviewClient({ initialReviews }: { initialReviews: SrsReview[] }) {
  const t = useTranslations("mentor");
  const [queue] = useState<SrsReview[]>(initialReviews);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const current = queue[idx];
  const finished = idx >= queue.length;

  async function grade(review: SrsReview, correct: boolean) {
    try {
      await fetch("/api/review/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, correct }),
      });
    } catch { /* 排程失敗不擋 UX */ }
  }

  async function handleSubmit() {
    if (!current || submitted) return;
    const correct = selected === current.question.answer;
    setSubmitted(true);
    setGrading(true);
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    await grade(current, correct);
    setGrading(false);
  }

  function next() {
    setSelected(null);
    setSubmitted(false);
    setIdx((i) => i + 1);
  }

  // 空狀態：今天沒有到期
  if (queue.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-10 text-center">
        <PartyPopper size={40} className="mx-auto text-accent mb-3" />
        <p className="text-lg font-semibold">{t("reviewEmptyTitle")} 🎉</p>
        <p className="text-sm text-fg-muted mt-2">
          {t("reviewEmptyBefore")}<Link href="/chapters" className="text-accent hover:underline">{t("reviewChaptersLink")}</Link>{t("reviewEmptyAfter")}
        </p>
      </div>
    );
  }

  // 完成
  if (finished) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-10 text-center">
        <PartyPopper size={40} className="mx-auto text-accent mb-3" />
        <p className="text-lg font-semibold">{t("reviewDoneTitle")}</p>
        <p className="text-sm text-fg-muted mt-2">
          {t("reviewDoneSummary", { total: stats.total, correct: stats.correct })}
        </p>
        <a href="/me" className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">
          {t("reviewBackToProfile")} <ArrowRight size={14} />
        </a>
      </div>
    );
  }

  const q = current.question;
  const isCorrect = selected === q.answer;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-sm text-fg-muted">
        <span>{t("reviewDueToday", { n: queue.length })}</span>
        <span>{t("reviewProgress", { cur: idx + 1, total: queue.length })}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg-elevated mb-4 overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
      </div>

      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="text-[11px] text-fg-muted mb-2">{t("reviewSource")}{current.lesson_ref}</div>
        <p className="mb-3 text-sm font-medium">{q.question}</p>

        <div className="space-y-2">
          {q.options.map((opt) => {
            const isThisAnswer = opt.value === q.answer;
            const isSelected = selected === opt.value;
            let style = "border-border bg-bg hover:border-blue-400";
            if (submitted) {
              if (isThisAnswer) style = "border-green-500 bg-green-500/10 text-green-400";
              else if (isSelected) style = "border-red-500 bg-red-500/10 text-red-400";
              else style = "border-border bg-bg opacity-50";
            } else if (isSelected) {
              style = "border-blue-500 bg-blue-500/10";
            }
            return (
              <button
                key={opt.value}
                onClick={() => !submitted && setSelected(opt.value)}
                disabled={submitted}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${style}`}
              >
                <div className="flex items-center justify-between">
                  <span>{opt.label}</span>
                  {submitted && isThisAnswer && <Check size={16} className="text-green-400" />}
                  {submitted && isSelected && !isThisAnswer && <X size={16} className="text-red-400" />}
                </div>
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="mt-3 px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-40"
          >
            {t("reviewSubmit")}
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <div className={`text-sm font-semibold inline-flex items-center gap-1 ${isCorrect ? "text-green-400" : "text-red-400"}`}>
              {isCorrect ? <Check size={15} /> : <X size={15} />}
              {isCorrect ? t("reviewCorrect") : t("reviewWrong")}
            </div>
            {q.explanation && (
              <div className="text-xs text-fg-muted p-3 bg-bg rounded-lg flex items-start gap-1.5">
                <Lightbulb size={13} className="mt-0.5 shrink-0" /><span>{q.explanation}</span>
              </div>
            )}
            <button
              onClick={next}
              disabled={grading}
              className="mt-1 inline-flex items-center gap-1 px-4 py-1.5 bg-accent text-black text-sm font-bold rounded-lg hover:scale-[1.02] transition disabled:opacity-50"
            >
              {idx + 1 >= queue.length ? t("reviewFinish") : t("reviewNext")} <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
