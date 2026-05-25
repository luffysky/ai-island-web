import { createSupabaseServer } from "@/lib/supabase";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Crown, Flame, Trophy, Sparkles, Award } from "lucide-react";

export const metadata: Metadata = {
  title: "全島排行榜 — 每天 00:00 更新 | AI 島",
  description: "看誰連勝最久、誰 XP 最高、誰 z-coin 最多。每天 00:00 更新、努力者上榜。",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    title: "全島排行榜 | AI 島",
    description: "每天 00:00 更新、看誰學最多、誰連勝最久。",
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
};

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("leaderboard").select("*");
  const list = (data ?? []) as LbUser[];
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
          <p className="text-sm text-fg-muted">每天 <code className="bg-bg-card px-1.5 py-0.5 rounded">00:00</code> 更新 · 努力者上榜</p>
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1"><Award size={11} className="text-yellow-400" /> {list.length} 位玩家</span>
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
              <section className="flex items-end justify-center gap-2 md:gap-4 flex-wrap">
                {/* 第 2 名 */}
                {top3[1] && <PodiumCard user={top3[1]} rank={2} />}
                {/* 第 1 名 */}
                {top3[0] && <PodiumCard user={top3[0]} rank={1} />}
                {/* 第 3 名 */}
                {top3[2] && <PodiumCard user={top3[2]} rank={3} />}
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
                        <div className="text-[10px] text-fg-muted">{u.xp.toLocaleString()} XP</div>
                      </div>
                      <div className="text-right text-sm flex items-center gap-1 text-orange-400">
                        <Flame size={12} />
                        <span className="font-bold">{u.streak_days}</span>
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
            <li>主要按 <b className="text-fg">XP</b> 排序、相同 XP 看連續簽到</li>
            <li>連續中斷會在隔天 03:00 重設</li>
            <li>排行榜每天 00:00 自動更新</li>
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
              <div className="text-xs font-bold truncate">你目前排第 {myRank.rank}</div>
              <div className="text-[10px] text-fg-muted">Lv {myRank.user.level} · {myRank.user.xp.toLocaleString()} XP</div>
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

function PodiumCard({ user, rank }: { user: LbUser; rank: 1 | 2 | 3 }) {
  const config = {
    1: {
      height: "h-44 md:h-52",
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
      height: "h-36 md:h-44",
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
      height: "h-32 md:h-40",
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
          <div className={`text-xs font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
            Lv {user.level}
          </div>
          <div className="text-[10px] text-fg-muted font-mono">{user.xp.toLocaleString()} XP</div>
          <div className="text-[10px] text-orange-400 inline-flex items-center gap-0.5 mt-0.5">
            <Flame size={9} />{user.streak_days}
          </div>
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
