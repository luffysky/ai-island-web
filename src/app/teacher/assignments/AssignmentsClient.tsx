"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit, FileText } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTWDate } from "@/lib/format-date";

type Assignment = {
  id: string;
  chapter_id: number | null;
  lesson_id: string | null;
  title: string;
  description_md: string;
  max_score: number;
  due_date: string | null;
  is_required: boolean;
  created_at: string;
};

export function AssignmentsClient({ initial, submissionCounts }: { initial: Assignment[]; submissionCounts: Record<string, { total: number; graded: number }> }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<Partial<Assignment> | null>(null);

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.description_md?.trim()) {
      toast.warning("title / description 必填");
      return;
    }
    try {
      const isEdit = !!editing.id;
      const url = isEdit ? `/api/teacher/assignments/${editing.id}` : "/api/teacher/assignments";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      toast.success(isEdit ? "已更新" : "已新增");
      setEditing(null);
      router.refresh();
    } catch (e: any) {
      toast.error(`儲存失敗：${e?.message || ""}`);
    }
  };

  const del = async (id: string) => {
    const ok = await confirm({ title: "刪除這個作業？", description: "會連同提交一起刪除、不可復原。", destructive: true, confirmLabel: "刪除" });
    if (!ok) return;
    const res = await fetch(`/api/teacher/assignments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((l) => l.filter((a) => a.id !== id));
      toast.success("已刪除");
    } else toast.error("刪除失敗");
  };

  return (
    <div className="space-y-4">
      {editing ? (
        <div className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
          <h2 className="font-bold">{editing.id ? "編輯作業" : "新增作業"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3">
            <input
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="標題"
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={editing.max_score ?? 100}
              onChange={(e) => setEditing({ ...editing, max_score: Number(e.target.value) })}
              placeholder="滿分"
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={editing.due_date ?? ""}
              onChange={(e) => setEditing({ ...editing, due_date: e.target.value || null })}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={editing.chapter_id ?? ""}
              onChange={(e) => setEditing({ ...editing, chapter_id: e.target.value ? Number(e.target.value) : null })}
              placeholder="關聯 Chapter ID（選）"
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={editing.lesson_id ?? ""}
              onChange={(e) => setEditing({ ...editing, lesson_id: e.target.value || null })}
              placeholder="關聯 Lesson ID（選、例：1.1）"
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <textarea
            value={editing.description_md ?? ""}
            onChange={(e) => setEditing({ ...editing, description_md: e.target.value })}
            placeholder="題目描述（markdown）"
            rows={6}
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm font-mono"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!editing.is_required}
              onChange={(e) => setEditing({ ...editing, is_required: e.target.checked })}
            />
            必交（每位學員必須提交）
          </label>
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={save} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm">儲存</button>
            <button onClick={() => setEditing(null)} className="px-4 py-1.5 rounded-lg border border-border text-sm">取消</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing({ max_score: 100, is_required: false })} className="w-full p-3 border border-dashed border-border rounded-xl hover:border-accent flex items-center justify-center gap-1 text-sm">
          <Plus size={14} /> 新增作業
        </button>
      )}

      <div className="rounded-xl bg-bg-card border border-border divide-y divide-border">
        {list.length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm">尚無作業</div>
        ) : list.map((a) => {
          const counts = submissionCounts[a.id] ?? { total: 0, graded: 0 };
          return (
            <div key={a.id} className="p-3 flex items-center gap-3">
              <FileText size={16} className="text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold truncate">{a.title}</h3>
                  {a.is_required && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">必交</span>}
                </div>
                <div className="text-[10px] text-fg-muted">
                  {a.chapter_id ? `Ch ${a.chapter_id}` : "未綁章節"}
                  {a.lesson_id && ` · ${a.lesson_id}`}
                  {a.due_date && ` · 截止 ${formatTWDate(a.due_date)}`}
                  · 滿分 {a.max_score}
                </div>
              </div>
              <div className="text-xs text-fg-muted flex-shrink-0">
                {counts.graded}/{counts.total} 已批改
              </div>
              <button onClick={() => setEditing(a)} className="p-1.5 text-fg-muted hover:text-accent">
                <Edit size={14} />
              </button>
              <button onClick={() => del(a.id)} className="p-1.5 text-fg-muted hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
