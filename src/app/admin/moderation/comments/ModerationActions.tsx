"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";

export function ModerationActions({
  commentId,
  approved,
}: {
  commentId: string;
  approved: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (action: "approve" | "reject" | "delete") => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/moderation/blog-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentId, action }),
      });
      const data = await res.json();
      if (!res.ok) alert(`失敗：${data.error}`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
      {!approved && (
        <button
          onClick={() => act("approve")}
          disabled={busy}
          className="text-xs flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          <Check size={12} /> 通過
        </button>
      )}
      {approved && (
        <button
          onClick={() => act("reject")}
          disabled={busy}
          className="text-xs flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/15 text-orange-500 hover:bg-orange-500/25 disabled:opacity-50"
        >
          <X size={12} /> 撤回
        </button>
      )}
      <button
        onClick={() => {
          if (confirm("確定刪除這則留言？")) act("delete");
        }}
        disabled={busy}
        className="text-xs flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/15 text-red-500 hover:bg-red-500/25 disabled:opacity-50"
      >
        <Trash2 size={12} /> 刪除
      </button>
    </div>
  );
}
