"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useEffect } from "react";
import { Send, Trash2, CornerDownRight, Loader2, Check } from "lucide-react";
import type { ForumReply } from "@/lib/forum-types";
import { LikeButton } from "@/components/blog/LikeButton";

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
  const [replies, setReplies] = useState<ForumReply[]>(initialReplies);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isThreadOwner = currentUserId === threadOwnerId;

  const markAnswer = async (replyId: string, isAnswer: boolean) => {
    const res = await fetch(`/api/forum/threads/${threadId}/replies?reply=${replyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_answer: isAnswer }),
    });
    if (res.ok) await refresh();
    else {
      const j = await res.json();
      alert(j.message || j.error || "操作失敗");
    }
  };

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
      setIsLoggedIn(!!user);
    });
  }, []);

  const totalCount = replies.reduce((s, r) => s + 1 + (r.replies?.length ?? 0), 0);

  const refresh = async () => {
    const res = await fetch(`/api/forum/threads/${threadId}`);
    const json = await res.json();
    setReplies(json.replies ?? []);
  };

  const submit = async (content: string, parentId: string | null) => {
    if (!content.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/forum/threads/${threadId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parent_id: parentId }),
    });
    setSending(false);
    const json = await res.json();
    if (!res.ok) {
      alert("回覆失敗：" + (json.message || json.error));
      return;
    }
    await refresh();
    setInput("");
    setReplyInput("");
    setReplyTo(null);
  };

  const remove = async (replyId: string) => {
    if (!confirm("刪除這則回覆？")) return;
    const res = await fetch(`/api/forum/threads/${threadId}/replies?reply=${replyId}`, { method: "DELETE" });
    if (res.ok) await refresh();
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
                    className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  />
                  <button
                    onClick={() => submit(replyInput, r.id)}
                    disabled={!replyInput.trim() || sending}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-black text-sm font-semibold disabled:opacity-40"
                  >
                    送出
                  </button>
                </div>
              )}
              {/* 巢狀回覆 */}
              {r.replies && r.replies.length > 0 && (
                <div className="ml-10 mt-2 space-y-2 border-l-2 border-[var(--color-border)] pl-3">
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
        <div className="text-sm text-[var(--color-fg-muted)] text-center py-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
          🔒 這個主題已鎖定、無法回覆
        </div>
      ) : !isLoggedIn ? (
        <div className="text-sm text-[var(--color-fg-muted)] text-center py-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
          請先登入才能回覆
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="寫下你的回覆..."
            rows={3}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)] resize-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => submit(input, null)}
              disabled={!input.trim() || sending}
              className="px-4 py-1.5 rounded-lg bg-[var(--color-accent)] text-black text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
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
  reply: ForumReply;
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
    <div className={`rounded-lg bg-[var(--color-bg-card)] border p-3 ${reply.is_answer ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"}`}>
      {reply.is_answer && (
        <div className="text-xs text-[var(--color-accent)] font-bold mb-1">✓ 已採納為解答</div>
      )}
      <div className="flex items-start gap-2">
        {reply.author?.avatar_url ? (
          <img src={reply.author.avatar_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-xs flex-shrink-0">
            {name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">{name}</span>
            <span className="px-1 py-px rounded bg-[var(--color-bg-elevated)] text-[9px] font-bold">
              Lv{reply.author?.level ?? 1}
            </span>
            <span className="text-[10px] text-[var(--color-fg-muted)]">
              {new Date(reply.created_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap break-words">{reply.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <LikeButton kind="forum" targetId={reply.id} />
            {!isReply && onReply && (
              <button onClick={onReply} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] flex items-center gap-0.5">
                <CornerDownRight size={11} /> 回覆
              </button>
            )}
            {/* 採納解答：限串主、頂層回覆 */}
            {!isReply && canMarkAnswer && onMarkAnswer && (
              <button
                onClick={() => onMarkAnswer(reply.id, !reply.is_answer)}
                className={`text-xs flex items-center gap-0.5 ${
                  reply.is_answer
                    ? "text-[var(--color-accent)] font-semibold"
                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]"
                }`}
              >
                <Check size={11} /> {reply.is_answer ? "取消採納" : "採納為解答"}
              </button>
            )}
            {isOwn && (
              <button onClick={() => onDelete(reply.id)} className="text-xs text-[var(--color-fg-muted)] hover:text-red-400 flex items-center gap-0.5">
                <Trash2 size={11} /> 刪除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
