"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { ThumbsUp } from "lucide-react";

/**
 * 留言 / 回覆 按讚按鈕（部落格留言 + 討論區回覆共用）
 * kind: "blog" → 打 /api/blog/comment-like、"forum" → /api/forum/reply-like
 */
export function LikeButton({
  kind,
  targetId,
}: {
  kind: "blog" | "forum";
  targetId: string;
}) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const table = kind === "blog" ? "blog_comment_likes" : "forum_reply_likes";
  const col = kind === "blog" ? "comment_id" : "reply_id";
  const api = kind === "blog" ? "/api/blog/comment-like" : "/api/forum/reply-like";

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();

      // 數量
      const { count: c } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq(col, targetId);
      setCount(c ?? 0);

      // 我按過嗎
      if (user) {
        const { data: mine } = await supabase
          .from(table)
          .select("id")
          .eq(col, targetId)
          .eq("user_id", user.id)
          .maybeSingle();
        setLiked(!!mine);
      }
      setLoading(false);
    })();
  }, [targetId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    // 樂觀更新
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setCount((c) => c + (optimisticLiked ? 1 : -1));

    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kind === "blog" ? { comment_id: targetId } : { reply_id: targetId }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      // 失敗回滾
      setLiked(!optimisticLiked);
      setCount((c) => c + (optimisticLiked ? -1 : 1));
      if (res.status === 401) alert("請先登入才能按讚");
      return;
    }
    // 用伺服器回的真實數字校正
    setLiked(json.liked);
    setCount(json.count);
  };

  if (loading) {
    return <span className="text-xs text-[var(--color-fg-muted)] opacity-50">⋯</span>;
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`text-xs flex items-center gap-0.5 transition ${
        liked
          ? "text-[var(--color-accent)] font-semibold"
          : "text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]"
      }`}
    >
      <ThumbsUp size={12} className={liked ? "fill-current" : ""} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
