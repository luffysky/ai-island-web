"use client";

import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Save, X, Loader2, Copy, Users, User } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Reply = {
  id: string;
  owner_user_id: string | null;
  title: string;
  body: string;
  category: string | null;
  shortcut: string | null;
  use_count: number;
  created_at: string;
};

export function CannedClient({ initial, currentUserId }: { initial: Reply[]; currentUserId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [replies, setReplies] = useState<Reply[]>(initial);
  const [editing, setEditing] = useState<Reply | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "shared" | "mine">("all");

  const filtered = useMemo(() => {
    if (filter === "shared") return replies.filter((r) => r.owner_user_id === null);
    if (filter === "mine") return replies.filter((r) => r.owner_user_id === currentUserId);
    return replies;
  }, [replies, filter, currentUserId]);

  const refresh = async () => {
    const res = await fetch("/api/admin/canned-replies");
    const j = await res.json();
    setReplies(j.replies ?? []);
  };

  const remove = async (r: Reply) => {
    const ok = await confirm({
      title: `刪除「${r.title}」？`,
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/canned-replies/${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setReplies((p) => p.filter((x) => x.id !== r.id));
      toast.success("已刪除");
    } catch (e: any) {
      toast.error(e?.message || "刪除失敗");
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已複製");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>全部 ({replies.length})</FilterChip>
          <FilterChip active={filter === "shared"} onClick={() => setFilter("shared")}>
            <Users size={11} /> 共用 ({replies.filter(r => !r.owner_user_id).length})
          </FilterChip>
          <FilterChip active={filter === "mine"} onClick={() => setFilter("mine")}>
            <User size={11} /> 我的 ({replies.filter(r => r.owner_user_id === currentUserId).length})
          </FilterChip>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="ml-auto px-4 py-1.5 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1"
        >
          <Plus size={14} /> 新增罐頭
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-fg-muted text-sm bg-bg-card rounded-xl border border-border">
          沒有罐頭、點右上新增。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map((r) => (
            <article key={r.id} className="bg-bg-card border border-border rounded-xl p-3 hover:border-accent/40 transition">
              <div className="flex items-start gap-2 flex-wrap mb-1.5">
                <span className="font-bold text-sm">{r.title}</span>
                {r.owner_user_id === null ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 inline-flex items-center gap-0.5">
                    <Users size={9} /> 共用
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 inline-flex items-center gap-0.5">
                    <User size={9} /> 我的
                  </span>
                )}
                {r.category && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-fg-muted">{r.category}</span>
                )}
                <span className="ml-auto text-[10px] text-fg-muted">用 {r.use_count} 次</span>
              </div>
              {r.shortcut && (
                <code className="text-[10px] text-accent block mb-1.5">/{r.shortcut}</code>
              )}
              <p className="text-xs text-fg-muted whitespace-pre-wrap line-clamp-4 bg-bg rounded p-2 mb-2">
                {r.body}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => copy(r.body)} className="text-[10px] px-2 py-1 rounded border border-border hover:border-accent inline-flex items-center gap-0.5">
                  <Copy size={9} /> 複製
                </button>
                <button onClick={() => setEditing(r)} className="text-[10px] px-2 py-1 rounded border border-border hover:border-accent inline-flex items-center gap-0.5">
                  <Edit2 size={9} /> 編輯
                </button>
                <button onClick={() => remove(r)} className="text-[10px] px-2 py-1 rounded border border-border hover:border-red-400 hover:text-red-400 inline-flex items-center gap-0.5">
                  <Trash2 size={9} /> 刪
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <Modal
          row={editing}
          creating={creating}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); refresh(); }}
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-2 py-1 rounded-full inline-flex items-center gap-1 ${active ? "bg-accent text-black" : "bg-bg-elevated border border-border"}`}>
      {children}
    </button>
  );
}

function Modal({ row, creating, onClose, onSaved }: { row: Reply | null; creating: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(row?.title ?? "");
  const [body, setBody] = useState(row?.body ?? "");
  const [category, setCategory] = useState(row?.category ?? "");
  const [shortcut, setShortcut] = useState(row?.shortcut ?? "");
  const [shared, setShared] = useState(row?.owner_user_id === null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("標題和內容都要填");
      return;
    }
    setSaving(true);
    try {
      const url = creating ? "/api/admin/canned-replies" : `/api/admin/canned-replies/${row!.id}`;
      const res = await fetch(url, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category: category || null, shortcut: shortcut || null, shared }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(creating ? "已新增" : "已儲存");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold">{creating ? "新增罐頭" : `編輯：${row?.title}`}</h3>
          <button onClick={onClose} className="p-1 text-fg-muted hover:text-fg"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <label className="block">
            <div className="text-xs text-fg-muted mb-1">標題（顯示用）</div>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" placeholder="例如：問候 / 等候 / 確認解決" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs text-fg-muted mb-1">分類（選填）</div>
              <input value={category} onChange={e => setCategory(e.target.value)} maxLength={40} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" placeholder="greeting / wait / closing" />
            </label>
            <label className="block">
              <div className="text-xs text-fg-muted mb-1">快捷碼（選填）</div>
              <input value={shortcut} onChange={e => setShortcut(e.target.value)} maxLength={40} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent" placeholder="hi / wait / done" />
            </label>
          </div>
          <label className="block">
            <div className="text-xs text-fg-muted mb-1">
              內容（可用變數 <code className="bg-bg px-1 rounded text-[10px]">{`{{username}}`}</code> <code className="bg-bg px-1 rounded text-[10px]">{`{{ticket_id}}`}</code> <code className="bg-bg px-1 rounded text-[10px]">{`{{ticket_subject}}`}</code>）
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} maxLength={5000} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent resize-y" placeholder="Hi {{username}}、感謝你提供 ticket #{{ticket_id}} 的資訊..." />
            <div className="text-[10px] text-fg-muted mt-1">{body.length} / 5000</div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} className="accent-accent" />
            <span className="text-sm">設為共用罐頭（所有 admin 都看得到）</span>
          </label>
        </div>
        <div className="sticky bottom-0 bg-bg-card border-t border-border px-4 py-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-border text-sm">取消</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1 disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {creating ? "建立" : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}
