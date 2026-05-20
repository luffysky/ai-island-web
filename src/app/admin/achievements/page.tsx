import { createSupabaseAdmin } from "@/lib/supabase-admin";

export default async function AchievementsAdminPage() {
  const supabase = createSupabaseAdmin();

  const { data: achievements } = await supabase
    .from("achievements")
    .select("*")
    .order("xp_reward", { ascending: false });

  // 統計每個成就有多少人解鎖
  const { data: unlocks } = await supabase
    .from("user_achievements")
    .select("achievement_id");

  const unlockCount: Record<string, number> = {};
  unlocks?.forEach((u: any) => {
    unlockCount[u.achievement_id] = (unlockCount[u.achievement_id] ?? 0) + 1;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">🏆 成就管理</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {achievements?.map((a: any) => (
          <div key={a.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{a.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{a.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-warning)]">
                    +{a.xp_reward} XP
                  </span>
                </div>
                <p className="text-sm text-[var(--color-fg-muted)] mt-1">{a.description}</p>
                <div className="text-xs text-[var(--color-fg-muted)] mt-2">
                  已解鎖：{unlockCount[a.id] ?? 0} 人
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
