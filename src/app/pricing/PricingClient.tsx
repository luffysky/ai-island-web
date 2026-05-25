"use client";

import { motion } from "framer-motion";
import { Check, Crown, Sparkles, TrendingUp } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { Sparkles as SparklesParticles } from "@/components/ui/Sparkles";
import { SITE_STATS } from "@/lib/site-stats";

type Plan = {
  id: string;
  name: string;
  price: number;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlight: boolean;
  badge?: string;
  icon: string;
};

export function PricingClient({ plans }: { plans: Plan[] }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景 */}
      <BackgroundBeams className="opacity-40" />
      <SparklesParticles count={14} colors={["#fde047", "#a855f7", "#06b6d4"]} />
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-32 left-1/4 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16">
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
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 shadow-2xl shadow-yellow-500/40 mb-4 ring-4 ring-yellow-500/20"
          >
            <Crown size={42} className="text-white drop-shadow-lg" />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-3 tracking-tight">
            升級解鎖
            <span className="bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 bg-clip-text text-transparent ml-2">
              完整 AI 島
            </span>
          </h1>
          <p className="text-base sm:text-lg text-fg-muted max-w-2xl mx-auto leading-relaxed">
            前 5 章永遠免費。要學完整全端 + AI 課程？選一個你想要的方式。
          </p>

          {/* 社會證明 */}
          <div className="mt-6 inline-flex items-center gap-4 text-xs text-fg-muted flex-wrap justify-center">
            <span className="inline-flex items-center gap-1">
              <Sparkles size={12} className="text-yellow-400" /> {SITE_STATS.chapterCount} 章 {SITE_STATS.lessonCount}+ lesson
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp size={12} className="text-emerald-400" /> 每月更新新內容
            </span>
            <span className="inline-flex items-center gap-1">
              ✨ AI 導師 24h
            </span>
          </div>
        </motion.header>

        {/* 方案卡 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p, idx) => (
            <motion.div
              key={p.id}
              id={p.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * (idx + 1), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`relative rounded-2xl p-6 border-2 backdrop-blur transition-shadow ${
                p.highlight
                  ? "border-accent bg-gradient-to-br from-accent/15 via-accent-2/8 to-transparent shadow-2xl shadow-accent/20 md:scale-105"
                  : "border-border bg-bg-card/80 hover:border-accent/40 hover:shadow-xl"
              }`}
            >
              {p.badge && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + idx * 0.15, type: "spring", stiffness: 300 }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-[10px] font-bold whitespace-nowrap shadow-lg shadow-yellow-500/30"
                >
                  {p.badge}
                </motion.div>
              )}

              {/* icon */}
              <div className="text-4xl mb-2">{p.icon}</div>
              <h2 className="text-xl font-bold">{p.name}</h2>
              <p className="text-xs text-fg-muted mb-4">{p.desc}</p>

              {/* 價格 */}
              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-fg-muted">NT$</span>
                  <span className={`text-5xl font-extrabold ${p.highlight ? "bg-gradient-to-r from-accent via-accent-2 to-accent-3 bg-clip-text text-transparent" : "text-fg"}`}>
                    {p.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-fg-muted">{p.period}</span>
                </div>
              </div>

              {/* features */}
              <ul className="space-y-2.5 mb-6">
                {p.features.map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 + i * 0.05 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${p.highlight ? "bg-accent/20" : "bg-emerald-500/15"}`}>
                      <Check size={11} className={p.highlight ? "text-accent" : "text-emerald-400"} />
                    </div>
                    <span>{f}</span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA */}
              <button
                disabled
                className={`w-full px-4 py-3 rounded-xl font-bold transition ${
                  p.highlight
                    ? "bg-gradient-to-r from-accent via-accent-2 to-accent-3 text-black shadow-lg shadow-accent/30"
                    : "border-2 border-border bg-bg/50 hover:border-accent/50"
                } opacity-70 cursor-not-allowed`}
                title="金流整合中、敬請期待"
              >
                {p.cta}（即將開放）
              </button>
            </motion.div>
          ))}
        </div>

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
            {[
              { q: "可以先試試嗎？", a: "前 5 章永久免費、足以體驗整套架構。覺得喜歡再升級。" },
              { q: "月訂閱可以隨時取消嗎？", a: "可以、取消後當期到期才停。已付的不退款（但會看完整月）。" },
              { q: "AI 對話無限制是真的無限嗎？", a: "是、不扣每日 10 次的免費額度。但仍受系統月預算保護（避免 abuse）。" },
              { q: "學員 / 企業優惠？", a: "企業方案請來信、學生憑學生證可享 8 折。" },
            ].map((item) => (
              <details key={item.q} className="border-b border-border last:border-0 py-3 group">
                <summary className="font-semibold cursor-pointer flex items-center justify-between hover:text-accent transition">
                  <span>{item.q}</span>
                  <span className="text-fg-muted group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-2 text-fg-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </motion.div>

        <p className="text-[11px] text-fg-muted text-center mt-8 max-w-md mx-auto leading-relaxed">
          💳 金流整合中（Stripe / TapPay）、即將開放購買。目前可在{" "}
          <a href="/me/support" className="text-accent hover:underline">/me/support</a>{" "}
          提工單表達興趣、會優先通知開放。
        </p>
      </div>
    </div>
  );
}
