"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ThreadActions({ thread }: { thread: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (action: string) => {
    if (action === "delete" && !confirm("確定刪除主題？所有回覆會一起刪")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/moderation/forum-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: thread.id, action }),
      });
      const data = await res.json();
      if (!res.ok) alert(`失敗：${data.error}`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1 flex-shrink-0">
      <div className="flex gap-1">
        <ActionBtn onClick={() => act(thread.is_pinned ? "unpin" : "pin")} busy={busy}>
          {thread.is_pinned ? "解釘" : "釘文"}
        </ActionBtn>
        <ActionBtn onClick={() => act(thread.is_locked ? "unlock" : "lock")} busy={busy}>
          {thread.is_locked ? "解鎖" : "鎖串"}
        </ActionBtn>
        <ActionBtn onClick={() => act(thread.is_featured ? "unfeature" : "feature")} busy={busy}>
          {thread.is_featured ? "撤精華" : "設精華"}
        </ActionBtn>
      </div>
      <div className="flex gap-1">
        <ActionBtn onClick={() => act(thread.is_hidden ? "show" : "hide")} busy={busy} variant="warning">
          {thread.is_hidden ? "顯示" : "隱藏"}
        </ActionBtn>
        <ActionBtn onClick={() => act("delete")} busy={busy} variant="danger">
          刪除
        </ActionBtn>
      </div>
    </div>
  );
}

export function ReplyActions({ reply }: { reply: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (action: string) => {
    if (action === "delete" && !confirm("刪除這則回覆？")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/moderation/forum-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reply.id, action }),
      });
      const data = await res.json();
      if (!res.ok) alert(`失敗：${data.error}`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-1 flex-shrink-0">
      <ActionBtn onClick={() => act(reply.is_hidden ? "show" : "hide")} busy={busy} variant="warning">
        {reply.is_hidden ? "顯示" : "隱藏"}
      </ActionBtn>
      <ActionBtn onClick={() => act("delete")} busy={busy} variant="danger">
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
    "bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border)]";
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
