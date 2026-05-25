"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function ModerationActions({
  commentId,
  approved,
}: {
  commentId: string;
  approved: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [optimisticApproved, setOptimisticApproved] = useOptimistic(
    approved,
    (_current, next: boolean) => next,
  );
  const [deleted, setDeleted] = useState(false);

  const act = (action: "approve" | "reject" | "delete") => {
    startTransition(async () => {
      if (action === "approve") setOptimisticApproved(true);
      if (action === "reject") setOptimisticApproved(false);
      if (action === "delete") setDeleted(true);
      try {
        const res = await fetch("/api/admin/moderation/blog-comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: commentId, action }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(`失敗：${data.error}`);
          setOptimisticApproved(approved);
          setDeleted(false);
        } else {
          toast.success(action === "approve" ? "已通過" : action === "reject" ? "已撤回" : "已刪除");
          router.refresh();
        }
      } catch (e: any) {
        toast.error(`網路錯誤：${e?.message ?? "unknown"}`);
        setOptimisticApproved(approved);
        setDeleted(false);
      }
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "確定刪除這則留言？",
      confirmLabel: "刪除",
      destructive: true,
    });
    if (ok) act("delete");
  };

  if (deleted) {
    return (
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border text-xs text-fg-muted italic">
        已刪除 · 正在重整
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 mt-2 pt-2 border-t border-border transition-opacity ${pending ? "opacity-60" : ""}`}>
      {!optimisticApproved && (
        <button
          onClick={() => act("approve")}
          disabled={pending}
          className="text-xs flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          <Check size={12} /> 通過
        </button>
      )}
      {optimisticApproved && (
        <button
          onClick={() => act("reject")}
          disabled={pending}
          className="text-xs flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/15 text-orange-500 hover:bg-orange-500/25 disabled:opacity-50"
        >
          <X size={12} /> 撤回
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={pending}
        className="text-xs flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/15 text-red-300 hover:bg-red-500/25 hover:text-red-200 disabled:opacity-50"
      >
        <Trash2 size={12} /> 刪除
      </button>
    </div>
  );
}
