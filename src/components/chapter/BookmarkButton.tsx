"use client";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export function BookmarkButton({
  lessonId,
  chapterId,
  lessonTitle,
  isLoggedIn,
}: {
  lessonId: string;
  chapterId: number;
  lessonTitle: string;
  isLoggedIn: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      setBookmarked(!!data);
    })();
  }, [lessonId]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }

    if (bookmarked) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
      setBookmarked(false);
    } else {
      await supabase.from("bookmarks").insert({
        user_id: user.id,
        chapter_id: chapterId,
        lesson_id: lessonId,
        lesson_title: lessonTitle,
      });
      setBookmarked(true);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="p-1.5 hover:bg-[var(--color-bg-elevated)] rounded transition disabled:opacity-30"
      title={bookmarked ? "取消書籤" : "加入書籤"}
    >
      {bookmarked
        ? <BookmarkCheck size={16} className="text-yellow-400 fill-yellow-400" />
        : <Bookmark size={16} className="text-[var(--color-fg-muted)]" />}
    </button>
  );
}
