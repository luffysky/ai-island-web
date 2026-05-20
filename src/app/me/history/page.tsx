import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import Link from "next/link";

export default async function HistoryPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(100);

  const { data: xpEvents } = await supabase
    .from("xp_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // 按日期分組
  const grouped: Record<string, any[]> = {};
  progress?.forEach((p: any) => {
    const date = new Date(p.completed_at).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(p);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📅 學習紀錄</h1>
      <p className="text-sm text-[var(--color-fg-muted)]">最近 100 筆完成的 lesson</p>

      {!progress || progress.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center text-[var(--color-fg-muted)]">
          <p>還沒有學習紀錄</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="text-sm font-bold text-[var(--color-fg-muted)] mb-2 sticky top-0 bg-[var(--color-bg)] py-1">
                {date}（完成 {items.length} 個）
              </div>
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
                {items.map((p) => {
                  const ch = chapters.find((c) => c.id === p.chapter_id);
                  const lesson = ch?.lessons.find((l) => l.id === p.lesson_id);
                  return (
                    <Link
                      key={p.id}
                      href={`/chapters/${p.chapter_id}` as any}
                      className="flex items-center justify-between p-3 hover:bg-[var(--color-bg-elevated)] text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[var(--color-accent)]">✓</span>
                        <span className="truncate">{lesson?.title ?? p.lesson_id}</span>
                      </div>
                      <div className="text-xs text-[var(--color-fg-muted)] flex-shrink-0">
                        +{p.xp_earned ?? 0} XP · {new Date(p.completed_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
