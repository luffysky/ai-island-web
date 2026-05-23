"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Send, Trash2, CornerDownRight, Loader2, Check } from "lucide-react";
import type { ForumReply } from "@/lib/forum-types";
import { LikeButton } from "@/components/blog/LikeButton";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function ThreadReplies({
  threadId,
  initialReplies,
  isLocked,
  threadOwnerId,
}: {
  threadId: string;
  initialReplies: ForumReply[];
  isLocked: boolean;
  threadOwnerId: string;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [replies, setReplies] = useState<ForumReply[]>(initialReplies);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isThreadOwner = currentUserId === threadOwnerId;

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
      setIsLoggedIn(!!user);
    });
  }, []);

  const totalCount = replies.reduce((s, r) => s + 1 + (r.replies?.length ?? 0), 0);

  // optimistic：點 send 立刻 push、失敗 toast 退回
  const submit = async (content: string, parentId: string | null) => {
    if (!content.trim() || sending) return;
    const trimmed = content.trim();
    const tempId = `temp_${Date.now()}`;
    const author = {
      display_name: "你",
      username: "you",
      avatar_url: null,
      level: 1,
    };
    const temp: ForumReply = {
      id: tempId,
      thread_id: threadId,
      user_id: currentUserId ?? "",
      content: trimmed,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      is_answer: false,
      author,
      replies: [],
      _pending: true,
    } as any;

    // 立刻插入畫面
    if (parentId) {
      setReplies((list) =>
        list.map((r) => (r.id === parentId ? { ...r, replies: [...(r.replies ?? []), temp] } : r)),
      );
    } else {
      setReplies((list) => [...list, temp]);
    }
    if (parentId) {
      setReplyInput("");
      setReplyTo(null);
    } else {
      setInput("");
    }

    setSending(true);
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, parent_id: parentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "送出失敗");

      // 把暫時項換成 server 回的真實項
      const real = json.reply ?? json;
      const swap = (r: ForumReply): ForumReply =>
        r.id === tempId
          ? { ...real, replies: [] }
          : { ...r, replies: r.replies?.map(swap) };
      setReplies((list) => list.map(swap));
    } catch (e: any) {
      // 退回：移除暫時項
      const drop = (r: ForumReply): ForumReply => ({
        ...r,
        replies: r.replies?.filter((x) => x.id !== tempId).map(drop),
      });
      setReplies((list) => list.filter((r) => r.id !== tempId).map(drop));
      toast.error("回覆失敗：" + (e?.message || "請稍後再試"));
    } finally {
      setSending(false);
    }
  };

  // optimistic：點刪立刻消失、5 秒 undo toast、過 5 秒才真刪
  const remove = async (replyId: string) => {
    const ok = await confirm({
      title: "刪除這則回覆？",
      description: "5 秒內可在右下方提示中撤銷。",
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;

    let snapshot: ForumReply[] = [];
    setReplies((list) => {
      snapshot = list;
      const drop = (r: ForumReply): ForumReply => ({
        ...r,
        replies: r.replies?.filter((x) => x.id !== replyId).map(drop),
      });
      return list.filter((r) => r.id !== replyId).map(drop);
    });

    let undone = false;
    toast.warning("已刪除一則回覆", {
      duration: 5000,
      action: {
        label: "撤銷",
        onClick: () => {
          undone = true;
          setReplies(snapshot);
        },
      },
    });

    // 5 秒後送 DELETE 請求（若 user 沒按 undo）
    setTimeout(async () => {
      if (undone) return;
      try {
        const res = await fetch(
          `/api/forum/threads/${threadId}/replies?reply=${replyId}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error();
      } catch {
        // server 刪失敗、恢復狀態 + 提示
        setReplies(snapshot);
        toast.error("刪除失敗、已恢復");
      }
    }, 5000);
  };

  const markAnswer = async (replyId: string, isAnswer: boolean) => {
    // optimistic：立刻切換採納狀態
    setReplies((list) =>
      list.map((r) =>
        r.id === replyId ? { ...r, is_answer: isAnswer } : { ...r, is_answer: isAnswer ? false : r.is_answer },
      ),
    );
    try {
      const res = await fetch(
        `/api/forum/threads/${threadId}/replies?reply=${replyId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_answer: isAnswer }),
        },
      );
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.message || j.error || "操作失敗");
      }
      toast.success(isAnswer ? "已採納為解答" : "已取消採納");
    } catch (e: any) {
      // 退回
      setReplies((list) =>
        list.map((r) => (r.id === replyId ? { ...r, is_answer: !isAnswer } : r)),
      );
      toast.error(e?.message || "操作失敗");
    }
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold mb-4">
        {totalCount > 0 ? `${totalCount} 則回覆` : "回覆"}
      </h2>

      {/* 回覆列表 */}
      {replies.length > 0 && (
        <div className="space-y-3 mb-6">
          {replies.map((r) => (
            <div key={r.id}>
              <ReplyItem reply={r} currentUserId={currentUserId} onDelete={remove} onReply={() => setReplyTo(replyTo === r.id ? null : r.id)} canMarkAnswer={isThreadOwner} onMarkAnswer={markAnswer} />
              {/* 回覆框 */}
              {replyTo === r.id && (
                <div className="ml-10 mt-2 flex gap-2">
                  <input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(replyInput, r.id); }}
                    placeholder="回覆..."
                    className="flex-1 bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => submit(replyInput, r.id)}
                    disabled={!replyInput.trim() || sending}
                    className="px-3 py-1.5 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    送出
                  </button>
                </div>
              )}
              {/* 巢狀回覆 */}
              {r.replies && r.replies.length > 0 && (
                <div className="ml-10 mt-2 space-y-2 border-l-2 border-border pl-3">
                  {r.replies.map((sub) => (
                    <ReplyItem key={sub.id} reply={sub} currentUserId={currentUserId} onDelete={remove} isReply />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 發表回覆 */}
      {isLocked ? (
        <div className="text-sm text-fg-muted text-center py-4 bg-bg-card rounded-xl border border-border">
          🔒 這個主題已鎖定、無法回覆
        </div>
      ) : !isLoggedIn ? (
        <div className="text-sm text-fg-muted text-center py-4 bg-bg-card rounded-xl border border-border">
          請先登入才能回覆
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-card p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="寫下你的回覆..."
            rows={3}
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => submit(input, null)}
              disabled={!input.trim()}
              className="px-4 py-1.5 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 flex items-center gap-1 active:scale-95 transition-transform"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              回覆
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ReplyItem({
  reply,
  currentUserId,
  onDelete,
  onReply,
  isReply,
  canMarkAnswer,
  onMarkAnswer,
}: {
  reply: ForumReply & { _pending?: boolean };
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onReply?: () => void;
  isReply?: boolean;
  canMarkAnswer?: boolean;
  onMarkAnswer?: (replyId: string, isAnswer: boolean) => void;
}) {
  const isOwn = currentUserId && reply.user_id === currentUserId;
  const name = reply.author?.display_name || reply.author?.username || "用戶";
  return (
    <div
      className={`rounded-lg bg-bg-card border p-3 transition-opacity ${reply.is_answer ? "border-accent" : "border-border"} ${reply._pending ? "opacity-60" : ""}`}
    >
      {reply.is_answer && (
        <div className="text-xs text-accent font-bold mb-1">✓ 已採納為解答</div>
      )}
      <div className="flex items-start gap-2">
        {reply.author?.avatar_url ? (
          <Image
            src={reply.author.avatar_url}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-xs flex-shrink-0">
            {name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">{name}</span>
            <span className="px-1 py-px rounded bg-bg-elevated text-[9px] font-bold">
              Lv{reply.author?.level ?? 1}
            </span>
            <span className="text-[10px] text-fg-muted">
              {new Date(reply.created_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
            {reply._pending && (
              <span className="text-[10px] text-fg-muted italic">傳送中...</span>
            )}
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap break-words">{reply.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <LikeButton kind="forum" targetId={reply.id} />
            {!isReply && onReply && (
              <button onClick={onReply} className="text-xs text-fg-muted hover:text-accent flex items-center gap-0.5">
                <CornerDownRight size={11} /> 回覆
              </button>
            )}
            {!isReply && canMarkAnswer && onMarkAnswer && (
              <button
                onClick={() => onMarkAnswer(reply.id, !reply.is_answer)}
                className={`text-xs flex items-center gap-0.5 ${
                  reply.is_answer
                    ? "text-accent font-semibold"
                    : "text-fg-muted hover:text-accent"
                }`}
              >
                <Check size={11} /> {reply.is_answer ? "取消採納" : "採納為解答"}
              </button>
            )}
            {isOwn && !reply._pending && (
              <button onClick={() => onDelete(reply.id)} className="text-xs text-fg-muted hover:text-red-400 flex items-center gap-0.5">
                <Trash2 size={11} /> 刪除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
