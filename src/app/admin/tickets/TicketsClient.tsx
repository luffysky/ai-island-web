"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Pause } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatTW } from "@/lib/format-date";

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
  low: "bg-gray-500/15 text-gray-400",
  normal: "bg-blue-500/15 text-blue-400",
  high: "bg-orange-500/15 text-orange-400",
  urgent: "bg-red-500/15 text-red-400",
};

export function TicketsClient({ initial, filterStatus }: { initial: Ticket[]; filterStatus: string }) {
  const router = useRouter();
  const toast = useToast();
  const [tickets, setTickets] = useState(initial);

  const setStatus = async (id: string, status: string) => {
    setTickets((ts) => ts.map((t) => t.id === id ? { ...t, status } : t));
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
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

  const reply = async (id: string) => {
    const body = window.prompt("回覆內容（會寫入 ticket_messages、user 在 /me/support 看到）：");
    if (!body || !body.trim()) return;
    try {
      const res = await fetch(`/api/admin/tickets/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error();
      toast.success("已回覆");
      setStatus(id, "waiting_user");
    } catch {
      toast.error("回覆失敗");
    }
  };

  return (
    <div>
      <div className="rounded-xl bg-bg-card border border-border p-3 mb-4 flex gap-2 text-sm">
        {["open", "in_progress", "waiting_user", "resolved", "all"].map((s) => (
          <a key={s} href={`?status=${s}`} className={`px-3 py-1 rounded-lg border ${filterStatus === s ? "bg-accent text-black border-accent font-bold" : "border-border"}`}>
            {s}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {tickets.length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm rounded-xl bg-bg-card border border-border">🎉 沒有符合的工單</div>
        ) : tickets.map((t) => (
          <div key={t.id} className="rounded-xl bg-bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
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
            <div className="flex gap-2 mt-3 pt-2 border-t border-border">
              <button onClick={() => reply(t.id)} className="text-xs px-3 py-1 rounded-lg bg-accent text-black font-bold">
                💬 回覆
              </button>
              {t.status !== "in_progress" && (
                <button onClick={() => setStatus(t.id, "in_progress")} className="text-xs px-3 py-1 rounded-lg border border-border flex items-center gap-1">
                  <Pause size={11} /> 處理中
                </button>
              )}
              {t.status !== "resolved" && (
                <button onClick={() => setStatus(t.id, "resolved")} className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
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
        ))}
      </div>
    </div>
  );
}
