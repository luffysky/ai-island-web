import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Trophy, Flame, Coins, Heart, Award, BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// 個人頁需登入 + 讀使用者資料 → 一律動態、不在 build 時 prerender（避免建 Supabase client 拿不到 env 而炸）
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const t = await getTranslations("profile");
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
        <p>{t("notFoundProfile")}</p>
        <Link href="/login" className="text-accent underline mt-4 block">{t("backToLogin")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="bg-bg-card rounded-xl p-6 mb-6">
        <div className="flex items-center gap-6">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={96}
              height={96}
              unoptimized
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-3xl font-bold text-black">
              {(profile.display_name || profile.username || "U")[0].toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-fg-muted text-sm">@{profile.username}</p>
            {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}

            <div className="flex items-center gap-3 mt-3">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent to-accent-2 text-black text-sm font-bold">
                Lv {profile.level ?? 1}
              </span>
              {profile.career_path && (
                <span className="px-3 py-1 rounded-full bg-bg-elevated text-sm">
                  {profile.career_path}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 數據 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Trophy className="text-accent" />} label="XP" value={profile.xp ?? 0} />
        <StatCard icon={<Flame className="text-orange-400" />} label={t("statStreak")} value={t("streakDays", { n: profile.streak_days ?? 0 })} />
        <StatCard icon={<Coins className="text-yellow-400" />} label="Z-coin" value={profile.z_coin ?? 0} />
        <StatCard icon={<Heart className="text-red-400" />} label={t("statHearts")} value={profile.hearts ?? 5} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={<BookOpen className="text-blue-400" />} label={t("statLessons")} value={lessonCount ?? 0} />
        <StatCard icon={<Award className="text-purple-400" />} label={t("statQuiz")} value={quizCount ?? 0} />
      </div>

      {/* 成就 */}
      <div className="bg-bg-card rounded-xl p-6 mb-6">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Award size={18} /> {t("achievements", { n: achievements?.length ?? 0 })}
        </h2>
        {achievements && achievements.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {achievements.map((a: any) => (
              <div key={a.achievement_id} className="bg-bg-elevated rounded-lg p-3 text-sm">
                <div className="text-2xl mb-1">{a.achievements?.icon}</div>
                <div className="font-semibold">{a.achievements?.name}</div>
                <div className="text-xs text-fg-muted">{a.achievements?.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">{t("noAchievements")}</p>
        )}
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link href="/settings" className="flex-1 text-center px-4 py-2 bg-bg-card rounded-lg hover:bg-border transition">
          {t("editProfile")}
        </Link>
        <Link href="/dashboard" className="flex-1 text-center px-4 py-2 bg-accent text-black rounded-lg font-semibold hover:bg-accent-2 transition">
          {t("dashboard")}
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="bg-bg-card rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-xs text-fg-muted">{label}</div>
      <div className="font-bold text-lg">{value}</div>
    </div>
  );
}
