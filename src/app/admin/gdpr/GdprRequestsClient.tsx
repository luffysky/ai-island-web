"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Download, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type GdprRow = {
  id: string;
  user_id: string;
  request_type: "export" | "delete";
  status: "pending" | "completed" | "cancelled" | "hard_deleted";
  requested_at: string;
  completed_at: string | null;
  scheduled_hard_delete_at: string | null;
  meta: any;
  user: { username: string; display_name: string | null; deleted_at: string | null } | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  completed: "bg-blue-500/15 text-blue-400",
  cancelled: "bg-gray-500/15 text-gray-400",
  hard_deleted: "bg-red-500/15 text-red-400",
};

export function GdprRequestsClient({ initial }: { initial: GdprRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(initial);

  const hardDelete = async (row: GdprRow) => {
    if (row.request_type !== "delete" || row.status !== "pending") return;
    const due =
      row.scheduled_hard_delete_at && new Date(row.scheduled_hard_delete_at) <= new Date();
    if (!due) {
      const ok = await confirm({
        title: "尚未到 7 天等候期、強制硬刪？",
        description: "建議等到排程時間到再執行。確定要立即硬刪嗎？",
        confirmLabel: "強制硬刪",
        destructive: true,
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: `永久刪除 ${row.user?.display_name || row.user?.username || row.user_id} 的帳號？`,
        description: "會呼叫 delete_user_account RPC、移除所有 profile 與相關資料、不可復原。",
        confirmLabel: "永久刪除",
        destructive: true,
      });
      if (!ok) return;
    }

    try {
      const res = await fetch(`/api/admin/gdpr/${row.id}/hard-delete`, {
      credentials: "include", method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "失敗");
      toast.success("已硬刪");
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: "hard_deleted" } : r)));
      router.refresh();
    } catch (e: any) {
      toast.error(`硬刪失敗：${e?.message || ""}`);
    }
  };

  return (
    <div className="rounded-xl bg-bg-card border border-border overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-bg-elevated text-fg-muted text-xs">
          <tr>
            <th className="text-left px-3 py-2">類型</th>
            <th className="text-left px-3 py-2">使用者</th>
            <th className="text-left px-3 py-2">狀態</th>
            <th className="text-left px-3 py-2">請求時間</th>
            <th className="text-left px-3 py-2">硬刪可執行</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-fg-muted text-sm">
                目前沒有 GDPR 請求
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const isDelete = r.request_type === "delete";
              const due =
                r.scheduled_hard_delete_at && new Date(r.scheduled_hard_delete_at) <= new Date();
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    {isDelete ? (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <Trash2 size={12} /> 刪除
                      </span>
                    ) : (
                      <span className="text-blue-400 font-bold flex items-center gap-1">
                        <Download size={12} /> 匯出
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {r.user?.display_name || r.user?.username || "—"}
                    </div>
                    <div className="text-[10px] text-fg-muted font-mono">{r.user_id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${STATUS_COLOR[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-fg-muted text-xs">
                    {new Date(r.requested_at).toLocaleString("zh-TW", { hour12: false })}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {isDelete && r.scheduled_hard_delete_at ? (
                      <span className={due ? "text-red-400 font-semibold" : "text-fg-muted"}>
                        {new Date(r.scheduled_hard_delete_at).toLocaleString("zh-TW", { hour12: false })}
                        {due && " ✓ 可執行"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isDelete && r.status === "pending" && (
                      <button
                        onClick={() => hardDelete(r)}
                        className={`text-xs px-3 py-1 rounded-lg flex items-center gap-1 ${
                          due
                            ? "bg-red-500 text-white"
                            : "border border-red-400/40 text-red-400 hover:bg-red-500/10"
                        }`}
                      >
                        <Trash2 size={11} /> 硬刪
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
