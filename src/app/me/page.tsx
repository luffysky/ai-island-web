import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import { chapterDisplayNumber } from "@/lib/chapter-display";
import Link from "next/link";
import { CareerProgress } from "@/components/me/CareerProgress";
import { QuestsPanel } from "@/components/me/QuestsPanel";
import { StreakHeatmap } from "@/components/me/StreakHeatmap";
import { FriendsFeed } from "@/components/me/FriendsFeed";
import { LeetcodeCard } from "@/components/me/LeetcodeCard";
import { DailyCheckin } from "@/components/gamification/DailyCheckin";
import { SubscriptionRecommendCard } from "@/components/me/SubscriptionRecommendCard";
import { EloProgress } from "@/components/me/EloProgress";
import { RecommendedChapters } from "@/components/me/RecommendedChapters";
import { MeHero } from "@/components/me/MeHero";
import { formatTWDate } from "@/lib/format-date";
import { ELO_DEFAULT } from "@/lib/elo";

export default async function MeOverviewPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: progress },
    { count: notesCount },
    { count: bookmarksCount },
    { count: playgroundsCount },
    { data: recentLessons },
    { data: profileRow },
    { data: recentQuiz },
    { data: latestCheckin },
  ] = await Promise.all([
    supabase.from("lesson_progress").select("chapter_id, lesson_id").eq("user_id", user.id),
    supabase.from("notes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("bookmarks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("playgrounds").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("lesson_progress").select("*").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("elo_rating, username, display_name, avatar_url, level, xp").eq("id", user.id).maybeSingle(),
    supabase.from("daily_quiz_attempts").select("elo_delta, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("daily_checkins").select("streak_count, checkin_date").eq("user_id", user.id).order("checkin_date", { ascending: false }).limit(1).maybeSingle(),
  ] as any);

  const eloRating = (profileRow as any)?.elo_rating ?? ELO_DEFAULT;
  const pr = profileRow as any;
  // current streak: 最新 checkin 是今 / 昨天才算
  const latestCi = latestCheckin as any;
  let currentStreak = 0;
  if (latestCi?.checkin_date) {
    const dayDiff = Math.floor((Date.now() - new Date(latestCi.checkin_date).getTime()) / 86400_000);
    if (dayDiff <= 1) currentStreak = latestCi.streak_count ?? 0;
  }
  const recentDeltas = ((recentQuiz as any[]) ?? [])
    .filter((q) => typeof q.elo_delta === "number")
    .map((q) => ({ delta: Math.round(q.elo_delta), at: q.created_at }));

  const completedLessons = progress?.length ?? 0;
  const totalLessons = chapters.reduce((sum, c) => sum + c.lessons.length, 0);
  const pct = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
  const completedSet = new Set<string>((progress ?? []).map((p: any) => p.lesson_id as string));

  // 章節進度
  const chapterProgress = chapters.map((ch) => {
    const done = progress?.filter((p: any) => p.chapter_id === ch.id).length ?? 0;
    return { ...ch, done, total: ch.lessons.length, pct: Math.round(done / ch.lessons.length * 100) };
  });

  const inProgress = chapterProgress.filter((c) => c.done > 0 && c.done < c.total).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero Welcome */}
      <MeHero
        displayName={pr?.display_name ?? ""}
        username={pr?.username ?? "user"}
        avatarUrl={pr?.avatar_url}
        level={pr?.level ?? 1}
        xp={pr?.xp ?? 0}
        streak={currentStreak}
        completedLessons={completedLessons}
        totalLessons={totalLessons}
      />

      {/* 雪鑰個人化訂閱推薦（已訂閱 / 7 天內 dismiss 不顯示）*/}
      <SubscriptionRecommendCard />

      {/* 每日簽到 */}
      <DailyCheckin />

      {/* 解題段位 (ELO) */}
      <EloProgress rating={eloRating} recentDeltas={recentDeltas} />

      {/* 統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="完成 lesson" value={`${completedLessons} / ${totalLessons}`} color="text-accent" />
        <Stat label="總進度" value={`${pct}%`} color="text-yellow-400" />
        <Stat label="我的筆記" value={notesCount ?? 0} color="text-blue-400" />
        <Stat label="書籤" value={bookmarksCount ?? 0} color="text-pink-400" />
      </div>

      {/* 進度條 */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">📈 整體進度</h2>
          <span className="text-sm text-fg-muted">{completedLessons} / {totalLessons}</span>
        </div>
        <div className="h-3 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 學習熱力圖 */}
      <StreakHeatmap />

      {/* 今日任務 */}
      <QuestsPanel />

      {/* 解鎖工作力 */}
      <CareerProgress completedSet={completedSet} />

      {/* Leetcode 解題進度 */}
      <LeetcodeCard />

      {/* 全站動態 feed */}
      <FriendsFeed />

      {/* 為你推薦（演算法 #8）*/}
      <RecommendedChapters userId={user.id} />

      {/* 進行中的章節 */}
      {inProgress.length > 0 && (
        <div>
          <h2 className="font-bold mb-3">📚 繼續學習</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inProgress.map((ch) => (
              <Link
                key={ch.id}
                href={`/chapters/${ch.id}` as any}
                className="bg-bg-card border border-border hover:border-accent/50 rounded-xl p-4 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-fg-muted">Ch {chapterDisplayNumber(ch)}</div>
                    <h3 className="font-bold truncate">{ch.title}</h3>
                  </div>
                  <div className="text-2xl ml-2">{ch.pct}%</div>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${ch.pct}%` }} />
                </div>
                <div className="text-xs text-fg-muted mt-2">{ch.done} / {ch.total} lessons</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 最近完成 */}
      {recentLessons && recentLessons.length > 0 && (
        <div>
          <h2 className="font-bold mb-3">⏱️ 最近完成</h2>
          <div className="bg-bg-card border border-border rounded-xl divide-y divide-border">
            {recentLessons.map((p: any) => {
              const ch = chapters.find((c) => c.id === p.chapter_id);
              const lesson = ch?.lessons.find((l) => l.id === p.lesson_id);
              return (
                <Link
                  key={p.id}
                  href={`/chapters/${p.chapter_id}` as any}
                  className="flex items-center justify-between p-3 hover:bg-bg-elevated transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0">
                      ✓
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{lesson?.title ?? p.lesson_id}</div>
                      <div className="text-xs text-fg-muted">{ch?.title} · +{p.xp_earned ?? 0} XP</div>
                    </div>
                  </div>
                  <div className="text-xs text-fg-muted shrink-0">
                    {formatTWDate(p.completed_at)}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
