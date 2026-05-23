"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatTW } from "@/lib/format-date";

type Report = {
  id: string;
  target_type: string;
  target_id: string;
  target_owner_id: string | null;
  reason: string;
  note: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
  reporter: { username: string; display_name: string | null } | null;
  owner: { username: string; display_name: string | null } | null;
};

const REASON_COLOR: Record<string, string> = {
  spam: "bg-gray-500/15 text-gray-400",
  harassment: "bg-orange-500/15 text-orange-400",
  hate_speech: "bg-red-500/15 text-red-400",
  sexual: "bg-pink-500/15 text-pink-400",
  illegal: "bg-purple-500/15 text-purple-400",
  self_harm: "bg-red-600/20 text-red-500",
  other: "bg-blue-500/15 text-blue-400",
};

const TARGET_LABEL: Record<string, string> = {
  thread: "論壇主題",
  reply: "論壇回覆",
  blog_article: "部落格文章",
  blog_comment: "部落格留言",
  user: "使用者",
  ai_message: "AI 對話",
};

export function ReportsClient({
  initial,
  filters,
}: {
  initial: Report[];
  filters: { status: string; reason: string; target_type: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(initial);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams();
    const merged = { ...filters, [key]: value };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") params.set(k, v);
    }
    router.push(`?${params.toString()}` as any);
  };

  const act = async (id: string, action: "resolve" | "dismiss" | "escalate") => {
    let note: string | null = null;
    if (action === "resolve" || action === "escalate") {
      note = window.prompt(`${action === "resolve" ? "解決" : "升級"}說明（選）：`);
      if (note === null) return;
    } else {
      const ok = await confirm({
        title: "駁回此檢舉？",
        description: "標記為「無問題」、不處理 target。",
        confirmLabel: "駁回",
      });
      if (!ok) return;
    }

    setRows((rs) => rs.map((r) => r.id === id ? { ...r, status: action === "escalate" ? "escalated" : action === "resolve" ? "resolved" : "dismissed" } : r));
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
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
      {/* Filters */}
      <div className="rounded-xl bg-bg-card border border-border p-3 mb-4 flex flex-wrap gap-2 text-sm">
        <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1">
          <option value="pending">待處理</option>
          <option value="resolved">已解決</option>
          <option value="dismissed">已駁回</option>
          <option value="escalated">已升級</option>
          <option value="all">全部</option>
        </select>
        <select value={filters.reason} onChange={(e) => updateFilter("reason", e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1">
          <option value="">所有原因</option>
          {Object.keys(REASON_COLOR).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.target_type} onChange={(e) => updateFilter("target_type", e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1">
          <option value="">所有 target</option>
          {Object.entries(TARGET_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="rounded-xl bg-bg-card border border-border divide-y divide-border">
        {rows.length === 0 ? (
          <div className="text-center py-12 text-fg-muted text-sm">🎉 沒有待處理的檢舉</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="p-3">
              <div className="flex items-start gap-2 mb-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${REASON_COLOR[r.reason] ?? "bg-bg-elevated text-fg-muted"}`}>
                  {r.reason}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">
                  {TARGET_LABEL[r.target_type] ?? r.target_type}
                </span>
                <span className="text-[10px] text-fg-muted ml-auto">{formatTW(r.created_at)}</span>
              </div>
              <div className="text-sm">
                <span className="text-fg-muted">檢舉者：</span>
                <span className="font-medium">{r.reporter?.display_name || r.reporter?.username || "—"}</span>
                {r.owner && (
                  <>
                    <span className="text-fg-muted ml-3">被檢舉內容作者：</span>
                    <span className="font-medium">{r.owner.display_name || r.owner.username}</span>
                  </>
                )}
              </div>
              <div className="text-xs text-fg-muted mt-1 font-mono">
                target_id: {r.target_id}
              </div>
              {r.note && (
                <div className="mt-2 p-2 bg-bg rounded-lg text-xs italic">
                  「{r.note}」
                </div>
              )}
              {r.resolution_note && (
                <div className="mt-2 p-2 bg-emerald-500/10 rounded-lg text-xs text-emerald-300">
                  解決：{r.resolution_note}
                </div>
              )}
              {r.status === "pending" && (
                <div className="flex gap-2 mt-3 pt-2 border-t border-border">
                  <button onClick={() => act(r.id, "resolve")} className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center gap-1">
                    <Check size={11} /> 解決
                  </button>
                  <button onClick={() => act(r.id, "dismiss")} className="text-xs px-3 py-1 rounded-lg bg-gray-500/15 text-gray-400 hover:bg-gray-500/25 flex items-center gap-1">
                    <X size={11} /> 駁回
                  </button>
                  <button onClick={() => act(r.id, "escalate")} className="text-xs px-3 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 flex items-center gap-1">
                    <AlertTriangle size={11} /> 升級
                  </button>
                </div>
              )}
              {r.status !== "pending" && (
                <div className="text-[10px] text-fg-muted mt-2">
                  狀態：<span className="font-bold">{r.status}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
