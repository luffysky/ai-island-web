"use client";
import { useState } from "react";
import { Sparkles, Loader2, Check, X, Lightbulb, RotateCcw, BookmarkPlus } from "lucide-react";
import type { MiniQuiz } from "@/lib/types";

type PopQ = MiniQuiz;

// 隨堂考：課末讓 AI 出 3 題快速理解測驗。只在登入時渲染（由 LessonCard 控制）。
export function PopQuiz({ chapterId, lessonId, lessonText }: { chapterId: number; lessonId: string; lessonText?: string }) {
  const lessonRef = `${chapterId}:${lessonId}`;
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [questions, setQuestions] = useState<PopQ[]>([]);
  // 每題狀態：選了什麼、是否已提交、是否已加入複習
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  async function generate() {
    setState("loading");
    setErrMsg("");
    setPicked({});
    setDone({});
    setSaved({});
    try {
      const res = await fetch("/api/chapter/pop-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, lessonId, lessonText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.questions?.length) {
        setErrMsg(data?.message ?? "出題失敗、請再試一次");
        setState("error");
        return;
      }
      setQuestions(data.questions);
      setState("ready");
    } catch {
      setErrMsg("網路錯誤、請再試一次");
      setState("error");
    }
  }

  function submitOne(i: number) {
    setDone((d) => ({ ...d, [i]: true }));
  }

  async function addToReview(i: number) {
    if (saved[i]) return;
    setSaved((s) => ({ ...s, [i]: true }));
    try {
      await fetch("/api/review/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonRef, question: questions[i] }),
        keepalive: true,
      });
    } catch { /* 忽略、按鈕已顯示已加入 */ }
  }

  if (state === "idle" || state === "error") {
    return (
      <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 text-center">
        <button
          onClick={generate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition"
        >
          <Sparkles size={16} /> 隨堂考（AI 出 3 題）
        </button>
        {state === "error" && <p className="mt-2 text-xs text-red-400">{errMsg}</p>}
        <p className="mt-2 text-[11px] text-fg-muted">讀完這節、測測自己是否真的懂了</p>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 flex flex-col items-center gap-2 text-purple-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">AI 出題中…</span>
      </div>
    );
  }

  const answeredCount = Object.keys(done).length;
  const correctCount = questions.filter((q, i) => done[i] && picked[i] === q.answer).length;

  return (
    <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-purple-400">
          <Sparkles size={16} /> <span>隨堂考</span>
        </div>
        <span className="text-xs text-fg-muted">
          {answeredCount}/{questions.length} 作答{answeredCount > 0 ? ` · 答對 ${correctCount}` : ""}
        </span>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => {
          const submitted = !!done[i];
          const sel = picked[i] ?? null;
          const isCorrect = sel === q.answer;
          return (
            <div key={i} className="rounded-lg border border-border bg-bg-card p-3">
              <p className="mb-2 text-sm font-medium">{i + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const isThisAnswer = opt.value === q.answer;
                  const isSelected = sel === opt.value;
                  let style = "border-border bg-bg hover:border-purple-400";
                  if (submitted) {
                    if (isThisAnswer) style = "border-green-500 bg-green-500/10 text-green-400";
                    else if (isSelected) style = "border-red-500 bg-red-500/10 text-red-400";
                    else style = "border-border bg-bg opacity-50";
                  } else if (isSelected) {
                    style = "border-purple-500 bg-purple-500/10";
                  }
                  return (
                    <button
                      key={opt.value}
                      onClick={() => !submitted && setPicked((p) => ({ ...p, [i]: opt.value }))}
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
                  onClick={() => submitOne(i)}
                  disabled={!sel}
                  className="mt-3 px-4 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:opacity-40"
                >
                  提交
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className={`text-sm font-semibold inline-flex items-center gap-1 ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                    {isCorrect ? <Check size={15} /> : <X size={15} />}{isCorrect ? "答對了！" : "答錯了"}
                  </div>
                  {q.explanation && (
                    <div className="text-xs text-fg-muted p-3 bg-bg rounded-lg flex items-start gap-1.5">
                      <Lightbulb size={13} className="mt-0.5 shrink-0" /><span>{q.explanation}</span>
                    </div>
                  )}
                  {!isCorrect && (
                    <button
                      onClick={() => addToReview(i)}
                      disabled={saved[i]}
                      className="text-xs inline-flex items-center gap-1 text-blue-400 hover:underline disabled:text-fg-muted disabled:no-underline"
                    >
                      <BookmarkPlus size={13} /> {saved[i] ? "已加入複習" : "加入複習"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={generate}
        className="mt-4 text-xs inline-flex items-center gap-1 text-purple-400 hover:underline"
      >
        <RotateCcw size={13} /> 換一批題目
      </button>
    </div>
  );
}
