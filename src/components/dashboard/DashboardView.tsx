"use client";
import { xpForNextLevel, CAREER_PATHS } from "@/lib/types";
import { Flame, Coins, Heart, Trophy, Calendar, Award, TrendingUp } from "lucide-react";
import Link from "next/link";
import { DailyCheckin } from "@/components/gamification/DailyCheckin";

export function DashboardView({ profile, progress, achievements, quests }: any) {
  const xpInfo = xpForNextLevel(profile.xp ?? 0);
  const totalLessons = progress.length;
  const uniqueChapters = new Set(progress.map((p: any) => p.chapter_id)).size;
  const career = profile.career_path ? CAREER_PATHS[profile.career_path as keyof typeof CAREER_PATHS] : null;

  // 進度按 chapter 分組
  const byChapter: Record<number, number> = {};
  progress.forEach((p: any) => { byChapter[p.chapter_id] = (byChapter[p.chapter_id] ?? 0) + 1; });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Hero card */}
      <div className="bg-gradient-to-br from-bg-card to-bg-elevated border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-fg-muted">歡迎回來</div>
            <h1 className="text-3xl font-bold mb-1">
              {profile.display_name || profile.username}
            </h1>
            {career && <div className="text-sm text-accent">{career.emoji} {career.title}</div>}
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">Lv {profile.level}</div>
            <div className="text-xs text-fg-muted">{profile.xp} XP</div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-fg-muted mb-1">
            <span>距離 Lv {profile.level + 1}</span>
            <span>{xpInfo.current} / {xpInfo.needed} XP</span>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${xpInfo.progress * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Flame className="text-orange-400" />} label="連勝" value={profile.streak_days} unit="天" />
        <StatCard icon={<Coins className="text-yellow-400" />} label="Z-coin" value={profile.z_coin} />
        <StatCard icon={<Heart className="text-red-400" />} label="生命" value={`${profile.hearts}/5`} />
        <StatCard icon={<Trophy className="text-purple-400" />} label="成就" value={achievements.length} />
      </div>

      {/* 每日簽到 */}
      <div className="mb-6">
        <DailyCheckin />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily quests */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Calendar size={16} /> 今日任務</h2>
          {quests.length === 0 ? (
            <p className="text-sm text-fg-muted">今天還沒任務、完成 1 個 lesson 觸發每日任務</p>
          ) : (
            <div className="space-y-2">
              {quests.map((q: any) => (
                <div key={q.id} className="flex items-center justify-between text-sm">
                  <span>{q.quest_type === "lesson" ? "完成 lesson" : q.quest_type === "quiz" ? "答對 quiz" : q.quest_type}</span>
                  <span className={q.completed ? "text-accent" : "text-fg-muted"}>{q.progress}/{q.target}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2"><TrendingUp size={16} /> 學習統計</h2>
          <div className="space-y-2 text-sm">
            <Row label="完成 lesson" value={totalLessons} />
            <Row label="進入章節" value={`${uniqueChapters} / 60`} />
            <Row label="總 XP" value={profile.xp} />
            <Row label="加入時間" value={new Date(profile.created_at).toLocaleDateString("zh-TW")} />
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Award size={16} /> 最新成就</h2>
          {achievements.length === 0 ? (
            <p className="text-sm text-fg-muted">完成第一個 lesson 解鎖第一個成就</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {achievements.slice(0, 8).map((ua: any) => (
                <div key={ua.achievement_id} title={ua.achievements.name} className="aspect-square rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-2xl hover:scale-110 transition-transform cursor-help">
                  {ua.achievements.icon}
                </div>
              ))}
            </div>
          )}
          {achievements.length > 0 && (
            <Link href="/me/history" className="block mt-3 text-xs text-accent hover:underline">查看全部 →</Link>
          )}
        </div>
      </div>

      {/* Continue learning */}
      <div className="mt-6 bg-bg-card border border-border rounded-xl p-5">
        <h2 className="font-bold mb-3">📚 繼續學習</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(byChapter).slice(0, 6).map(([cid, count]) => (
            <Link key={cid} href={`/chapters/${cid}`} className="p-3 rounded-lg bg-bg-elevated border border-border hover:border-accent">
              <div className="text-xs text-fg-muted">Ch {String(cid).padStart(2, "0")}</div>
              <div className="text-sm font-semibold mt-1">{count} lessons 已完成</div>
            </Link>
          ))}
        </div>
        <Link href="/chapters" className="block mt-4 text-center text-sm text-accent hover:underline">瀏覽所有章節 →</Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: any; unit?: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-fg-muted mb-2">{icon} {label}</div>
      <div className="text-2xl font-bold">{value}{unit && <span className="text-sm text-fg-muted ml-1">{unit}</span>}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between">
      <span className="text-fg-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
