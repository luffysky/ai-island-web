import { createSupabaseServer } from "@/lib/supabase";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Crown, Flame, Trophy, Sparkles, Award } from "lucide-react";

export const metadata: Metadata = {
  title: "全島排行榜 — 即時更新 | AI 島",
  description: "看誰連勝最久、誰 XP 最高、誰 z-coin 最多。即時更新、努力者上榜。",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    title: "全島排行榜 | AI 島",
    description: "即時更新、看誰學最多、誰連勝最久。",
    type: "website",
  },
};

type LbUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  streak_days: number;
  z_coin?: number;
  lessons_done?: number;
};

type Board = "xp" | "streak" | "lessons";
const BOARDS: { id: Board; label: string; emoji: string; hint: string }[] = [
  { id: "xp", label: "XP", emoji: "🏆", hint: "累積經驗值最高" },
  { id: "streak", label: "連勝", emoji: "🔥", hint: "連續學習天數最長" },
  { id: "lessons", label: "完課", emoji: "📚", hint: "完成最多小節" },
];

/** 依榜別取該使用者的主要數值 + 顯示。 */
function metricOf(u: LbUser, board: Board): { value: number; text: string } {
  if (board === "streak") return { value: u.streak_days ?? 0, text: `${u.streak_days ?? 0} 天連勝` };
  if (board === "lessons") return { value: u.lessons_done ?? 0, text: `${u.lessons_done ?? 0} 課完成` };
  return { value: u.xp ?? 0, text: `${(u.xp ?? 0).toLocaleString()} XP` };
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const board: Board = tab === "streak" ? "streak" : tab === "lessons" ? "lessons" : "xp";
  const supabase = await createSupabaseServer();

  let list: LbUser[] = [];
  if (board === "lessons") {
    const { data } = await supabase.rpc("leaderboard_lessons", { p_limit: 100 });
    list = (data ?? []) as LbUser[];
  } else if (board === "streak") {
    const { data } = await supabase.from("profiles")
      .select("id, username, display_name, avatar_url, level, xp, streak_days")
      .gt("streak_days", 0).order("streak_days", { ascending: false }).order("xp", { ascending: false }).limit(100);
    list = (data ?? []) as LbUser[];
  } else {
    const { data } = await supabase.from("leaderboard").select("*");
    list = (data ?? []) as LbUser[];
  }
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  const { data: { user } } = await supabase.auth.getUser();
  let myRank: { rank: number; user: LbUser } | null = null;
  if (user) {
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx >= 0) myRank = { rank: idx + 1, user: list[idx] };
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-500/5 via-bg to-bg pb-20">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-transparent" />
        <div className="absolute top-4 left-1/4 animate-pulse">
          <Sparkles size={20} className="text-yellow-400 opacity-50" />
        </div>
        <div className="absolute top-12 right-1/3 animate-pulse delay-300">
          <Sparkles size={14} className="text-amber-400 opacity-40" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 shadow-2xl shadow-yellow-500/30 mb-3 ring-4 ring-yellow-500/20">
            <Trophy size={40} className="text-white drop-shadow-lg" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">
            全島排行榜
          </h1>
          <p className="text-sm text-fg-muted">即時更新 · {BOARDS.find((b) => b.id === board)?.hint}</p>
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1"><Award size={11} className="text-yellow-400" /> {list.length} 位玩家</span>
          </div>
          {/* 榜別切換 */}
          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
            {BOARDS.map((b) => (
              <Link key={b.id} href={b.id === "xp" ? "/leaderboard" : `/leaderboard?tab=${b.id}`} scroll={false}
                className={`px-4 py-1.5 rounded-full text-sm font-bold border transition ${board === b.id ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-lg shadow-yellow-500/20" : "bg-bg-card/60 border-border text-fg-muted hover:border-yellow-400/50 hover:text-fg"}`}>
                {b.emoji} {b.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-8">
        {list.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
            <div className="text-6xl mb-3">🏝️</div>
            <p className="text-fg-muted">還沒有人上榜、你可以成為第一個！</p>
            <Link href="/chapters" className="inline-block mt-4 px-5 py-2 rounded-full bg-accent text-black font-bold text-sm">
              開始學習
            </Link>
          </div>
        ) : (
          <>
            {/* 🥇🥈🥉 Podium */}
            {top3.length > 0 && (
              <section className="flex items-end justify-center gap-2 md:gap-4 flex-wrap pb-6">
                {/* 第 2 名 */}
                {top3[1] && <PodiumCard user={top3[1]} rank={2} board={board} />}
                {/* 第 1 名 */}
                {top3[0] && <PodiumCard user={top3[0]} rank={1} board={board} />}
                {/* 第 3 名 */}
                {top3[2] && <PodiumCard user={top3[2]} rank={3} board={board} />}
              </section>
            )}

            {/* 4-100 名 */}
            {rest.length > 0 && (
              <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                {rest.map((u, i) => {
                  const rank = i + 4;
                  const isMe = user?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 p-3.5 transition hover:bg-bg-elevated/50 ${i < rest.length - 1 ? "border-b border-border" : ""} ${isMe ? "bg-accent/5 ring-1 ring-accent/30" : ""}`}
                    >
                      <div className="w-9 text-center">
                        <span className={`font-mono font-bold text-sm ${rank <= 10 ? "text-fg" : "text-fg-muted"}`}>
                          #{rank}
                        </span>
                      </div>
                      <Avatar user={u} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate flex items-center gap-1">
                          {u.display_name || u.username}
                          {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-black font-bold">你</span>}
                        </div>
                        <div className="text-[10px] text-fg-muted truncate">@{u.username}</div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-accent">Lv {u.level}</div>
                        <div className="text-[10px] text-fg-muted">{(u.xp ?? 0).toLocaleString()} XP</div>
                      </div>
                      <div className="text-right min-w-[58px]">
                        <div className="text-sm font-bold text-fg inline-flex items-center gap-1 justify-end">
                          {board === "streak" && <Flame size={12} className="text-orange-400" />}
                          {metricOf(u, board).value.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-fg-muted">{BOARDS.find((b) => b.id === board)?.label}</div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}

        {/* Legend */}
        <div className="bg-bg-card/50 border border-border rounded-xl p-4 text-xs text-fg-muted">
          <div className="font-bold text-fg mb-1.5">📖 排名規則</div>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>🏆 <b className="text-fg">XP</b>：累積經驗值 · 🔥 <b className="text-fg">連勝</b>：連續學習天數 · 📚 <b className="text-fg">完課</b>：完成的小節數</li>
            <li>連續中斷會在隔天 03:00 重設</li>
            <li>三個榜都即時更新</li>
          </ul>
        </div>
      </main>

      {/* 我自己的 sticky bottom bar */}
      {myRank && myRank.rank > 3 && (
        <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-md w-[calc(100vw-2rem)]">
          <div className="bg-gradient-to-r from-accent/30 to-accent-2/30 backdrop-blur-md border border-accent/50 rounded-2xl p-3 shadow-2xl flex items-center gap-3">
            <div className="font-mono font-bold text-accent">#{myRank.rank}</div>
            <Avatar user={myRank.user} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{BOARDS.find((b) => b.id === board)?.emoji} 你在「{BOARDS.find((b) => b.id === board)?.label}」榜第 {myRank.rank}</div>
              <div className="text-[10px] text-fg-muted">{metricOf(myRank.user, board).text} · Lv {myRank.user.level}</div>
            </div>
            <Link href="/chapters" className="text-xs px-3 py-1.5 rounded-full bg-accent text-black font-bold">
              繼續學
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumCard({ user, rank, board }: { user: LbUser; rank: 1 | 2 | 3; board: Board }) {
  const config = {
    1: {
      height: "min-h-[11rem] md:min-h-[13rem]",
      gradient: "from-yellow-400 via-amber-400 to-orange-400",
      ring: "ring-yellow-400/50",
      shadow: "shadow-yellow-500/30",
      icon: <Crown size={28} className="text-yellow-400 drop-shadow-lg" />,
      label: "🥇",
      bg: "bg-gradient-to-b from-yellow-500/15 to-amber-500/5",
      order: "order-2",
      scale: "scale-110 md:scale-115",
    },
    2: {
      height: "min-h-[9rem] md:min-h-[11rem]",
      gradient: "from-slate-300 via-zinc-300 to-slate-400",
      ring: "ring-slate-300/40",
      shadow: "shadow-slate-400/20",
      icon: <Award size={24} className="text-slate-300" />,
      label: "🥈",
      bg: "bg-gradient-to-b from-slate-500/10 to-zinc-500/5",
      order: "order-1",
      scale: "",
    },
    3: {
      height: "min-h-[8rem] md:min-h-[10rem]",
      gradient: "from-orange-400 via-amber-700 to-orange-700",
      ring: "ring-orange-400/40",
      shadow: "shadow-orange-700/20",
      icon: <Award size={22} className="text-orange-400" />,
      label: "🥉",
      bg: "bg-gradient-to-b from-orange-500/10 to-amber-700/5",
      order: "order-3",
      scale: "",
    },
  }[rank];

  return (
    <div className={`${config.order} ${config.scale} transition-transform`}>
      <div className={`flex flex-col items-center ${config.height}`}>
        {/* avatar + crown */}
        <div className="relative mb-2">
          {rank === 1 && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce-slow">
              {config.icon}
            </div>
          )}
          <Avatar user={user} size={rank === 1 ? 80 : 64} bordered gradient={config.gradient} />
        </div>
        <div className="text-center">
          <div className="text-xl mb-0.5">{config.label}</div>
          <div className={`font-bold text-sm truncate max-w-32 ${rank === 1 ? "text-base" : ""}`}>
            {user.display_name || user.username}
          </div>
          <div className="text-[10px] text-fg-muted truncate">@{user.username}</div>
        </div>
        {/* 底座卡 */}
        <div className={`mt-2 px-3 py-2 rounded-xl border ring-1 ${config.ring} ${config.bg} text-center min-w-[110px] shadow-xl ${config.shadow}`}>
          <div className={`text-sm font-extrabold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
            {metricOf(user, board).text}
          </div>
          <div className="text-[10px] text-fg-muted font-mono mt-0.5">Lv {user.level}{board !== "xp" ? ` · ${(user.xp ?? 0).toLocaleString()} XP` : ""}</div>
          {board !== "streak" && (
            <div className="text-[10px] text-orange-400 inline-flex items-center gap-0.5 mt-0.5">
              <Flame size={9} />{user.streak_days}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function Avatar({ user, size, bordered, gradient }: { user: LbUser; size: number; bordered?: boolean; gradient?: string }) {
  const ringClass = bordered ? `ring-2 ring-offset-2 ring-offset-bg ${gradient ? `ring-gradient-${gradient}` : "ring-border"}` : "";
  const initial = (user.display_name || user.username || "?")[0]?.toUpperCase() || "?";

  if (user.avatar_url) {
    return (
      <div className={`relative inline-flex ${bordered ? "p-0.5 rounded-full bg-gradient-to-br " + (gradient ?? "from-accent to-accent-2") : ""}`} style={{ width: bordered ? size + 8 : size, height: bordered ? size + 8 : size }}>
        <Image
          src={user.avatar_url}
          alt={user.username}
          width={size}
          height={size}
          unoptimized
          className="rounded-full object-cover w-full h-full bg-bg-card"
        />
      </div>
    );
  }
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-bold text-black bg-gradient-to-br ${gradient ?? "from-accent to-accent-2"} ${ringClass}`}
      style={{ width: size, height: size, fontSize: size / 2.2 }}
    >
      {initial}
    </div>
  );
}
