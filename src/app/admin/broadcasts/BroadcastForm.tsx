"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminHref } from "@/lib/admin-href";

export function BroadcastForm({
  mode,
  broadcast,
}: {
  mode: "new" | "edit";
  broadcast?: any;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: broadcast?.title ?? "",
    content: broadcast?.content ?? "",
    channel: broadcast?.channel ?? "in_app",
    target: broadcast?.target ?? "all",
    status: broadcast?.status ?? "draft",
    scheduled_at: broadcast?.scheduled_at?.slice(0, 16) ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const url = mode === "new"
        ? "/api/admin/broadcasts"
        : `/api/admin/broadcasts/${broadcast.id}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`失敗：${data.error}`);
      } else {
        setMsg("✅ 已儲存");
        if (mode === "new") {
          router.push(adminHref(`/admin/broadcasts/${data.broadcast.id}`) as any);
        } else {
          router.refresh();
        }
      }
    } catch (e: any) {
      setMsg(`失敗：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!broadcast?.id) return;
    if (!confirm("確定刪除這則公告？刪除後不可復原")) return;
    const res = await fetch(`/api/admin/broadcasts/${broadcast.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push(adminHref("/admin/broadcasts") as any);
    } else {
      const d = await res.json();
      alert(`刪除失敗：${d.error}`);
    }
  };

  const fld = "w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none";

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
      <div>
        <label className="text-xs text-[var(--color-fg-muted)] block mb-1">標題</label>
        <input type="text" className={fld} value={form.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-[var(--color-fg-muted)] block mb-1">內容（站內 marquee 會顯示這段）</label>
        <textarea rows={4} className={fld} value={form.content} onChange={(e) => set("content", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-[var(--color-fg-muted)] block mb-1">通道</label>
          <select className={fld} value={form.channel} onChange={(e) => set("channel", e.target.value)}>
            <option value="in_app">📢 in_app（站內 marquee）</option>
            <option value="email">📧 email</option>
            <option value="line">💬 line</option>
            <option value="push">🔔 push</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--color-fg-muted)] block mb-1">對象</label>
          <select className={fld} value={form.target} onChange={(e) => set("target", e.target.value)}>
            <option value="all">所有人</option>
            <option value="members">會員</option>
            <option value="premium">付費</option>
            <option value="custom">自訂</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--color-fg-muted)] block mb-1">狀態</label>
          <select className={fld} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="draft">📝 草稿</option>
            <option value="scheduled">⏰ 排程中</option>
            <option value="sent">📡 已發送（marquee 顯示中）</option>
            <option value="archived">📦 已封存</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--color-fg-muted)] block mb-1">排程時間（選）</label>
          <input type="datetime-local" className={fld} value={form.scheduled_at} onChange={(e) => set("scheduled_at", e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
        <div className="text-xs">
          {msg}
          {form.status === "sent" && form.channel === "in_app" && (
            <span className="ml-2 text-emerald-500">✓ 將顯示在前台 marquee</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <button onClick={del} className="px-4 py-1.5 text-sm border border-red-400/40 text-red-400 rounded-lg hover:bg-red-500/10">
              刪除
            </button>
          )}
          <button onClick={save} disabled={saving} className="px-5 py-1.5 text-sm bg-[var(--color-accent)] text-black font-bold rounded-lg disabled:opacity-50">
            {saving ? "儲存中..." : "💾 儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}
