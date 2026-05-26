"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, Pause, MessageSquare, Info } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTW } from "@/lib/format-date";
import { adminHref } from "@/lib/admin-href";

type Ticket = {
  id: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  user: { username: string; display_name: string | null; email: string | null } | null;
  assignee: { username: string; display_name: string | null } | null;
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-gray-500/15 text-gray-900 dark:text-gray-200",
  normal: "bg-blue-500/15 text-blue-900 dark:text-blue-200",
  high: "bg-orange-500/15 text-orange-900 dark:text-orange-200",
  urgent: "bg-red-500/15 text-red-900 dark:text-red-200",
};

export function TicketsClient({ initial, filterStatus }: { initial: Ticket[]; filterStatus: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [tickets, setTickets] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const setStatus = async (id: string, status: string) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, status } : t));
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
      credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`狀態：${status}`);
    } catch {
      toast.error("更新失敗");
      router.refresh();
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === tickets.length) setSelected(new Set());
    else setSelected(new Set(tickets.map((t) => t.id)));
  };

  const batchSetStatus = async (status: string) => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `批次將 ${selected.size} 筆改成「${status}」？`,
      confirmLabel: "確認",
    });
    if (!ok) return;
    const ids = Array.from(selected);
    setTickets((ts) => ts.map((t) => (ids.includes(t.id) ? { ...t, status } : t)));
    let failed = 0;
    await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/admin/tickets/${id}`, {
      credentials: "include",
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          if (!res.ok) failed++;
        } catch {
          failed++;
        }
      }),
    );
    if (failed === 0) toast.success(`批次更新 ${ids.length} 筆`);
    else toast.error(`${failed} 筆失敗、其他成功`);
    setSelected(new Set());
    router.refresh();
  };

  return (
    <div>
      {/* 區隔說明 */}
      <div className="rounded-xl bg-blue-500/5 border border-blue-500/30 p-3 mb-4 text-xs text-fg-muted flex items-start gap-2">
        <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          這頁是 <b className="text-fg">工單管理</b>：派單、改狀態、批次操作、看 SLA。
          要跟 user 聊天 / 套罐頭 / 推 LINE、請去{" "}
          <Link href={adminHref("/admin/crm") as any} className="text-accent hover:underline font-bold">
            /admin/crm 客服對話視角
          </Link>。
        </div>
      </div>

      <div className="rounded-xl bg-bg-card border border-border p-3 mb-4 flex gap-2 text-sm flex-wrap">
        {["open", "in_progress", "waiting_user", "resolved", "all"].map((s) => (
          <a key={s} href={`?status=${s}`} className={`px-3 py-1 rounded-lg border ${filterStatus === s ? "bg-accent text-black border-accent font-bold" : "border-border"}`}>
            {s}
          </a>
        ))}
      </div>

      {/* 批次操作 bar */}
      {tickets.length > 0 && (
        <div className="rounded-xl bg-bg-elevated border border-border p-3 mb-3 flex items-center gap-2 flex-wrap text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === tickets.length && tickets.length > 0}
              onChange={selectAll}
              className="accent-accent"
            />
            <span>全選 {selected.size > 0 ? `(${selected.size}/${tickets.length})` : `(${tickets.length})`}</span>
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-fg-muted">→</span>
              <button onClick={() => batchSetStatus("in_progress")} className="px-2 py-1 rounded bg-blue-500/15 text-blue-900 dark:text-blue-200">處理中</button>
              <button onClick={() => batchSetStatus("resolved")} className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-900 dark:text-emerald-200">標解決</button>
              <button onClick={() => batchSetStatus("closed")} className="px-2 py-1 rounded bg-fg-muted/15 text-fg-muted">關閉</button>
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        {tickets.length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm rounded-xl bg-bg-card border border-border">🎉 沒有符合的工單</div>
        ) : tickets.map((t) => {
          const isSelected = selected.has(t.id);
          return (
          <div key={t.id} className={`rounded-xl border p-4 transition ${isSelected ? "bg-accent/5 border-accent" : "bg-bg-card border-border"}`}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(t.id)}
                className="accent-accent"
              />
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{t.category}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{t.status}</span>
              <span className="text-[10px] text-fg-muted ml-auto">{formatTW(t.created_at)}</span>
            </div>
            <h3 className="font-bold">{t.subject}</h3>
            <div className="text-xs text-fg-muted mt-1">
              {t.user?.display_name || t.user?.username || "—"} · {t.user?.email ?? "—"}
            </div>
            <div className="mt-3 p-3 bg-bg rounded-lg text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {t.body}
            </div>
            <div className="flex gap-2 mt-3 pt-2 border-t border-border flex-wrap">
              <Link
                href={adminHref(`/admin/crm/${t.id}`) as any}
                className="text-xs px-3 py-1 rounded-lg bg-accent text-black font-bold inline-flex items-center gap-1"
              >
                <MessageSquare size={11} /> 打開對話
              </Link>
              {t.status !== "in_progress" && (
                <button onClick={() => setStatus(t.id, "in_progress")} className="text-xs px-3 py-1 rounded-lg border border-border flex items-center gap-1">
                  <Pause size={11} /> 處理中
                </button>
              )}
              {t.status !== "resolved" && (
                <button onClick={() => setStatus(t.id, "resolved")} className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                  <Check size={11} /> 解決
                </button>
              )}
              {t.status !== "closed" && (
                <button onClick={() => setStatus(t.id, "closed")} className="text-xs px-3 py-1 rounded-lg border border-border text-fg-muted flex items-center gap-1">
                  <X size={11} /> 關閉
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
