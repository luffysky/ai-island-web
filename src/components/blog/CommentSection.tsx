"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { MessageSquare, Send, Trash2, CornerDownRight } from "lucide-react";
import type { BlogComment } from "@/lib/blog-types";
import { LikeButton } from "./LikeButton";
import { useToast } from "@/components/ui/Toast";
import { handleEnterSubmit, autoGrow } from "@/lib/composer";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AnimatedEmojiPicker } from "@/components/ui/AnimatedEmojiPicker";
import { GifPicker } from "@/components/ui/GifPicker";
import { EmojiText } from "@/components/ui/EmojiText";
import { TranslateButton } from "@/components/ui/TranslateButton";

// 留言內文渲染：圖片/GIF 網址 → <img>；其餘網址 → 連結；純文字 → 動態 emoji
const IMG_URL_RE = /^https?:\/\/[^\s]+\.(gif|png|jpe?g|webp|svg)(\?[^\s]*)?$/i;
const GIPHY_URL_RE = /^https?:\/\/(media\d?\.giphy\.com|i\.giphy\.com)\/[^\s]+/i;
function renderCommentContent(text: string) {
  const out: React.ReactNode[] = [];
  let key = 0;
  text.split(/(https?:\/\/[^\s]+)/g).forEach((p) => {
    if (!p) return;
    if (IMG_URL_RE.test(p) || GIPHY_URL_RE.test(p)) {
      // eslint-disable-next-line @next/next/no-img-element
      out.push(<img key={key++} src={p} alt="gif" loading="lazy" className="block max-w-[200px] max-h-[200px] rounded-lg my-1" />);
    } else if (/^https?:\/\//.test(p)) {
      out.push(<a key={key++} href={p} target="_blank" rel="noreferrer" className="text-accent underline break-all">{p}</a>);
    } else {
      out.push(<EmojiText key={key++} text={p} size={18} />);
    }
  });
  return out;
}

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
    <section className="mt-10 pt-8 border-t border-border">
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <MessageSquare size={20} /> 留言 {totalCount > 0 && `(${totalCount})`}
      </h2>

      {/* 發表留言 */}
      <div className="mb-6 rounded-xl border border-border bg-bg-card p-3">
        {!currentUserId && (
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="你的名字（選填）"
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm mb-2 outline-none focus:border-accent"
          />
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="留個言吧...（可加表情、GIF）"
          rows={3}
          className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
        />
        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center gap-1">
            <AnimatedEmojiPicker onSelect={(e) => setInput((v) => v + e)} />
            <GifPicker onSelect={(url) => setInput((v) => (v ? v + " " : "") + url + " ")} />
          </div>
          <button
            onClick={() => submit(input, null)}
            disabled={!input.trim() || sending}
            className="px-4 py-1.5 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 flex items-center gap-1 shrink-0"
          >
            <Send size={14} /> 送出
          </button>
        </div>
      </div>

      {/* 留言列表 */}
      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-bg-card animate-pulse" />)}</div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-fg-muted text-center py-6">還沒有留言、當第一個吧</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id}>
              <CommentItem comment={c} currentUserId={currentUserId} onDelete={remove} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} />
              {/* 回覆框 */}
              {replyTo === c.id && (
                <div className="ml-8 mt-2">
                  <textarea
                    rows={1}
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onInput={(e) => autoGrow(e.currentTarget, 120)}
                    placeholder="回覆...（可加表情、GIF）"
                    onKeyDown={(e) => handleEnterSubmit(e, () => submit(replyInput, c.id))}
                    className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
                    style={{ maxHeight: "120px" }}
                  />
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <div className="flex items-center gap-1">
                      <AnimatedEmojiPicker onSelect={(e) => setReplyInput((v) => v + e)} />
                      <GifPicker onSelect={(url) => setReplyInput((v) => (v ? v + " " : "") + url + " ")} />
                    </div>
                    <button
                      onClick={() => submit(replyInput, c.id)}
                      disabled={!replyInput.trim() || sending}
                      className="px-3 py-1.5 rounded-lg bg-accent text-black text-sm font-semibold disabled:opacity-40 shrink-0"
                    >
                      送出
                    </button>
                  </div>
                </div>
              )}
              {/* 巢狀回覆 */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-8 mt-2 space-y-2 border-l-2 border-border pl-3">
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
    <div className="rounded-lg bg-bg-card border border-border p-3">
      <div className="flex items-start gap-2">
        {comment.author_avatar ? (
          <Image
            src={comment.author_avatar}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="w-7 h-7 rounded-full shrink-0 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center text-xs shrink-0">
            {comment.author_name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{comment.author_name}</span>
            <span className="text-[10px] text-fg-muted">
              {new Date(comment.created_at).toLocaleDateString("zh-TW")}
            </span>
          </div>
          <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{renderCommentContent(comment.content)}</p>
          <TranslateButton text={comment.content} />
          <div className="flex items-center gap-3 mt-1">
            <LikeButton kind="blog" targetId={comment.id} />
            {!isReply && onReply && (
              <button onClick={onReply} className="text-xs text-fg-muted hover:text-accent flex items-center gap-0.5">
                <CornerDownRight size={11} /> 回覆
              </button>
            )}
            {isOwn && (
              <button onClick={() => onDelete(comment.id)} className="text-xs text-fg-muted hover:text-red-400 flex items-center gap-0.5">
                <Trash2 size={11} /> 刪除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
