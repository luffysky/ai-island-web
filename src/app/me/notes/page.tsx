import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import Link from "next/link";

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
      <h1 className="text-2xl font-bold">📝 我的筆記</h1>
      <p className="text-sm text-[var(--color-fg-muted)]">共 {notes?.length ?? 0} 則筆記</p>

      {notes?.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center text-[var(--color-fg-muted)]">
          <div className="text-4xl mb-3">📭</div>
          <p>還沒有筆記</p>
          <p className="text-xs mt-1">在 lesson 頁面點 📝 圖示開始記筆記</p>
        </div>
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
                className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 rounded-xl p-4 transition"
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[var(--color-fg-muted)] mb-1">
                      {n.chapter_id ? `Ch ${String(n.chapter_id).padStart(2, "0")} · ${ch?.title ?? ""}` : "自由筆記"}
                    </div>
                    <div className="font-semibold truncate">{lesson?.title ?? n.lesson_id ?? "未綁定 lesson"}</div>
                  </div>
                  {n.is_public && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 flex-shrink-0">公開</span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-fg-muted)] whitespace-pre-wrap line-clamp-3">{n.content}</p>
                <div className="text-xs text-[var(--color-fg-muted)] mt-2">
                  {new Date(n.updated_at).toLocaleString('zh-TW')}
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
