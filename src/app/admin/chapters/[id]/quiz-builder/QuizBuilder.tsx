"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles, Save } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Question = {
  id?: string;
  type: "single" | "true_false";
  question: string;
  options: string[];
  answer: number;
  hint?: string;
  explanation?: string;
};

type Quiz = {
  title?: string | null;
  description?: string | null;
  xp_per_correct?: number;
  passing_score?: number;
  questions?: Question[];
  is_published?: boolean;
};

export function QuizBuilder({
  chapterId,
  initialQuiz,
}: {
  chapterId: number;
  initialQuiz: Quiz | null;
}) {
  const confirm = useConfirm();
  const [quiz, setQuiz] = useState<Quiz>(
    initialQuiz ?? {
      title: `Ch${String(chapterId).padStart(2, "0")} 全章測驗`,
      description: "20 題快速回顧、答對 +5 XP、滿分 100",
      xp_per_correct: 5,
      passing_score: 16,
      questions: [],
      is_published: false,
    },
  );
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const generate = async () => {
    if (quiz.questions && quiz.questions.length > 0) {
      const ok = await confirm({
        title: "會覆蓋現有題目、確定？",
        description: `目前有 ${quiz.questions.length} 題、AI 重新出題會全部蓋掉。`,
        confirmLabel: "覆蓋",
        destructive: true,
      });
      if (!ok) return;
    }
    setGenerating(true);
    setMsg("AI 出題中、可能需要 30-60 秒…");
    try {
      const res = await fetch("/api/admin/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`失敗：${data.error}${data.raw ? `\n\n原始回應：${data.raw}` : ""}`);
      } else {
        setQuiz((q) => ({
          ...q,
          ...data.draft,
          is_published: q.is_published, // 保留發布狀態
        }));
        setMsg(`✅ 已生成 ${data.draft?.questions?.length ?? 0} 題、請逐題校稿`);
      }
    } catch (e: any) {
      setMsg(`失敗：${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/quiz/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, quiz }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(`失敗：${data.error}`);
      else setMsg("✅ 已儲存");
    } finally {
      setSaving(false);
    }
  };

  const setQ = (idx: number, patch: Partial<Question>) => {
    setQuiz((q) => {
      const next = [...(q.questions ?? [])];
      next[idx] = { ...next[idx], ...patch };
      return { ...q, questions: next };
    });
  };

  const setOption = (idx: number, oi: number, value: string) => {
    setQuiz((q) => {
      const next = [...(q.questions ?? [])];
      const opts = [...(next[idx].options ?? [])];
      opts[oi] = value;
      next[idx] = { ...next[idx], options: opts };
      return { ...q, questions: next };
    });
  };

  const addQuestion = () => {
    setQuiz((q) => ({
      ...q,
      questions: [
        ...(q.questions ?? []),
        {
          type: "single",
          question: "",
          options: ["", "", "", ""],
          answer: 0,
          hint: "",
          explanation: "",
        },
      ],
    }));
  };

  const removeQuestion = (idx: number) => {
    setQuiz((q) => ({
      ...q,
      questions: (q.questions ?? []).filter((_, i) => i !== idx),
    }));
  };

  const fld = "w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm focus:border-accent outline-none";

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="bg-bg-card border border-border rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-fg-muted block mb-1">標題</label>
            <input className={fld} value={quiz.title ?? ""} onChange={(e) => setQuiz((q) => ({ ...q, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-fg-muted block mb-1">描述</label>
            <input className={fld} value={quiz.description ?? ""} onChange={(e) => setQuiz((q) => ({ ...q, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-fg-muted block mb-1">每題 XP</label>
            <input type="number" className={fld} value={quiz.xp_per_correct ?? 5} onChange={(e) => setQuiz((q) => ({ ...q, xp_per_correct: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-xs text-fg-muted block mb-1">通過門檻（答對 N 題以上）</label>
            <input type="number" className={fld} value={quiz.passing_score ?? 16} onChange={(e) => setQuiz((q) => ({ ...q, passing_score: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
          <button
            onClick={generate}
            disabled={generating || saving}
            className="px-4 py-1.5 text-sm rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            {generating ? "AI 出題中..." : "🤖 AI 自動出 20 題"}
          </button>
          <button
            onClick={addQuestion}
            className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-bg-elevated flex items-center gap-1"
          >
            <Plus size={14} /> 手動新增 1 題
          </button>
          <label className="flex items-center gap-2 text-sm ml-2">
            <input
              type="checkbox"
              checked={!!quiz.is_published}
              onChange={(e) => setQuiz((q) => ({ ...q, is_published: e.target.checked }))}
            />
            <span>對使用者公開</span>
          </label>
          <button
            onClick={save}
            disabled={saving || generating}
            className="ml-auto px-5 py-1.5 text-sm bg-accent text-black font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save size={14} />
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>

        {msg && (
          <pre className="text-xs text-fg-muted mt-3 whitespace-pre-wrap">{msg}</pre>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {(quiz.questions ?? []).length === 0 && (
          <div className="bg-bg-card border border-dashed border-border rounded-xl p-8 text-center text-sm text-fg-muted">
            還沒有題目。按上面「🤖 AI 自動出 20 題」或「手動新增 1 題」開始。
          </div>
        )}
        {(quiz.questions ?? []).map((q, idx) => (
          <div key={idx} className="bg-bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-sm">
                {idx + 1}
              </span>
              <input
                className={`${fld} flex-1 font-medium`}
                value={q.question}
                onChange={(e) => setQ(idx, { question: e.target.value })}
                placeholder="題目"
              />
              <button
                onClick={() => removeQuestion(idx)}
                className="text-fg-muted hover:text-red-400 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="space-y-1.5 mb-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    onClick={() => setQ(idx, { answer: oi })}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      q.answer === oi ? "bg-emerald-500 text-white" : "bg-bg-elevated text-fg-muted"
                    }`}
                    title="設為正解"
                  >
                    {String.fromCharCode(65 + oi)}
                  </button>
                  <input
                    className={fld}
                    value={opt}
                    onChange={(e) => setOption(idx, oi, e.target.value)}
                    placeholder={`選項 ${String.fromCharCode(65 + oi)}`}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <input
                className={fld + " text-xs"}
                placeholder="hint（提示、可空）"
                value={q.hint ?? ""}
                onChange={(e) => setQ(idx, { hint: e.target.value })}
              />
              <input
                className={fld + " text-xs"}
                placeholder="explanation（解析、答錯後顯示）"
                value={q.explanation ?? ""}
                onChange={(e) => setQ(idx, { explanation: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
