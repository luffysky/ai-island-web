"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ArrowUp } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatTW } from "@/lib/format-date";
import { EmptyState } from "@/components/ui/EmptyState";

type Flag = {
  id: string;
  role: string;
  content_snippet: string;
  flag_reason: string;
  severity: string;
  status: string;
  created_at: string;
  meta: any;
  message_id: string | null;
  conversation_id: string | null;
  user: { username: string; display_name: string | null } | null;
};

const SEV_COLOR: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-400",
  warn: "bg-yellow-500/15 text-yellow-400",
  high: "bg-orange-500/15 text-orange-400",
  critical: "bg-red-600/20 text-red-500",
};

export function ModerationClient({ initial, filters }: { initial: Flag[]; filters: { status: string; severity: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initial);

  const update = (key: string, val: string) => {
    const p = new URLSearchParams();
    const merged = { ...filters, [key]: val };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all") p.set(k, v);
    router.push(`?${p.toString()}` as any);
  };

  const act = async (id: string, status: "dismissed" | "escalated" | "resolved") => {
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, status } : r));
    try {
      const res = await fetch(`/api/admin/ai-moderation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success("已處理");
    } catch {
      toast.error("處理失敗");
      router.refresh();
    }
  };

  return (
    <div>
      <div className="rounded-xl bg-bg-card border border-border p-3 mb-4 flex flex-wrap gap-2 text-sm">
        <select value={filters.status} onChange={(e) => update("status", e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1">
          <option value="pending">待處理</option>
          <option value="dismissed">已駁回</option>
          <option value="escalated">已升級</option>
          <option value="resolved">已解決</option>
          <option value="all">全部</option>
        </select>
        <select value={filters.severity} onChange={(e) => update("severity", e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1">
          <option value="">全部嚴重度</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </div>

      <div className="rounded-xl bg-bg-card border border-border divide-y divide-border">
        {rows.length === 0 ? (
          <EmptyState emoji="🎉" title="沒有待處理的 flag" desc="AI 對話審核全部清乾淨了。新進來的會自動列上" />
        ) : rows.map((r) => (
          <div key={r.id} className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${SEV_COLOR[r.severity]}`}>{r.severity}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{r.flag_reason}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{r.role}</span>
              <span className="text-[10px] text-fg-muted ml-auto">{formatTW(r.created_at)}</span>
            </div>
            <div className="text-sm">
              <span className="text-fg-muted">user：</span>
              <span className="font-medium">{r.user?.display_name || r.user?.username || "—"}</span>
            </div>
            <div className="mt-2 p-2 bg-bg rounded-lg text-xs whitespace-pre-wrap break-words">
              {r.content_snippet}
            </div>
            {r.status === "pending" && (
              <div className="flex gap-2 mt-3 pt-2 border-t border-border">
                <button onClick={() => act(r.id, "resolved")} className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                  <Check size={11} /> 已處理
                </button>
                <button onClick={() => act(r.id, "dismissed")} className="text-xs px-3 py-1 rounded-lg bg-gray-500/15 text-gray-400 flex items-center gap-1">
                  <X size={11} /> 駁回
                </button>
                <button onClick={() => act(r.id, "escalated")} className="text-xs px-3 py-1 rounded-lg bg-red-500/15 text-red-400 flex items-center gap-1">
                  <ArrowUp size={11} /> 升級
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
