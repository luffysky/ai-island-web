"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { adminHref } from "@/lib/admin-href";

export function ImpersonateForm() {
  const router = useRouter();
  const toast = useToast();
  const [targetUserId, setTargetUserId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (busy || !targetUserId.trim() || reason.trim().length < 5) {
      toast.warning("需 target user ID + 理由（≥ 5 字）");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUserId.trim(), reason: reason.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || j.message || "失敗");
      router.push(adminHref(`/admin/impersonate/${targetUserId.trim()}`) as any);
    } catch (e: any) {
      toast.error(`啟動失敗：${e?.message || ""}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl bg-bg-card border border-border p-4 space-y-2">
      <div className="text-sm font-bold flex items-center gap-1"><Eye size={14} /> 啟動 Impersonate</div>
      <div className="flex flex-col md:flex-row gap-2">
        <input
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="Target user ID（UUID）"
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="理由（會記入 audit）"
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={start}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm disabled:opacity-50"
        >
          {busy ? "啟動中…" : "啟動檢視"}
        </button>
      </div>
      <p className="text-[11px] text-fg-muted">
        ℹ️ Impersonate = read-only viewer，不會真的登入成對方、不會發訊息給對方。
      </p>
    </div>
  );
}
