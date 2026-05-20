"use client";
import { useState } from "react";
import { MiniQuiz } from "@/lib/types";
import { Check, X, HelpCircle } from "lucide-react";

export function MiniQuizCard({ quiz }: { quiz: MiniQuiz }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === quiz.answer;

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
          let style = "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-blue-400";
          if (submitted) {
            if (isThisAnswer) style = "border-green-500 bg-green-500/10 text-green-400";
            else if (isSelected) style = "border-red-500 bg-red-500/10 text-red-400";
            else style = "border-[var(--color-border)] bg-[var(--color-bg)] opacity-50";
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
          onClick={() => setSubmitted(true)}
          disabled={!selected}
          className="mt-3 px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-40"
        >
          提交答案
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className={`text-sm font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
            {isCorrect ? "✓ 答對了！" : "✗ 再想想..."}
          </div>
          {quiz.explanation && (
            <div className="text-xs text-[var(--color-fg-muted)] p-3 bg-[var(--color-bg)] rounded-lg">
              💡 {quiz.explanation}
            </div>
          )}
          <button
            onClick={() => { setSelected(null); setSubmitted(false); }}
            className="text-xs text-blue-400 hover:underline"
          >
            再試一次
          </button>
        </div>
      )}
    </div>
  );
}
