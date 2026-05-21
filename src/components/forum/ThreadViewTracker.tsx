"use client";

import { useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export function ThreadViewTracker({ threadId }: { threadId: string }) {
  useEffect(() => {
    const key = `forum_viewed_${threadId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const supabase = createSupabaseBrowser();
    supabase.rpc("inc_forum_view", { p_thread_id: threadId }).then(() => {});
  }, [threadId]);
  return null;
}
