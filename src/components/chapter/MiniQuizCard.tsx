"use client";
import { useState } from "react";
import { MiniQuiz } from "@/lib/types";
import { Check, X, HelpCircle, Lightbulb, RotateCcw } from "lucide-react";

export function MiniQuizCard({ quiz, onPass, lessonRef }: { quiz: MiniQuiz; onPass?: () => void; lessonRef?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [enqueued, setEnqueued] = useState(false);

  const isCorrect = selected === quiz.answer;

  // 答錯 → fire-and-forget 排入 SRS 複習佇列（不阻塞測驗 UX）
  function handleSubmit() {
    setSubmitted(true);
    if (selected === quiz.answer) {
      onPass?.();
    } else if (lessonRef && !enqueued) {
      setEnqueued(true);
      fetch("/api/review/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonRef, question: quiz }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  return (
    <div className="my-4 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
      <div className="flex items-center gap-2 mb-3 font-semibold text-blue-400">
        <HelpCircle size={16} />
        <span>快速測驗</span>
      </div>

      <p className="mb-3 text-sm font-medium">{quiz.question}</p>

      <div className="space-y-2">
        {quiz.options.map((opt) => {
          const isThisAnswer = opt.value === quiz.answer;
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
          提交答案
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className={`text-sm font-semibold inline-flex items-center gap-1 ${isCorrect ? "text-green-400" : "text-red-400"}`}>
            {isCorrect ? <Check size={15} /> : <X size={15} />}{isCorrect ? "答對了！" : "再想想..."}
          </div>
          {quiz.explanation && (
            <div className="text-xs text-fg-muted p-3 bg-bg rounded-lg flex items-start gap-1.5">
              <Lightbulb size={13} className="mt-0.5 shrink-0" /><span>{quiz.explanation}</span>
            </div>
          )}
          {!isCorrect && enqueued && (
            <div className="text-[11px] text-fg-muted inline-flex items-center gap-1">
              <RotateCcw size={11} /> 已加入複習佇列、明天在
              <a href="/me/review" className="text-blue-400 hover:underline">複習</a>再考你一次
            </div>
          )}
          <button
            onClick={() => { setSelected(null); setSubmitted(false); }}
            className="text-xs text-blue-400 hover:underline block"
          >
            再試一次
          </button>
        </div>
      )}
    </div>
  );
}
