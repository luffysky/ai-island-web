"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { Sparkles } from "@/components/ui/Sparkles";
import { NumberTicker } from "@/components/ui/NumberTicker";
import { Sparkles as SparkleIcon, Palette, Palmtree, ClipboardList, Sword, Ruler } from "lucide-react";

type HeroProps = {
  totalChapters: number;
  totalLessons: number;
  stageCount: number;
  islandEnabled?: boolean;
  creatorIslandEnabled?: boolean;
};

export function Hero({ totalChapters, totalLessons, stageCount, islandEnabled = true, creatorIslandEnabled = false }: HeroProps) {
  const t = useTranslations("home");
  const modeCount = 1 + (islandEnabled ? 1 : 0) + (creatorIslandEnabled ? 1 : 0);
  const modeGrid = modeCount >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : modeCount === 2 ? "sm:grid-cols-2" : "";
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-bg via-bg/95 to-bg">
      {/* Aceternity 風格背景 */}
      <BackgroundBeams className="opacity-60" />
      <Sparkles count={18} />

      {/* 既有光暈 */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-3/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-accent-2/10 rounded-full blur-3xl" />
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
              <span>{t("heroBadge")}</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight">
              {t("heroTitlePart1")}
              <br />
              {t("heroTitleLearn")}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-accent via-accent-2 to-accent-3 bg-clip-text text-transparent animate-gradient-x">
                  {t("heroTitleHardest")}
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-accent/50 via-accent-2/50 to-accent-3/50 blur-sm" />
              </span>
              {t("heroTitleDe")}
              <span className="bg-gradient-to-r from-accent-2 to-accent-3 bg-clip-text text-transparent">
                {t("heroTitleTech")}
              </span>
            </h1>

            <p className="text-lg text-fg-muted mb-3 leading-relaxed">
              <NumberTicker value={totalChapters} className="text-fg font-bold" /> {t("heroTickerMid")}{" "}
              <NumberTicker value={totalLessons} suffix="+" className="text-fg font-bold" /> {t("heroTickerEnd")}
              <br />
              {t("heroSubline")}
            </p>
            <p className="text-sm text-fg-muted mb-7 leading-relaxed">
              <strong className="text-fg">{t("heroPlatformLabel")}</strong>{t("heroPlatformDesc")}
              <strong className="text-fg">{t("heroPlatformGoal")}</strong>{t("heroPlatformEnd")}
            </p>

            {/* 模式入口（經典 / 島嶼 / 創作者島嶼） */}
            <div className={`grid grid-cols-1 ${modeGrid} gap-3`}>
              {creatorIslandEnabled && (
                <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }}>
                  <Link
                    href={"/creator-island" as any}
                    className="group relative overflow-hidden rounded-2xl border-2 border-accent-3/40 p-5 bg-gradient-to-br from-accent-3/15 via-pink-500/8 to-violet-500/10 hover:border-accent-3 transition-all backdrop-blur block"
                  >
                    <Palette className="absolute -top-4 -right-4 text-accent-3 opacity-30 group-hover:opacity-60 group-hover:scale-110 transition duration-500" size={56} strokeWidth={1.5} />
                    <div className="relative">
                      <div className="text-lg font-semibold mb-1 inline-flex items-center gap-2"><Palette size={22} className="text-accent-3" /> {t("modeCreatorTag")}</div>
                      <div className="font-bold text-lg mb-1">{t("modeCreatorTitle")}</div>
                      <p className="text-xs text-fg-muted leading-relaxed">{t("modeCreatorDesc")}</p>
                      <span className="text-[10px] text-accent-3 mt-2 inline-block group-hover:translate-x-1 transition">{t("modeCreatorCta")}</span>
                    </div>
                  </Link>
                </motion.div>
              )}
              <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }}>
                <Link
                  href={"/quest" as any}
                  className="group relative overflow-hidden rounded-2xl border-2 border-emerald-400/40 p-5 bg-gradient-to-br from-emerald-500/15 via-teal-500/8 to-cyan-500/10 hover:border-emerald-400 transition-all backdrop-blur block glow-accent"
                >
                  <span className="absolute -top-3 -right-2 text-5xl opacity-25 group-hover:opacity-50 group-hover:scale-110 transition duration-500">🎮</span>
                  <div className="relative">
                    <div className="text-lg font-semibold mb-1 inline-flex items-center gap-2">🎮 {t("modeQuestTag")}</div>
                    <div className="font-bold text-lg mb-1">{t("modeQuestTitle")}</div>
                    <p className="text-xs text-fg-muted leading-relaxed">{t("modeQuestDesc")}</p>
                    <span className="text-[10px] text-emerald-500 mt-2 inline-block group-hover:translate-x-1 transition">{t("modeQuestCta")}</span>
                  </div>
                </Link>
              </motion.div>
              {islandEnabled && (
                <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }}>
                  <Link
                    href={"/island" as any}
                    className="group relative overflow-hidden rounded-2xl border-2 border-accent/40 p-5 bg-gradient-to-br from-accent/15 via-accent-2/8 to-accent-3/10 hover:border-accent transition-all backdrop-blur block"
                  >
                    <Palmtree className="absolute -top-4 -right-4 text-accent opacity-30 group-hover:opacity-60 group-hover:scale-110 transition duration-500" size={56} strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent-2/0 group-hover:from-accent/10 group-hover:to-accent-2/5 transition duration-500" />
                    <div className="relative">
                      <div className="text-lg font-semibold mb-1 inline-flex items-center gap-2"><Palmtree size={22} className="text-accent" /> {t("modeIslandTag")}</div>
                      <div className="font-bold text-lg mb-1">{t("modeIslandTitle")}</div>
                      <p className="text-xs text-fg-muted leading-relaxed">{t("modeIslandDesc")}</p>
                      <span className="text-[10px] text-accent mt-2 inline-block group-hover:translate-x-1 transition">{t("modeIslandCta")}</span>
                    </div>
                  </Link>
                </motion.div>
              )}
              <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }}>
                <Link
                  href="/chapters"
                  className="group relative overflow-hidden rounded-2xl border-2 border-border p-5 bg-bg-card hover:border-accent transition-all backdrop-blur block"
                >
                  <ClipboardList className="absolute -top-4 -right-4 text-accent opacity-30 group-hover:opacity-60 group-hover:scale-110 transition duration-500" size={56} strokeWidth={1.5} />
                  <div className="relative">
                    <div className="text-lg font-semibold mb-1 inline-flex items-center gap-2"><ClipboardList size={22} className="text-accent" /> {t("modeClassicTag")}</div>
                    <div className="font-bold text-lg mb-1">{t("modeClassicTitle")}</div>
                    <p className="text-xs text-fg-muted leading-relaxed">{t("modeClassicDesc")}</p>
                    <span className="text-[10px] text-accent mt-2 inline-block group-hover:translate-x-1 transition">{t("modeClassicCta")}</span>
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
                { label: t("statChapters"), value: totalChapters, color: "text-accent" },
                { label: t("statLessons"), value: totalLessons, color: "text-accent-2", suffix: "+" },
                { label: t("statStages"), value: stageCount, color: "text-accent-3" },
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
              alt={t("heroImageAlt")}
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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-bg-card/95 backdrop-blur border border-orange-400/40 text-orange-400 shadow-lg shadow-orange-500/10">
                <Sword size={12} /> {t("mascotFatzai")}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-bg-card/95 backdrop-blur border border-purple-400/40 text-purple-400 shadow-lg shadow-purple-500/10">
                <Ruler size={12} /> {t("mascotGubao")}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-bg-card/95 backdrop-blur border border-green-400/40 text-green-400 shadow-lg shadow-green-500/10">
                <SparkleIcon size={12} /> {t("mascotLvbao")}
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
