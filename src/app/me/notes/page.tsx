import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import Link from "next/link";
import { NotesExportButton } from "./NotesExportButton";
import { formatTW } from "@/lib/format-date";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NotesPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">📝 我的筆記</h1>
          <p className="text-sm text-fg-muted">共 {notes?.length ?? 0} 則筆記</p>
        </div>
        {(notes?.length ?? 0) > 0 && <NotesExportButton />}
      </div>

      {notes?.length === 0 ? (
        <EmptyState
          emoji="📝"
          title="還沒有筆記"
          desc="在 lesson 頁面點 📝 圖示開始記筆記"
          action={{ label: "看章節", href: "/chapters" }}
        />
      ) : (
        <div className="space-y-3">
          {notes?.map((n: any) => {
            const ch = chapters.find((c) => c.id === n.chapter_id);
            const lesson = ch?.lessons.find((l) => l.id === n.lesson_id);
            const href = n.chapter_id ? `/chapters/${n.chapter_id}` : "/me/notes";
            return (
              <Link
                key={n.id}
                href={href as any}
                className="block bg-bg-card border border-border hover:border-accent/50 rounded-xl p-4 transition"
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-fg-muted mb-1">
                      {n.chapter_id ? `Ch ${String(n.chapter_id).padStart(2, "0")} · ${ch?.title ?? ""}` : "自由筆記"}
                    </div>
                    <div className="font-semibold truncate">{lesson?.title ?? n.lesson_id ?? "未綁定 lesson"}</div>
                  </div>
                  {n.is_public && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-900 dark:text-blue-200 shrink-0">公開</span>
                  )}
                </div>
                <p className="text-sm text-fg-muted whitespace-pre-wrap line-clamp-3">{n.content}</p>
                <div className="text-xs text-fg-muted mt-2">
                  {formatTW(n.updated_at)}
                  {n.likes > 0 && <span className="ml-2">👍 {n.likes}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
