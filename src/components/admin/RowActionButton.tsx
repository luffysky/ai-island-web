"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useConfirm, usePrompt } from "@/components/ui/ConfirmDialog";

/**
 * 通用「危險列操作」按鈕 — 給金流工作台的退款 / 取消訂閱用。
 * 點下去先 confirm（可帶原因）、再 POST 到 endpoint、成功後 router.refresh() 拉最新資料。
 */
export function RowActionButton({
  endpoint,
  label,
  confirmText,
  askReason = true,
  className,
  successLabel = "已處理",
}: {
  endpoint: string;
  label: string;
  confirmText: string;
  askReason?: boolean;
  className?: string;
  successLabel?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string>("");

  async function run() {
    if (busy || done) return;
    if (!(await confirm({ title: confirmText }))) return;
    let reason = "";
    if (askReason) {
      reason = (await prompt({ title: "原因（會寫進 audit log、可留空）", defaultValue: "", multiline: true })) ?? "";
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(data.error || `失敗 (${res.status})`);
        return;
      }
      setDone(true);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "網路錯誤");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <span className="text-[11px] text-emerald-400">{successLabel}</span>;
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={run}
        disabled={busy}
        className={
          className ??
          "px-2 py-1 rounded-md text-[11px] font-bold bg-red-500/15 border border-red-500/40 hover:bg-red-500/25 disabled:opacity-40 text-red-900 dark:text-red-200 transition inline-flex items-center gap-1"
        }
      >
        {busy ? <><Loader2 className="w-3 h-3 animate-spin" /> 處理中</> : label}
      </button>
      {err && <span className="text-[10px] text-red-400">{err}</span>}
    </span>
  );
}
