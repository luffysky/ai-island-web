"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Gift, Sparkles, BookOpen, Bot, TerminalSquare, Trophy, RefreshCw, ArrowRight } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { Sparkles as SparklesParticles } from "@/components/ui/Sparkles";
import { SITE_STATS } from "@/lib/site-stats";

const CH = SITE_STATS.chapterCount;
const LESSONS = SITE_STATS.lessonCount;

const INCLUDED: { icon: typeof BookOpen; title: string; desc: string }[] = [
  { icon: BookOpen, title: `全 ${CH} 章 · ${LESSONS}+ lesson`, desc: "從零基礎到全端 + AI，完整教材全部開放。" },
  { icon: Bot, title: "無限 AI 對話導師", desc: "綠寶 / 肥仔 / 菇寶 讀過整本 AI 島，卡關直接問。" },
  { icon: TerminalSquare, title: "程式碼 Playground", desc: "Python / JS / 多語言即時執行，邊看邊動手。" },
  { icon: Trophy, title: "每日任務 · 連勝 · 排行榜", desc: "簽到、做任務、升等、跟全島一起衝。" },
  { icon: RefreshCw, title: "每月持續更新", desc: "新章節、新內容持續補上，一樣不收費。" },
];

const FAQ: { q: string; a: string }[] = [
  { q: "要付費嗎？", a: "完全免費。全部章節、lesson、AI 導師、Playground，一毛都不用付，也沒有隱藏訂閱或單章購買。" },
  { q: "需要註冊嗎？", a: "大部分內容可以直接看。註冊後才能存學習進度、做筆記、跟 AI 導師對話、上排行榜——註冊一樣免費。" },
  { q: "AI 對話有次數限制嗎？", a: "日常學習不設每日上限。系統仍保有整體用量保護以避免濫用，正常使用不會碰到。" },
  { q: "內容會持續更新嗎？", a: "會。章節與 lesson 每月持續補充、修訂；已經上線的內容不會之後又改成收費。" },
  { q: "為什麼免費？", a: "站長希望更多人能無門檻學程式與 AI。你學得開心、願意分享給朋友，就是最好的回饋。" },
];

export function PricingClient() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景 */}
      <BackgroundBeams className="opacity-40" />
      <SparklesParticles count={14} colors={["#fde047", "#a855f7", "#06b6d4"]} />
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-32 left-1/4 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 shadow-2xl shadow-emerald-500/40 mb-4 ring-4 ring-emerald-500/20"
          >
            <Gift size={42} className="text-white drop-shadow-lg" />
          </motion.div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <Sparkles size={12} /> 不販售 · 不訂閱 · 沒有付費牆
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-3 tracking-tight">
            全部課程
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent ml-2">
              100% 免費
            </span>
          </h1>
          <p className="text-base sm:text-lg text-fg-muted max-w-2xl mx-auto leading-relaxed">
            全 {CH} 章、{LESSONS}+ lesson、AI 導師、Playground——全部開放，直接學。
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/chapters"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition"
            >
              開始學習 <ArrowRight size={16} />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold border-2 border-border bg-bg/50 hover:border-accent/50 hover:bg-accent/5 transition"
            >
              免費註冊
            </Link>
          </div>
        </motion.header>

        {/* 免費包含什麼 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent backdrop-blur p-6 sm:p-8"
        >
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <Check size={18} className="text-emerald-500 dark:text-emerald-400" />
            免費包含全部這些
          </h2>
          <ul className="grid sm:grid-cols-2 gap-4">
            {INCLUDED.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shrink-0">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{item.title}</div>
                    <div className="text-xs text-fg-muted leading-relaxed">{item.desc}</div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 rounded-2xl bg-bg-card/80 backdrop-blur border border-border p-6"
        >
          <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
            <span>❓</span> 常見問題
          </h3>
          <div className="space-y-1 text-sm">
            {FAQ.map((item) => (
              <details key={item.q} className="border-b border-border last:border-0 py-3 group">
                <summary className="font-semibold cursor-pointer flex items-center justify-between hover:text-accent transition">
                  <span>{item.q}</span>
                  <span className="text-fg-muted group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-2 text-fg-muted leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </motion.div>

        <p className="text-[11px] text-fg-muted text-center mt-8 max-w-md mx-auto leading-relaxed">
          有問題或想回饋？到{" "}
          <Link href="/me/support" className="text-accent hover:underline">/me/support</Link>{" "}
          留言，站長會看。
        </p>
      </div>
    </div>
  );
}
