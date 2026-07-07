"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm, usePrompt } from "@/components/ui/ConfirmDialog";

type Row = {
  id: string; _name: string; fruit_amount: number; ntd_amount: number; fee_ntd: number;
  account_name?: string | null; bank_name?: string | null; bank_account?: string | null;
  status: string; admin_note?: string | null; requested_at: string; processed_at?: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "待撥款", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  approved: { label: "已核准", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  paid: { label: "已撥款", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "已駁回", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

export function AdminPayoutsClient({ rows, pendingCount }: { rows: Row[]; pendingCount: number }) {
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [list, setList] = useState<Row[]>(rows);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(row: Row, action: "paid" | "rejected") {
    if (action === "rejected") {
      const ok = await confirm({ title: `駁回 ${row._name} 的提現？`, description: "果實會自動退回給對方。", destructive: true, confirmLabel: "駁回" });
      if (!ok) return;
    }
    let ntdAmount: number | undefined;
    if (action === "paid") {
      const v = await prompt({ title: "實際撥款金額（NTD）", defaultValue: String(row.ntd_amount), placeholder: "NT$" });
      if (v === null) return;
      ntdAmount = Math.max(0, Math.floor(Number(v) || 0));
    }
    const note = action === "rejected"
      ? (await prompt({ title: "駁回原因（會顯示給對方，可留空）", multiline: true })) ?? undefined
      : undefined;
    setBusy(row.id);
    try {
      const res = await fetch(`/api/admin/payouts/${row.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ntdAmount, adminNote: note }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.message || "處理失敗");
      setList((l) => l.map((x) => x.id === row.id ? { ...x, status: action, admin_note: note ?? x.admin_note, ntd_amount: ntdAmount ?? x.ntd_amount, processed_at: new Date().toISOString() } : x));
      toast.success(action === "paid" ? "已標記撥款" : "已駁回、果實退回");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-fg-muted">待處理 <b className="text-amber-500">{pendingCount}</b> 筆 · 共 {list.length} 筆</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs text-fg-muted border-b border-border">
              <th className="py-2 pr-3">申請人</th>
              <th className="py-2 pr-3">果實 → NTD</th>
              <th className="py-2 pr-3">收款帳戶</th>
              <th className="py-2 pr-3">狀態</th>
              <th className="py-2 pr-3">申請時間</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const st = STATUS[r.status] ?? STATUS.pending;
              const actionable = r.status === "pending" || r.status === "approved";
              return (
                <tr key={r.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-3 font-medium">{r._name}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">🌰 {r.fruit_amount.toLocaleString()} <span className="text-fg-muted">→</span> NT${r.ntd_amount.toLocaleString()}{r.fee_ntd > 0 && <span className="text-[11px] text-fg-muted"> (費{r.fee_ntd})</span>}</td>
                  <td className="py-2 pr-3 text-xs">
                    <div>{r.account_name || "—"}</div>
                    <div className="text-fg-muted">{r.bank_name || ""} {r.bank_account || ""}</div>
                  </td>
                  <td className="py-2 pr-3"><span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>{r.admin_note && <div className="text-[10px] text-fg-muted mt-0.5 max-w-[160px] truncate" title={r.admin_note}>{r.admin_note}</div>}</td>
                  <td className="py-2 pr-3 text-xs text-fg-muted whitespace-nowrap">{new Date(r.requested_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2">
                    {actionable ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => act(r, "paid")} disabled={busy === r.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold disabled:opacity-40">
                          {busy === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} 已撥款
                        </button>
                        <button onClick={() => act(r, "rejected")} disabled={busy === r.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/25 text-xs disabled:opacity-40">
                          <X size={12} /> 駁回
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-fg-muted">{r.processed_at ? new Date(r.processed_at).toLocaleDateString("zh-TW") : "—"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-fg-muted text-sm">還沒有提現申請。</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
