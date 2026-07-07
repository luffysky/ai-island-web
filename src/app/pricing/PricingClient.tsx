"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Check, Gift, Sparkles, BookOpen, Bot, TerminalSquare, Trophy, RefreshCw, ArrowRight } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { Sparkles as SparklesParticles } from "@/components/ui/Sparkles";
import { SITE_STATS } from "@/lib/site-stats";

const CH = SITE_STATS.chapterCount;
const LESSONS = SITE_STATS.lessonCount;

export function PricingClient() {
  const t = useTranslations("store");

  const INCLUDED: { icon: typeof BookOpen; title: string; desc: string }[] = [
    { icon: BookOpen, title: t("incAllTitle", { ch: CH, lessons: LESSONS }), desc: t("incAllDesc") },
    { icon: Bot, title: t("incTutorTitle"), desc: t("incTutorDesc") },
    { icon: TerminalSquare, title: t("incPlaygroundTitle"), desc: t("incPlaygroundDesc") },
    { icon: Trophy, title: t("incQuestTitle"), desc: t("incQuestDesc") },
    { icon: RefreshCw, title: t("incUpdateTitle"), desc: t("incUpdateDesc") },
  ];

  const FAQ: { q: string; a: string }[] = [
    { q: t("faqPayQ"), a: t("faqPayA") },
    { q: t("faqSignupQ"), a: t("faqSignupA") },
    { q: t("faqLimitQ"), a: t("faqLimitA") },
    { q: t("faqUpdateQ"), a: t("faqUpdateA") },
    { q: t("faqWhyQ"), a: t("faqWhyA") },
  ];

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
            <Sparkles size={12} /> {t("heroBadge")}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-3 tracking-tight">
            {t("heroTitle")}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent ml-2">
              {t("heroTitleAccent")}
            </span>
          </h1>
          <p className="text-base sm:text-lg text-fg-muted max-w-2xl mx-auto leading-relaxed">
            {t("heroSubtitle", { ch: CH, lessons: LESSONS })}
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/chapters"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition"
            >
              {t("ctaStart")} <ArrowRight size={16} />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold border-2 border-border bg-bg/50 hover:border-accent/50 hover:bg-accent/5 transition"
            >
              {t("ctaSignup")}
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
            {t("includesTitle")}
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
            <span>❓</span> {t("faqTitle")}
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
          {t("footerBefore")}{" "}
          <Link href="/me/support" className="text-accent hover:underline">/me/support</Link>{" "}
          {t("footerAfter")}
        </p>
      </div>
    </div>
  );
}
