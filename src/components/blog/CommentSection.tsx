"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { MessageSquare, Send, Trash2, CornerDownRight } from "lucide-react";
import type { BlogComment } from "@/lib/blog-types";
import { LikeButton } from "./LikeButton";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function CommentSection({
  userSlug,
  articleSlug,
}: {
  userSlug: string;
  articleSlug: string;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [guestName, setGuestName] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const apiBase = `/api/blog/${userSlug}/${articleSlug}/comments`;

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      const res = await fetch(apiBase);
      const json = await res.json();
      setComments(json.comments ?? []);
      setLoading(false);
    })();
  }, []);

  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0
  );

  const submit = async (content: string, parentId: string | null) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    // optimistic：立刻 push 暫時項
    const tempId = `temp_${Date.now()}`;
    const authorName = currentUserId ? "你" : (guestName || "匿名訪客");
    const temp: BlogComment = {
      id: tempId,
      user_id: currentUserId ?? null,
      author_name: authorName,
      author_avatar: null,
      content: trimmed,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      replies: [],
      _pending: true,
    } as any;

    if (parentId) {
      setComments((list) =>
        list.map((c) =>
          c.id === parentId ? { ...c, replies: [...(c.replies ?? []), temp] } : c,
        ),
      );
      setReplyInput("");
      setReplyTo(null);
    } else {
      setComments((list) => [...list, temp]);
      setInput("");
    }

    setSending(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          parent_id: parentId,
          author_name: currentUserId ? undefined : (guestName || "匿名訪客"),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "留言失敗");

      // 拉新一次取代暫時項
      const refresh = await fetch(apiBase);
      setComments((await refresh.json()).comments ?? []);
    } catch (e: any) {
      // 回滾：移除暫時項
      const dropTemp = (c: BlogComment): BlogComment => ({
        ...c,
        replies: c.replies?.filter((r) => r.id !== tempId).map(dropTemp),
      });
      setComments((list) => list.filter((c) => c.id !== tempId).map(dropTemp));
      toast.error("留言失敗：" + (e?.message || ""));
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: "刪除這則留言？",
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`${apiBase}?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      const refresh = await fetch(apiBase);
      setComments((await refresh.json()).comments ?? []);
      toast.success("已刪除留言");
    } else {
      toast.error("刪除失敗");
    }
  };

  return (
    <section className="mt-10 pt-8 border-t border-[var(--color-border)]">
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <MessageSquare size={20} /> 留言 {totalCount > 0 && `(${totalCount})`}
      </h2>

      {/* 發表留言 */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
        {!currentUserId && (
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="你的名字（選填）"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm mb-2 outline-none focus:border-[var(--color-accent)]"
          />
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="留個言吧..."
          rows={3}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)] resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => submit(input, null)}
            disabled={!input.trim() || sending}
            className="px-4 py-1.5 rounded-lg bg-[var(--color-accent)] text-black text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
          >
            <Send size={14} /> 送出
          </button>
        </div>
      </div>

      {/* 留言列表 */}
      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-[var(--color-bg-card)] animate-pulse" />)}</div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--color-fg-muted)] text-center py-6">還沒有留言、當第一個吧</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id}>
              <CommentItem comment={c} currentUserId={currentUserId} onDelete={remove} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} />
              {/* 回覆框 */}
              {replyTo === c.id && (
                <div className="ml-8 mt-2 flex gap-2">
                  <input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="回覆..."
                    onKeyDown={(e) => { if (e.key === "Enter") submit(replyInput, c.id); }}
                    className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  />
                  <button
                    onClick={() => submit(replyInput, c.id)}
                    disabled={!replyInput.trim() || sending}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-black text-sm font-semibold disabled:opacity-40"
                  >
                    送出
                  </button>
                </div>
              )}
              {/* 巢狀回覆 */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-8 mt-2 space-y-2 border-l-2 border-[var(--color-border)] pl-3">
                  {c.replies.map((r) => (
                    <CommentItem key={r.id} comment={r} currentUserId={currentUserId} onDelete={remove} isReply />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  isReply,
}: {
  comment: BlogComment;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onReply?: () => void;
  isReply?: boolean;
}) {
  const isOwn = currentUserId && comment.user_id === currentUserId;
  return (
    <div className="rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3">
      <div className="flex items-start gap-2">
        {comment.author_avatar ? (
          <Image
            src={comment.author_avatar}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="w-7 h-7 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-xs flex-shrink-0">
            {comment.author_name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{comment.author_name}</span>
            <span className="text-[10px] text-[var(--color-fg-muted)]">
              {new Date(comment.created_at).toLocaleDateString("zh-TW")}
            </span>
          </div>
          <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            <LikeButton kind="blog" targetId={comment.id} />
            {!isReply && onReply && (
              <button onClick={onReply} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] flex items-center gap-0.5">
                <CornerDownRight size={11} /> 回覆
              </button>
            )}
            {isOwn && (
              <button onClick={() => onDelete(comment.id)} className="text-xs text-[var(--color-fg-muted)] hover:text-red-400 flex items-center gap-0.5">
                <Trash2 size={11} /> 刪除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
