"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Flame, Trophy, Zap, BookOpen } from "lucide-react";
import { NumberTicker } from "@/components/ui/NumberTicker";
import { Sparkles as SparklesParticles } from "@/components/ui/Sparkles";

type MeHeroProps = {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  level: number;
  xp: number;
  xpToNext?: number;
  streak: number;
  completedLessons: number;
  totalLessons: number;
};

export function MeHero({
  displayName,
  username,
  avatarUrl,
  level,
  xp,
  xpToNext = 1000,
  streak,
  completedLessons,
  totalLessons,
}: MeHeroProps) {
  const pct = totalLessons > 0 ? Math.min(100, (completedLessons / totalLessons) * 100) : 0;
  const xpPct = xpToNext > 0 ? Math.min(100, ((xp % xpToNext) / xpToNext) * 100) : 0;
  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "夜深了" :
    hour < 11 ? "早安" :
    hour < 14 ? "中午好" :
    hour < 18 ? "下午好" :
    hour < 22 ? "晚上好" : "晚安";

  const initial = (displayName || username || "?")[0]?.toUpperCase() ?? "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent/10 via-accent-2/5 to-accent-3/10 p-5 md:p-6"
    >
      <SparklesParticles count={10} colors={["#50fa7b", "#fde047", "#a855f7"]} />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-accent-2/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative flex items-center gap-4 flex-wrap">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-2 rounded-full blur-xl opacity-50" />
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={72}
              height={72}
              unoptimized
              className="relative w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-4 ring-bg-card shadow-xl"
            />
          ) : (
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-3xl font-bold text-black ring-4 ring-bg-card shadow-xl">
              {initial}
            </div>
          )}
          {/* level badge */}
          <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-extrabold shadow-lg">
            Lv {level}
          </div>
        </motion.div>

        {/* Greeting */}
        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="text-xs text-fg-muted"
          >
            {greeting}、歡迎回來
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl md:text-3xl font-extrabold tracking-tight truncate"
          >
            {displayName || username}
            <span className="text-fg-muted text-base font-normal ml-2">@{username}</span>
          </motion.h1>
          {/* streak / completion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 mt-2 text-sm flex-wrap"
          >
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-orange-400">
                <Flame size={14} />
                <NumberTicker value={streak} className="font-bold" />
                <span className="text-xs">天連勝</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-accent">
              <BookOpen size={14} />
              <NumberTicker value={completedLessons} className="font-bold" />
              <span className="text-xs">/ {totalLessons} lesson</span>
            </span>
          </motion.div>
        </div>

        {/* 大數字 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
          className="text-right hidden sm:block"
        >
          <div className="text-[10px] text-fg-muted inline-flex items-center gap-1 justify-end">
            <Zap size={11} className="text-yellow-400" /> 累計 XP
          </div>
          <NumberTicker value={xp} className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-accent to-accent-2 bg-clip-text text-transparent" />
        </motion.div>
      </div>

      {/* XP progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative mt-4"
      >
        <div className="flex items-center justify-between text-[10px] text-fg-muted mb-1">
          <span className="inline-flex items-center gap-1">
            <Trophy size={10} /> 進度到 Lv {level + 1}
          </span>
          <span>{xp % xpToNext} / {xpToNext} XP</span>
        </div>
        <div className="h-2 bg-bg rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-accent via-yellow-400 to-accent-2 relative"
          >
            <div className="absolute inset-0 bg-white/30 animate-pulse" />
          </motion.div>
        </div>
      </motion.div>

      {/* 整體完成度 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-3"
      >
        <div className="flex items-center justify-between text-[10px] text-fg-muted mb-1">
          <span>整體完成度</span>
          <span>{pct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
