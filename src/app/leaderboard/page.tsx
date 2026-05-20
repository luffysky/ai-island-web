import { createSupabaseServer } from "@/lib/supabase";

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("leaderboard").select("*");
  const list = data ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="text-3xl font-bold mb-2">全島排行榜</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">每天 00:00 更新</p>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        {list.map((u: any, i: number) => (
          <div key={u.id} className={`flex items-center gap-4 p-4 ${i < list.length - 1 ? "border-b border-[var(--color-border)]" : ""} ${i < 3 ? "bg-gradient-to-r from-yellow-500/5 to-transparent" : ""}`}>
            <div className="w-10 text-center font-bold text-lg">
              {i === 0 && "🥇"}
              {i === 1 && "🥈"}
              {i === 2 && "🥉"}
              {i > 2 && <span className="text-[var(--color-fg-muted)]">#{i + 1}</span>}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{u.display_name || u.username}</div>
              <div className="text-xs text-[var(--color-fg-muted)]">@{u.username}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-[var(--color-accent)]">Lv {u.level}</div>
              <div className="text-xs text-[var(--color-fg-muted)]">{u.xp.toLocaleString()} XP</div>
            </div>
            <div className="text-right text-sm">
              <div className="flex items-center gap-1 text-orange-400">🔥 {u.streak_days}</div>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="p-8 text-center text-[var(--color-fg-muted)]">還沒有人上榜、你可以成為第一個！</div>}
      </div>
    </div>
  );
}
