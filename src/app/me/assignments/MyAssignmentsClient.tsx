"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Check, Edit } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatTWDate, formatTW } from "@/lib/format-date";

type Assignment = {
  id: string;
  title: string;
  description_md: string;
  chapter_id: number | null;
  lesson_id: string | null;
  due_date: string | null;
  is_required: boolean;
  max_score: number;
};

type Submission = {
  id: string;
  content_md: string;
  submitted_at: string;
  score: number | null;
  feedback_md: string | null;
  graded_at: string | null;
};

export function MyAssignmentsClient({
  assignments,
  submissionByAssignment,
}: {
  assignments: Assignment[];
  submissionByAssignment: Record<string, Submission>;
}) {
  const toast = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [subs, setSubs] = useState(submissionByAssignment);

  const submit = async (assignmentId: string) => {
    const content = drafts[assignmentId] ?? "";
    if (!content.trim()) {
      toast.warning("作答內容不能空白");
      return;
    }
    setBusy(assignmentId);
    try {
      const res = await fetch(`/api/me/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_md: content }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      toast.success("已提交、等待批改");
      setSubs({ ...subs, [assignmentId]: { id: j.id ?? "new", content_md: content, submitted_at: new Date().toISOString(), score: null, feedback_md: null, graded_at: null } });
    } catch (e: any) {
      toast.error(`提交失敗：${e?.message || ""}`);
    } finally {
      setBusy(null);
    }
  };

  if (assignments.length === 0) {
    return (
      <div className="rounded-xl bg-bg-card border border-border p-12 text-center text-fg-muted">
        目前沒有作業
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((a) => {
        const my = subs[a.id];
        const isOpen = expanded === a.id;
        const overdue = a.due_date && new Date(a.due_date) < new Date();
        return (
          <div key={a.id} className="rounded-xl bg-bg-card border border-border">
            <button
              onClick={() => setExpanded(isOpen ? null : a.id)}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold truncate">{a.title}</h3>
                  {a.is_required && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">必交</span>}
                  {overdue && !my && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">逾期</span>}
                  {my?.graded_at && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                      已批 {my.score}/{a.max_score}
                    </span>
                  )}
                  {my && !my.graded_at && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">已提交、待批</span>
                  )}
                </div>
                <div className="text-[10px] text-fg-muted">
                  {a.chapter_id && `Ch ${a.chapter_id} `}
                  {a.lesson_id && `· ${a.lesson_id} `}
                  {a.due_date && ` · 截止 ${formatTWDate(a.due_date)}`}
                  · 滿分 {a.max_score}
                </div>
              </div>
              {my?.graded_at ? <Check size={16} className="text-emerald-400" /> : <Edit size={14} className="text-fg-muted" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                <div className="prose-custom text-sm bg-bg rounded-lg p-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.description_md}</ReactMarkdown>
                </div>

                {my ? (
                  <>
                    <div className="rounded-lg bg-bg p-3">
                      <div className="text-[10px] text-fg-muted mb-1">我的作答（提交於 {formatTW(my.submitted_at)}）</div>
                      <div className="prose-custom text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{my.content_md}</ReactMarkdown>
                      </div>
                    </div>
                    {my.feedback_md && (
                      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/30 p-3">
                        <div className="text-[10px] text-emerald-400 font-bold mb-1">📝 教師回饋（{formatTW(my.graded_at ?? "")}）</div>
                        <div className="prose-custom text-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{my.feedback_md}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="text-xs text-fg-muted block mb-1">作答（markdown）</label>
                    <textarea
                      value={drafts[a.id] ?? ""}
                      onChange={(e) => setDrafts({ ...drafts, [a.id]: e.target.value })}
                      rows={8}
                      placeholder="寫下你的答案..."
                      className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
                    />
                    <button
                      onClick={() => submit(a.id)}
                      disabled={busy === a.id || !(drafts[a.id]?.trim())}
                      className="mt-2 px-4 py-2 rounded-lg bg-accent text-black font-bold text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send size={13} /> {busy === a.id ? "提交中…" : "提交作業"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
