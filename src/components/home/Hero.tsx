"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { NumberTicker } from "@/components/ui/NumberTicker";
import {
  Sparkles as SparkleIcon,
  Palette,
  Palmtree,
  GraduationCap,
  Gamepad2,
  Compass,
  Bot,
  Sword,
  Ruler,
  ArrowRight,
} from "lucide-react";

type HeroProps = {
  totalChapters: number;
  totalLessons: number;
  stageCount: number;
  islandEnabled?: boolean;
  creatorIslandEnabled?: boolean;
};

/** 每個模式只取品牌調色盤中的一個色相，且僅用在「圖示晶片 + hover 邊框」上，
 *  卡片本體維持中性 surface —— 一致、乾淨、不彩虹。全部用 CSS token → 亮暗自動切。 */
type Tone = {
  text: string; // 圖示與 CTA 文字色
  chip: string; // 圖示晶片底
  hoverBorder: string; // hover 邊框色
};
const TONES: Record<string, Tone> = {
  green: { text: "text-accent", chip: "bg-accent/10", hoverBorder: "hover:border-accent" },
  cyan: { text: "text-accent-2", chip: "bg-accent-2/10", hoverBorder: "hover:border-accent-2" },
  purple: { text: "text-accent-3", chip: "bg-accent-3/10", hoverBorder: "hover:border-accent-3" },
  gold: { text: "text-warning", chip: "bg-warning/10", hoverBorder: "hover:border-warning" },
  pink: { text: "text-pink", chip: "bg-pink/10", hoverBorder: "hover:border-pink" },
};

export function Hero({ totalChapters, totalLessons, stageCount, islandEnabled = true, creatorIslandEnabled = false }: HeroProps) {
  const t = useTranslations("home");

  // 模式入口：中性卡 + 單色圖示晶片，順序＝學習優先、樂趣其後
  const modes: Array<{
    href: string;
    Icon: typeof GraduationCap;
    tone: Tone;
    tag: string;
    title: string;
    desc: string;
    cta: string;
    show: boolean;
  }> = [
    { href: "/chapters", Icon: GraduationCap, tone: TONES.green, tag: t("modeClassicTag"), title: t("modeClassicTitle"), desc: t("modeClassicDesc"), cta: t("modeClassicCta"), show: true },
    { href: "/quest", Icon: Gamepad2, tone: TONES.cyan, tag: t("modeQuestTag"), title: t("modeQuestTitle"), desc: t("modeQuestDesc"), cta: t("modeQuestCta"), show: true },
    { href: "/agent", Icon: Bot, tone: TONES.purple, tag: "分身島", title: "你的 AI 分身，替你動手", desc: "交代目標，分身一步步規劃、查資料、操作，還記得你、跨裝置延續。", cta: "開始使喚", show: true },
    { href: "/opportunities", Icon: Compass, tone: TONES.gold, tag: "機會島", title: "競賽 · 補助 · 創投雷達", desc: "找到適合你的機會、加入航線追蹤截止日，AI 幫你挑、還能模擬評審練膽。", cta: "探索機會", show: true },
    { href: "/creator-island", Icon: Palette, tone: TONES.pink, tag: t("modeCreatorTag"), title: t("modeCreatorTitle"), desc: t("modeCreatorDesc"), cta: t("modeCreatorCta"), show: creatorIslandEnabled },
    { href: "/island", Icon: Palmtree, tone: TONES.green, tag: t("modeIslandTag"), title: t("modeIslandTitle"), desc: t("modeIslandDesc"), cta: t("modeIslandCta"), show: islandEnabled },
  ];
  const visibleModes = modes.filter((m) => m.show);

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* 極淡背景光束（收斂 opacity，不搶內容）＋ 兩點柔光暈 */}
      <BackgroundBeams className="opacity-30" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute -bottom-32 -right-16 w-[32rem] h-[32rem] rounded-full bg-accent-3/10 blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-14 pb-12 md:pt-20 md:pb-16 relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* 左：文案 + CTA + 統計 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-bg-card/70 backdrop-blur border border-border text-fg-muted mb-6">
              <SparkleIcon size={12} className="text-accent" />
              {t("heroBadge")}
            </span>

            <h1 className="text-[2.5rem] leading-[1.08] md:text-6xl font-bold tracking-tight mb-5">
              {t("heroTitlePart1")}
              <br className="hidden sm:block" />
              {t("heroTitleLearn")}
              <span className="bg-gradient-to-r from-accent via-accent-2 to-accent-3 bg-clip-text text-transparent">
                {t("heroTitleHardest")}
              </span>
              {t("heroTitleDe")}
              {t("heroTitleTech")}
            </h1>

            <p className="text-base md:text-lg text-fg-muted leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
              <NumberTicker value={totalChapters} className="text-fg font-semibold" /> {t("heroTickerMid")}{" "}
              <NumberTicker value={totalLessons} suffix="+" className="text-fg font-semibold" /> {t("heroTickerEnd")}
              {t("heroSubline")}
            </p>

            {/* 主 / 次 CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-9">
              <Link
                href="/chapters"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-accent text-accent-contrast shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-8px_color-mix(in_srgb,var(--color-accent)_70%,transparent)] active:translate-y-0"
              >
                {t("modeClassicCta")}
                <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/agent"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border border-border bg-bg-card/60 backdrop-blur text-fg transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-3 hover:text-accent-3"
              >
                <Bot size={17} />
                認識你的 AI 分身
              </Link>
            </div>

            {/* 統計 */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              {[
                { label: t("statChapters"), value: totalChapters, color: "text-accent" },
                { label: t("statLessons"), value: totalLessons, color: "text-accent-2", suffix: "+" },
                { label: t("statStages"), value: stageCount, color: "text-accent-3" },
              ].map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <NumberTicker value={s.value} suffix={s.suffix ?? ""} className={`text-2xl md:text-3xl font-extrabold ${s.color}`} />
                  <div className="text-xs text-fg-muted mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 右：主視覺（乾淨玻璃框，柔光收斂） */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="absolute -inset-3 bg-gradient-to-br from-accent/15 via-accent-2/10 to-accent-3/15 rounded-[2rem] blur-2xl" />
            <div className="relative rounded-3xl overflow-hidden border border-border shadow-[var(--elev-4)] bg-bg-card">
              <Image
                src="/mascot/cover-hero.png"
                alt={t("heroImageAlt")}
                width={1200}
                height={800}
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
                className="w-full h-auto"
              />
            </div>
            {/* 角色標籤 */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2 whitespace-nowrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs surface-glass shadow-[var(--elev-2)] text-orange-400">
                <Sword size={12} /> {t("mascotFatzai")}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs surface-glass shadow-[var(--elev-2)] text-accent-3">
                <Ruler size={12} /> {t("mascotGubao")}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs surface-glass shadow-[var(--elev-2)] text-accent">
                <SparkleIcon size={12} /> {t("mascotLvbao")}
              </span>
            </div>
          </motion.div>
        </div>

        {/* 模式入口 — 一致化卡片網格 */}
        <div className="mt-16 md:mt-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleModes.map((m, i) => (
              <motion.div
                key={m.href}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={m.href as any}
                  className={`group flex items-start gap-4 h-full rounded-2xl border border-border bg-bg-card/70 backdrop-blur p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--elev-3)] ${m.tone.hoverBorder}`}
                >
                  <span className={`shrink-0 grid place-items-center w-12 h-12 rounded-xl ${m.tone.chip} ${m.tone.text} transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3`}>
                    <m.Icon size={24} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium ${m.tone.text}`}>{m.tag}</span>
                    </div>
                    <div className="font-semibold text-[15px] mb-1 leading-snug">{m.title}</div>
                    <p className="text-xs text-fg-muted leading-relaxed line-clamp-2">{m.desc}</p>
                    <span className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${m.tone.text} transition-all duration-200 group-hover:gap-2`}>
                      {m.cta}
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
