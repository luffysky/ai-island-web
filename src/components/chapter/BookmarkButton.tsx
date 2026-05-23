"use client";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useToast } from "@/components/ui/Toast";

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
  const toast = useToast();
  const [bookmarked, setBookmarked] = useState(false);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }

    // optimistic：立刻切換、失敗回滾
    const prev = bookmarked;
    const next = !prev;
    setBookmarked(next);
    if (next && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pet:bookmark-added", { detail: { chapterId, lessonId } }),
      );
    }

    try {
      if (prev) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bookmarks").insert({
          user_id: user.id,
          chapter_id: chapterId,
          lesson_id: lessonId,
          lesson_title: lessonTitle,
        });
        if (error) throw error;
      }
      // 通知 SideNav 重抓
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sync:bookmarks"));
      }
    } catch (e: any) {
      setBookmarked(prev);
      toast.error(`書籤操作失敗：${e?.message || "請稍後再試"}`);
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-1.5 hover:bg-bg-elevated rounded transition active:scale-90"
      title={bookmarked ? "取消書籤" : "加入書籤"}
    >
      {bookmarked
        ? <BookmarkCheck size={16} className="text-yellow-400 fill-yellow-400" />
        : <Bookmark size={16} className="text-fg-muted" />}
    </button>
  );
}
