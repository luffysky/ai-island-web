"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Swords, Sparkles as SparkleIcon } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { Sparkles as SparklesParticles } from "@/components/ui/Sparkles";

export function CoursesClient({ dungeons, chapterCount }: { dungeons: any[]; chapterCount: number }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundBeams className="opacity-40" />
      <SparklesParticles count={12} colors={["#ef4444", "#f97316", "#a855f7"]} />
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute top-32 left-1/4 w-96 h-96 bg-red-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-1/4 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 shadow-2xl shadow-orange-500/30 mb-4"
          >
            <Swords size={32} className="text-white" />
          </motion.div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-bg-card/80 backdrop-blur border border-orange-500/30 mb-4">
            <SparkleIcon size={11} className="text-orange-400 animate-pulse" />
            <span>實戰應用區</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            AI 任務副本
          </h1>
          <p className="text-fg-muted max-w-2xl mx-auto leading-relaxed">
            {chapterCount} 章主課程打底、5 大副本實戰。每個副本鎖定一個 AI 應用方向、
            打敗副本 boss、你就掌握了一項能變現的技能。
          </p>
        </motion.div>

        {/* 副本格 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dungeons.map((d, idx) => (
            <motion.div
              key={d.slug}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
            >
              <Link
                href={`/courses/${d.slug}`}
                className={`group block rounded-2xl border-2 ${d.border} p-6 transition-shadow hover:shadow-2xl flex flex-col h-full backdrop-blur bg-bg-card/80 relative overflow-hidden`}
              >
                {/* glow on hover */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${d.color} mix-blend-soft-light pointer-events-none`} style={{ opacity: 0 }} />
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-gradient-to-br ${d.color}`} />

                <div className="relative flex flex-col flex-1">
                  {/* Top */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${d.color} text-black shadow-lg group-hover:scale-110 transition-transform`}
                      >
                        {d.no}
                      </div>
                      <motion.span
                        className="text-3xl"
                        whileHover={{ rotate: 15, scale: 1.2 }}
                      >
                        {d.emoji}
                      </motion.span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-900 dark:text-red-200 font-bold inline-flex items-center gap-0.5 self-start mt-1">
                      ⚔️ BOSS 戰
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold mb-1 group-hover:translate-x-0.5 transition-transform">{d.name}</h2>
                  <div className="text-sm text-fg-muted mb-3">{d.subtitle}</div>
                  <p className="text-sm leading-relaxed mb-4 flex-1">{d.tagline}</p>

                  {/* Boss */}
                  <div className="border-t border-border pt-3 mb-3">
                    <div className="text-xs text-fg-muted mb-1">副本 BOSS</div>
                    <div className="font-semibold text-sm flex items-center gap-1">
                      👹 {d.boss.name}
                    </div>
                  </div>

                  {/* Tools preview */}
                  <div className="flex flex-wrap gap-1">
                    {d.tools.slice(0, 3).map((t: any) => (
                      <span
                        key={t.name}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-bg-elevated border border-border"
                      >
                        {t.name}
                      </span>
                    ))}
                    {d.tools.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 text-fg-muted">
                        +{d.tools.length - 3}
                      </span>
                    )}
                  </div>

                  <div
                    className="mt-4 text-sm font-bold flex items-center gap-1 group-hover:gap-3 transition-all"
                    style={{ color: d.accentHex }}
                  >
                    進入副本 <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* 底部說明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-14 p-6 rounded-2xl bg-bg-card/80 backdrop-blur border border-border text-center"
        >
          <h3 className="font-bold mb-2 text-lg">🗺️ 副本怎麼玩？</h3>
          <p className="text-sm text-fg-muted leading-relaxed max-w-2xl mx-auto">
            每個副本都有一隻 boss——代表你在這個領域最容易卡住的問題。
            副本內容教你打敗它的方法、推薦工具、以及對應的主課程章節。
            不用全部都打、選你最想要的能力開始。
          </p>
        </motion.div>
      </div>
    </div>
  );
}
