"use client";

import { useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * 進入文章頁時、瀏覽數 +1
 * 用 sessionStorage 防止同一 session 重複計數
 */
export function BlogViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    const key = `blog_viewed_${articleId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    const supabase = createSupabaseBrowser();
    supabase.rpc("inc_blog_view", { p_article_id: articleId }).then(() => {});
  }, [articleId]);

  return null;
}
