"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/components/ui/Toast";
import { formatTW } from "@/lib/format-date";

type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  content_md: string;
  attachments: any;
  submitted_at: string;
  score: number | null;
  feedback_md: string | null;
  graded_at: string | null;
  assignment: { title: string; max_score: number } | null;
  user: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export function GradingClient({ initial, filterStatus }: { initial: Submission[]; filterStatus: string }) {
  const router = useRouter();
  const toast = useToast();
  const [subs, setSubs] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const grade = async (s: Submission) => {
    const d = drafts[s.id] ?? { score: String(s.score ?? ""), feedback: s.feedback_md ?? "" };
    const score = Number(d.score);
    if (!Number.isFinite(score) || score < 0 || score > (s.assignment?.max_score ?? 100)) {
      toast.warning(`分數需 0 ~ ${s.assignment?.max_score ?? 100}`);
      return;
    }
    setBusy(s.id);
    try {
      const res = await fetch(`/api/teacher/submissions/${s.id}/grade`, {
      credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, feedback_md: d.feedback }),
      });
      if (!res.ok) throw new Error();
      setSubs((rs) => rs.map((x) => x.id === s.id ? { ...x, score, feedback_md: d.feedback, graded_at: new Date().toISOString() } : x));
      toast.success("已完成批改");
    } catch {
      toast.error("批改失敗");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        {[
          { v: "ungraded", l: "待批改" },
          { v: "graded", l: "已批改" },
          { v: "all", l: "全部" },
        ].map((f) => (
          <a
            key={f.v}
            href={`?status=${f.v}`}
            className={`px-3 py-1 rounded-lg border ${filterStatus === f.v ? "bg-accent text-black border-accent font-bold" : "border-border"}`}
          >
            {f.l}
          </a>
        ))}
      </div>

      {subs.length === 0 ? (
        <div className="text-center py-16 text-fg-muted">🎉 沒有符合的提交</div>
      ) : subs.map((s) => {
        const max = s.assignment?.max_score ?? 100;
        const draft = drafts[s.id] ?? { score: String(s.score ?? ""), feedback: s.feedback_md ?? "" };
        const updateDraft = (patch: Partial<typeof draft>) => setDrafts({ ...drafts, [s.id]: { ...draft, ...patch } });
        return (
          <div key={s.id} className="rounded-xl bg-bg-card border border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              {s.user?.avatar_url ? (
                <Image src={s.user.avatar_url} alt="" width={32} height={32} unoptimized className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm">{(s.user?.display_name || s.user?.username || "?")[0]}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{s.user?.display_name || s.user?.username || "—"}</div>
                <div className="text-[10px] text-fg-muted">作業：{s.assignment?.title || "—"} · 提交 {formatTW(s.submitted_at)}</div>
              </div>
              {s.graded_at ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <Check size={12} /> 已批 {s.score}/{max}
                </span>
              ) : (
                <span className="text-xs text-yellow-400 font-bold">待批改</span>
              )}
            </div>

            {/* 學員作答 */}
            <div className="prose-custom text-sm bg-bg rounded-lg p-3 mb-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content_md}</ReactMarkdown>
            </div>

            {/* 給分 + feedback */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr_auto] gap-2 items-end">
              <div>
                <label className="text-[10px] text-fg-muted block mb-1">分數（滿分 {max}）</label>
                <input
                  type="number"
                  min={0}
                  max={max}
                  value={draft.score}
                  onChange={(e) => updateDraft({ score: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-fg-muted block mb-1">回饋（markdown）</label>
                <textarea
                  value={draft.feedback}
                  onChange={(e) => updateDraft({ feedback: e.target.value })}
                  rows={3}
                  placeholder="給學員的回饋..."
                  className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
                />
              </div>
              <button
                onClick={() => grade(s)}
                disabled={busy === s.id}
                className="px-4 py-2 rounded-lg bg-accent text-black font-bold text-sm disabled:opacity-50"
              >
                {busy === s.id ? "送出…" : s.graded_at ? "重新評分" : "完成批改"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
