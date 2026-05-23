"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Send, Edit } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTW } from "@/lib/format-date";

type Campaign = {
  id: string;
  subject: string;
  body_html: string;
  segment_id: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
};

type Segment = { id: string; name: string };

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-400",
  scheduled: "bg-yellow-500/15 text-yellow-400",
  sending: "bg-blue-500/15 text-blue-400",
  sent: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};

export function CampaignsClient({ initial, segments }: { initial: Campaign[]; segments: Segment[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<Partial<Campaign> | null>(null);

  const save = async () => {
    if (!editing) return;
    if (!editing.subject?.trim() || !editing.body_html?.trim()) {
      toast.warning("subject / body 必填");
      return;
    }
    try {
      const isEdit = !!editing.id;
      const res = await fetch(isEdit ? `/api/admin/email-campaigns/${editing.id}` : "/api/admin/email-campaigns", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      toast.success(isEdit ? "已更新" : "已新增草稿");
      setEditing(null);
      router.refresh();
    } catch (e: any) {
      toast.error(`儲存失敗：${e?.message || ""}`);
    }
  };

  const send = async (id: string) => {
    const ok = await confirm({
      title: "現在發送這封 email？",
      description: "會立刻寄給目標 segment 的所有人。",
      confirmLabel: "發送",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/email-campaigns/${id}/send`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success(`已寫入發送佇列、${j.recipient_count} 位收件人`);
      router.refresh();
    } catch (e: any) {
      toast.error(`發送失敗：${e?.message || ""}`);
    }
  };

  const del = async (id: string) => {
    const ok = await confirm({ title: "刪除這個 campaign？", destructive: true, confirmLabel: "刪除" });
    if (!ok) return;
    const res = await fetch(`/api/admin/email-campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      setList((l) => l.filter((c) => c.id !== id));
      toast.success("已刪除");
    } else toast.error("刪除失敗");
  };

  return (
    <div className="space-y-4">
      {editing ? (
        <div className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
          <h2 className="font-bold">{editing.id ? "編輯" : "新增"} Campaign</h2>
          <input
            value={editing.subject ?? ""}
            onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
            placeholder="主旨"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={editing.segment_id ?? ""}
            onChange={(e) => setEditing({ ...editing, segment_id: e.target.value || null })}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📨 寄給所有訂閱者（沒選 segment）</option>
            {segments.map((s) => <option key={s.id} value={s.id}>👥 {s.name}</option>)}
          </select>
          <textarea
            value={editing.body_html ?? ""}
            onChange={(e) => setEditing({ ...editing, body_html: e.target.value })}
            placeholder="<h1>Hello {{name}}</h1><p>...</p>（HTML、預留 {{name}} {{username}} placeholder）"
            rows={10}
            className="w-full bg-bg border border-border rounded-lg p-2 text-xs font-mono"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-fg-muted block mb-1">狀態</label>
              <select
                value={editing.status ?? "draft"}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-muted block mb-1">排程時間（選）</label>
              <input
                type="datetime-local"
                value={editing.scheduled_at?.slice(0, 16) ?? ""}
                onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={save} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm">儲存</button>
            <button onClick={() => setEditing(null)} className="px-4 py-1.5 rounded-lg border border-border text-sm">取消</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing({ status: "draft" })} className="w-full p-3 border border-dashed border-border rounded-xl hover:border-accent flex items-center justify-center gap-1 text-sm">
          <Plus size={14} /> 新增 Campaign
        </button>
      )}

      <div className="rounded-xl bg-bg-card border border-border divide-y divide-border">
        {list.length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm">尚無 campaign</div>
        ) : list.map((c) => {
          const openRate = c.recipient_count > 0 ? ((c.open_count / c.recipient_count) * 100).toFixed(1) : "0";
          const clickRate = c.recipient_count > 0 ? ((c.click_count / c.recipient_count) * 100).toFixed(1) : "0";
          return (
            <div key={c.id} className="p-3 flex items-center gap-3">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${STATUS_COLOR[c.status]}`}>{c.status}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{c.subject}</h3>
                <div className="text-[10px] text-fg-muted">
                  {formatTW(c.created_at)}
                  {c.sent_at && ` · 已發 ${formatTW(c.sent_at)}`}
                  · 收件 {c.recipient_count} · 開信 {c.open_count}（{openRate}%）· 點擊 {c.click_count}（{clickRate}%）
                </div>
              </div>
              {c.status === "draft" && (
                <button onClick={() => send(c.id)} className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                  <Send size={11} /> 發送
                </button>
              )}
              <button onClick={() => setEditing(c)} className="p-1.5 text-fg-muted hover:text-accent">
                <Edit size={14} />
              </button>
              <button onClick={() => del(c.id)} className="p-1.5 text-fg-muted hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
