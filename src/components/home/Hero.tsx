"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { Sparkles } from "@/components/ui/Sparkles";
import { NumberTicker } from "@/components/ui/NumberTicker";
import { Sparkles as SparkleIcon } from "lucide-react";

type HeroProps = {
  totalChapters: number;
  totalLessons: number;
  stageCount: number;
  islandEnabled?: boolean;
};

export function Hero({ totalChapters, totalLessons, stageCount, islandEnabled = true }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-bg via-bg/95 to-bg">
      {/* Aceternity 風格背景 */}
      <BackgroundBeams className="opacity-60" />
      <Sparkles count={18} />

      {/* 既有光暈 */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-3/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-2/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 relative">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* 左側：文案 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center md:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-bg-card/80 backdrop-blur border border-accent/30 mb-6 shadow-lg shadow-accent/5"
            >
              <SparkleIcon size={11} className="text-accent animate-pulse" />
              <span>2026 全新改版 · 跟 肥仔・菇寶・綠寶 一起冒險</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight">
              用最簡單的方式
              <br />
              學會
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-accent via-accent-2 to-accent-3 bg-clip-text text-transparent animate-gradient-x">
                  最難
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-accent/50 via-accent-2/50 to-accent-3/50 blur-sm" />
              </span>
              的
              <span className="bg-gradient-to-r from-accent-2 to-accent-3 bg-clip-text text-transparent">
                技術
              </span>
            </h1>

            <p className="text-lg text-fg-muted mb-3 leading-relaxed">
              <NumberTicker value={totalChapters} className="text-fg font-bold" /> 章 ×{" "}
              <NumberTicker value={totalLessons} suffix="+" className="text-fg font-bold" /> lesson · HTML 到 AI Agent 全端養成
              <br />
              像玩 RPG 一樣升級、打 boss、組隊、成為 AI 高玩
            </p>
            <p className="text-sm text-fg-muted mb-7 leading-relaxed">
              <strong className="text-fg">繁體中文程式自學平台</strong>：
              學 HTML / CSS / JavaScript / TypeScript / React / Vue / Next.js / Node.js / Python / AI Agent / Prompt Engineering、
              <strong className="text-fg">從零基礎到能接案 / 找全端工作</strong>。
            </p>

            {/* 雙模式入口 */}
            <div className={`grid grid-cols-1 ${islandEnabled ? "sm:grid-cols-2" : ""} gap-3`}>
              {islandEnabled && (
                <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }}>
                  <Link
                    href={"/island" as any}
                    className="group relative overflow-hidden rounded-2xl border-2 border-accent/40 p-5 bg-gradient-to-br from-accent/15 via-accent-2/8 to-accent-3/10 hover:border-accent transition-all backdrop-blur block"
                  >
                    <div className="absolute -top-4 -right-4 text-5xl opacity-30 group-hover:opacity-60 group-hover:scale-110 transition duration-500">🏝️</div>
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent-2/0 group-hover:from-accent/10 group-hover:to-accent-2/5 transition duration-500" />
                    <div className="relative">
                      <div className="text-2xl mb-1">🏝️ 島嶼模式</div>
                      <div className="font-bold text-lg mb-1">進入 AI 島</div>
                      <p className="text-xs text-fg-muted leading-relaxed">3D 沉浸式探索、有 AI 夥伴陪你闖關。</p>
                      <span className="text-[10px] text-accent mt-2 inline-block group-hover:translate-x-1 transition">v0 / coming soon →</span>
                    </div>
                  </Link>
                </motion.div>
              )}
              <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }}>
                <Link
                  href="/chapters"
                  className="group relative overflow-hidden rounded-2xl border-2 border-border p-5 bg-bg-card hover:border-accent transition-all backdrop-blur block"
                >
                  <div className="absolute -top-4 -right-4 text-5xl opacity-30 group-hover:opacity-60 group-hover:scale-110 transition duration-500">📋</div>
                  <div className="relative">
                    <div className="text-2xl mb-1">📋 經典模式</div>
                    <div className="font-bold text-lg mb-1">快速開始學習</div>
                    <p className="text-xs text-fg-muted leading-relaxed">清單式、直接看章節、高效率。</p>
                    <span className="text-[10px] text-accent mt-2 inline-block group-hover:translate-x-1 transition">推薦給想快速學的人 →</span>
                  </div>
                </Link>
              </motion.div>
            </div>

            {/* 統計 */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 text-center md:text-left"
            >
              {[
                { label: "章節 + 附錄", value: totalChapters, color: "text-accent" },
                { label: "完整 lesson", value: totalLessons, color: "text-accent-2", suffix: "+" },
                { label: "技術區域", value: stageCount, color: "text-accent-3" },
              ].map((s) => (
                <div key={s.label}>
                  <NumberTicker
                    value={s.value}
                    suffix={s.suffix ?? ""}
                    className={`text-3xl md:text-4xl font-extrabold ${s.color}`}
                  />
                  <div className="text-xs text-fg-muted mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* 右側：英雄地圖 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* glow */}
            <div className="absolute -inset-4 bg-gradient-to-br from-accent/20 via-accent-2/10 to-accent-3/20 rounded-3xl blur-2xl animate-pulse" style={{ animationDuration: "4s" }} />
            <Image
              src="/mascot/cover-hero.png"
              alt="AI 島 — 繁體中文程式自學平台、HTML / React / Next.js / AI Agent 全端養成、跟肥仔菇寶綠寶 AI 導師冒險"
              width={1200}
              height={800}
              priority
              sizes="(max-width: 768px) 100vw, 600px"
              className="relative w-full h-auto rounded-2xl shadow-2xl border border-border"
            />
            {/* 角色 label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2"
            >
              <span className="px-2.5 py-1 rounded-full text-xs bg-bg-card/95 backdrop-blur border border-orange-400/40 text-orange-400 shadow-lg shadow-orange-500/10">
                ⚔️ 肥仔
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-bg-card/95 backdrop-blur border border-purple-400/40 text-purple-400 shadow-lg shadow-purple-500/10">
                📐 菇寶
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-bg-card/95 backdrop-blur border border-green-400/40 text-green-400 shadow-lg shadow-green-500/10">
                ✨ 綠寶
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-size: 200% 200%; background-position: left center; }
          50% { background-size: 200% 200%; background-position: right center; }
        }
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradient-x 4s ease infinite;
        }
      `}</style>
    </section>
  );
}
