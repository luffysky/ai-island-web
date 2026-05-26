"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const ACTION_TO_FIELD: Record<string, { field: string; value: boolean }> = {
  pin: { field: "is_pinned", value: true },
  unpin: { field: "is_pinned", value: false },
  lock: { field: "is_locked", value: true },
  unlock: { field: "is_locked", value: false },
  feature: { field: "is_featured", value: true },
  unfeature: { field: "is_featured", value: false },
  hide: { field: "is_hidden", value: true },
  show: { field: "is_hidden", value: false },
};

export function ThreadActions({ thread }: { thread: any }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [optimisticThread, applyOptimistic] = useOptimistic(
    thread,
    (current: any, patch: { field: string; value: boolean }) => ({
      ...current,
      [patch.field]: patch.value,
    }),
  );
  const [deleted, setDeleted] = useState(false);

  const act = async (action: string) => {
    if (action === "delete") {
      const ok = await confirm({
        title: "確定刪除主題？",
        description: "所有回覆都會一起刪、無法復原。",
        confirmLabel: "刪除",
        destructive: true,
      });
      if (!ok) return;
    }
    startTransition(async () => {
      const map = ACTION_TO_FIELD[action];
      if (map) applyOptimistic(map);
      if (action === "delete") setDeleted(true);
      try {
        const res = await fetch("/api/admin/moderation/forum-thread", {
      credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: thread.id, action }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(`失敗：${data.error}`);
          setDeleted(false);
        } else {
          toast.success("已完成");
          router.refresh();
        }
      } catch (e: any) {
        toast.error(`網路錯誤：${e?.message ?? "unknown"}`);
        setDeleted(false);
      }
    });
  };

  if (deleted) {
    return <div className="text-[10px] text-fg-muted italic shrink-0">已刪除 · 重整中</div>;
  }

  return (
    <div className={`flex flex-col items-end gap-1 shrink-0 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="flex gap-1">
        <ActionBtn onClick={() => act(optimisticThread.is_pinned ? "unpin" : "pin")} busy={pending}>
          {optimisticThread.is_pinned ? "解釘" : "釘文"}
        </ActionBtn>
        <ActionBtn onClick={() => act(optimisticThread.is_locked ? "unlock" : "lock")} busy={pending}>
          {optimisticThread.is_locked ? "解鎖" : "鎖串"}
        </ActionBtn>
        <ActionBtn onClick={() => act(optimisticThread.is_featured ? "unfeature" : "feature")} busy={pending}>
          {optimisticThread.is_featured ? "撤精華" : "設精華"}
        </ActionBtn>
      </div>
      <div className="flex gap-1">
        <ActionBtn onClick={() => act(optimisticThread.is_hidden ? "show" : "hide")} busy={pending} variant="warning">
          {optimisticThread.is_hidden ? "顯示" : "隱藏"}
        </ActionBtn>
        <ActionBtn onClick={() => act("delete")} busy={pending} variant="danger">
          刪除
        </ActionBtn>
      </div>
    </div>
  );
}

export function ReplyActions({ reply }: { reply: any }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [optimisticReply, applyOptimistic] = useOptimistic(
    reply,
    (current: any, patch: { field: string; value: boolean }) => ({
      ...current,
      [patch.field]: patch.value,
    }),
  );
  const [deleted, setDeleted] = useState(false);

  const act = async (action: string) => {
    if (action === "delete") {
      const ok = await confirm({
        title: "刪除這則回覆？",
        confirmLabel: "刪除",
        destructive: true,
      });
      if (!ok) return;
    }
    startTransition(async () => {
      const map = ACTION_TO_FIELD[action];
      if (map) applyOptimistic(map);
      if (action === "delete") setDeleted(true);
      try {
        const res = await fetch("/api/admin/moderation/forum-reply", {
      credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: reply.id, action }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(`失敗：${data.error}`);
          setDeleted(false);
        } else {
          toast.success("已完成");
          router.refresh();
        }
      } catch (e: any) {
        toast.error(`網路錯誤：${e?.message ?? "unknown"}`);
        setDeleted(false);
      }
    });
  };

  if (deleted) {
    return <div className="text-[10px] text-fg-muted italic shrink-0">已刪除 · 重整中</div>;
  }

  return (
    <div className={`flex gap-1 shrink-0 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <ActionBtn onClick={() => act(optimisticReply.is_hidden ? "show" : "hide")} busy={pending} variant="warning">
        {optimisticReply.is_hidden ? "顯示" : "隱藏"}
      </ActionBtn>
      <ActionBtn onClick={() => act("delete")} busy={pending} variant="danger">
        刪除
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
  onClick,
  busy,
  variant,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  variant?: "warning" | "danger";
  children: React.ReactNode;
}) {
  const tone =
    variant === "danger" ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" :
    variant === "warning" ? "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25" :
    "bg-bg-elevated hover:bg-border";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`text-[10px] px-2 py-0.5 rounded-full disabled:opacity-50 transition ${tone}`}
    >
      {children}
    </button>
  );
}
