import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";

export default async function AdminAnalyticsPage() {
  const supabase = createSupabaseAdmin();

  // 各章節完成度
  const { data: chapterStats } = await supabase
    .from("lesson_progress")
    .select("chapter_id");

  const byChapter: Record<number, number> = {};
  chapterStats?.forEach((r: any) => {
    byChapter[r.chapter_id] = (byChapter[r.chapter_id] ?? 0) + 1;
  });

  // 各成就解鎖數
  const { data: achStats } = await supabase
    .from("user_achievements")
    .select("achievement_id, achievements(name, icon, rarity)");

  const byAch: Record<string, { count: number; name: string; icon: string; rarity: string }> = {};
  achStats?.forEach((r: any) => {
    const aid = r.achievement_id;
    if (!byAch[aid]) byAch[aid] = { count: 0, name: r.achievements.name, icon: r.achievements.icon, rarity: r.achievements.rarity };
    byAch[aid].count++;
  });

  const sortedChapters = Object.entries(byChapter).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sortedAch = Object.entries(byAch).sort((a, b) => b[1].count - a[1].count).slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHero
        emoji="📈"
        title="數據分析"
        desc="Top 10 熱門章節 / 成就解鎖排行、看用戶最愛玩什麼、定產品方向。"
        gradient="from-pink-500/10 via-purple-500/10 to-blue-500/10"
        borderColor="border-pink-500/30"
      />

      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-4">🔥 Top 10 最熱門章節（完成 lesson 數）</h3>
        <div className="space-y-2">
          {sortedChapters.map(([cid, count]) => (
            <div key={cid} className="flex items-center gap-3">
              <span className="w-16 text-sm">Ch {String(cid).padStart(2, "0")}</span>
              <div className="flex-1 h-6 bg-bg rounded overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${(count / (sortedChapters[0]?.[1] || 1)) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-sm font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-4">🏆 Top 10 最常解鎖的成就</h3>
        <div className="space-y-2">
          {sortedAch.map(([aid, info]) => (
            <div key={aid} className="flex items-center gap-3">
              <span className="text-2xl">{info.icon}</span>
              <span className="flex-1 text-sm">{info.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-bg-elevated">{info.rarity}</span>
              <span className="w-12 text-right font-bold">{info.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
