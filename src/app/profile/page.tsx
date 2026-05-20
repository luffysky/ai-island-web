import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Trophy, Flame, Coins, Heart, Award, BookOpen } from "lucide-react";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count: lessonCount }, { count: quizCount }, { data: achievements }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("quiz_attempts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("perfect", true),
    supabase.from("user_achievements").select("achievement_id, unlocked_at, achievements(*)").eq("user_id", user.id).limit(10),
  ]);

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <p>Profile 不存在、請重新登入或聯絡管理員</p>
        <Link href="/login" className="text-[var(--color-accent)] underline mt-4 block">回登入</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-6">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] flex items-center justify-center text-3xl font-bold text-black">
              {(profile.display_name || profile.username || "U")[0].toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-[var(--color-fg-muted)] text-sm">@{profile.username}</p>
            {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}

            <div className="flex items-center gap-3 mt-3">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] text-black text-sm font-bold">
                Lv {profile.level ?? 1}
              </span>
              {profile.career_path && (
                <span className="px-3 py-1 rounded-full bg-[var(--color-bg-elevated)] text-sm">
                  {profile.career_path}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 數據 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Trophy className="text-[var(--color-accent)]" />} label="XP" value={profile.xp ?? 0} />
        <StatCard icon={<Flame className="text-orange-400" />} label="連勝" value={`${profile.streak_days ?? 0} 天`} />
        <StatCard icon={<Coins className="text-yellow-400" />} label="Z-coin" value={profile.z_coin ?? 0} />
        <StatCard icon={<Heart className="text-red-400" />} label="生命" value={profile.hearts ?? 5} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={<BookOpen className="text-blue-400" />} label="完成 lessons" value={lessonCount ?? 0} />
        <StatCard icon={<Award className="text-purple-400" />} label="滿分 quiz" value={quizCount ?? 0} />
      </div>

      {/* 成就 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl p-6 mb-6">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Award size={18} /> 成就（{achievements?.length ?? 0}）
        </h2>
        {achievements && achievements.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {achievements.map((a: any) => (
              <div key={a.achievement_id} className="bg-[var(--color-bg-elevated)] rounded-lg p-3 text-sm">
                <div className="text-2xl mb-1">{a.achievements?.icon}</div>
                <div className="font-semibold">{a.achievements?.name}</div>
                <div className="text-xs text-[var(--color-fg-muted)]">{a.achievements?.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-fg-muted)]">還沒解鎖任何成就、開始學習吧！</p>
        )}
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link href="/settings" className="flex-1 text-center px-4 py-2 bg-[var(--color-bg-card)] rounded-lg hover:bg-[var(--color-border)] transition">
          編輯資料
        </Link>
        <Link href="/dashboard" className="flex-1 text-center px-4 py-2 bg-[var(--color-accent)] text-black rounded-lg font-semibold hover:bg-[var(--color-accent-2)] transition">
          學習園地 →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-xs text-[var(--color-fg-muted)]">{label}</div>
      <div className="font-bold text-lg">{value}</div>
    </div>
  );
}
