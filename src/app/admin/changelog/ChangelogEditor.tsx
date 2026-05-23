"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTWDate } from "@/lib/format-date";

type Entry = {
  id: string;
  version: string | null;
  title: string;
  body_md: string;
  tags: string[];
  published: boolean;
  published_at: string;
  updated_at: string;
};

const TAGS = ["feature", "fix", "improvement", "breaking", "security"];

export function ChangelogEditor({ initial }: { initial: Entry[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [entries, setEntries] = useState(initial);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [draft, setDraft] = useState<Partial<Entry>>({});

  const startNew = () => {
    const today = new Date().toISOString().slice(0, 10);
    setDraft({ version: today, title: "", body_md: "", tags: ["feature"], published: false });
    setEditing({} as Entry);
  };

  const save = async () => {
    if (!draft.title?.trim() || !draft.body_md?.trim()) {
      toast.warning("title 與 body 必填");
      return;
    }
    const isEdit = editing && (editing as any).id;
    try {
      const url = isEdit ? `/api/admin/changelog/${(editing as any).id}` : "/api/admin/changelog";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      toast.success(isEdit ? "已更新" : "已新增");
      setEditing(null);
      setDraft({});
      router.refresh();
    } catch (e: any) {
      toast.error(`儲存失敗：${e?.message || ""}`);
    }
  };

  const del = async (id: string) => {
    const ok = await confirm({ title: "刪除這則更新日誌？", destructive: true, confirmLabel: "刪除" });
    if (!ok) return;
    const res = await fetch(`/api/admin/changelog/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((es) => es.filter((e) => e.id !== id));
      toast.success("已刪除");
    } else toast.error("刪除失敗");
  };

  const togglePublish = async (e: Entry) => {
    const next = !e.published;
    setEntries((es) => es.map((x) => (x.id === e.id ? { ...x, published: next } : x)));
    const res = await fetch(`/api/admin/changelog/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: next }),
    });
    if (!res.ok) {
      setEntries((es) => es.map((x) => (x.id === e.id ? { ...x, published: !next } : x)));
      toast.error("切換失敗");
    } else toast.success(next ? "已發布" : "已轉回草稿");
  };

  return (
    <div className="space-y-4">
      {editing ? (
        <div className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
            <div>
              <label className="text-xs text-fg-muted block mb-1">Version</label>
              <input
                value={draft.version ?? ""}
                onChange={(e) => setDraft({ ...draft, version: e.target.value })}
                placeholder="2026-05-23 / v1.4.0"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-fg-muted block mb-1">Title</label>
              <input
                value={draft.title ?? ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="標題"
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-fg-muted block mb-1">Body (Markdown)</label>
            <textarea
              value={draft.body_md ?? ""}
              onChange={(e) => setDraft({ ...draft, body_md: e.target.value })}
              rows={8}
              placeholder="- 新增 X 功能&#10;- 修了 Y bug"
              className="w-full bg-bg border border-border rounded-lg p-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-fg-muted block mb-1">Tags（多選）</label>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t) => {
                const on = (draft.tags ?? []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const next = on
                        ? (draft.tags ?? []).filter((x) => x !== t)
                        : [...(draft.tags ?? []), t];
                      setDraft({ ...draft, tags: next });
                    }}
                    className={`text-xs px-3 py-1 rounded-full border ${
                      on ? "bg-accent text-black border-accent font-bold" : "border-border hover:border-accent"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!draft.published}
              onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
            />
            立即發布（取消勾即存為草稿）
          </label>
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={save} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm flex items-center gap-1">
              <Save size={13} /> 儲存
            </button>
            <button onClick={() => { setEditing(null); setDraft({}); }} className="px-4 py-1.5 rounded-lg border border-border text-sm">取消</button>
          </div>
        </div>
      ) : (
        <button onClick={startNew} className="w-full p-3 border border-dashed border-border rounded-xl hover:border-accent flex items-center justify-center gap-1 text-sm">
          <Plus size={14} /> 新增一則更新日誌
        </button>
      )}

      <div className="rounded-xl bg-bg-card border border-border divide-y divide-border">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-fg-muted text-sm">尚無紀錄</div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold truncate">{e.title}</h3>
                  {e.version && <span className="text-[10px] font-mono text-fg-muted">{e.version}</span>}
                  {!e.published && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">草稿</span>
                  )}
                  {(e.tags ?? []).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{t}</span>
                  ))}
                </div>
                <div className="text-[10px] text-fg-muted mt-0.5">{formatTWDate(e.published_at)}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => togglePublish(e)}
                  className="p-1.5 rounded hover:bg-bg-elevated"
                  title={e.published ? "轉回草稿" : "發布"}
                >
                  {e.published ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} className="text-fg-muted" />}
                </button>
                <button
                  onClick={() => { setEditing(e); setDraft(e); }}
                  className="text-xs px-2 py-1 rounded border border-border hover:text-accent hover:border-accent"
                >編輯</button>
                <button
                  onClick={() => del(e.id)}
                  className="p-1.5 rounded text-fg-muted hover:text-red-400 hover:bg-red-500/10"
                  title="刪除"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
