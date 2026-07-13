"use client";

import Link from "next/link";
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
  Code2,
  Trophy,
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

          {/* 右：AI 島概念主視覺（純 SVG/CSS、去角色、亮暗自動切） */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <HeroIslandVisual />
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

/** AI 島概念主視覺 — 純 SVG/CSS 畫的「漂浮 AI 島 + 神經核心 + 漂浮功能晶片」。
 *  不依賴任何圖檔、全用品牌 token → 亮/暗自動切；柔和浮動、尊重 reduced-motion。 */
function HeroIslandVisual() {
  const chips = [
    { Icon: Code2, label: "學程式", cls: "text-accent", pos: "left-[-2%] top-[16%]", delay: "0s" },
    { Icon: Trophy, label: "找機會", cls: "text-warning", pos: "right-[-2%] top-[30%]", delay: "0.8s" },
    { Icon: Bot, label: "AI 分身", cls: "text-accent-3", pos: "left-[8%] bottom-[10%]", delay: "1.6s" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-md aspect-square">
      {/* 柔光 */}
      <div className="absolute inset-6 -z-10 rounded-full bg-gradient-to-br from-accent/20 via-accent-2/10 to-accent-3/20 blur-3xl" />
      {/* 軌道環 */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="w-[82%] h-[82%] rounded-full border border-border/60" />
        <div className="absolute w-[58%] h-[58%] rounded-full border border-border/40" />
      </div>

      {/* 島 + 神經核心 */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full" role="img" aria-label="AI 島概念主視覺">
        <defs>
          <linearGradient id="hi-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" />
            <stop offset="1" stopColor="var(--color-accent-2)" />
          </linearGradient>
          <linearGradient id="hi-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent-3)" stopOpacity="0.85" />
            <stop offset="1" stopColor="var(--color-accent-3)" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="hi-core" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--color-accent-2)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--color-accent-2)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 島底（土＋電路根） */}
        <path d="M120 232 C120 232 138 300 200 336 C262 300 280 232 280 232 Z" fill="url(#hi-soil)" />
        <path d="M200 336 L200 372 M182 300 L172 356 M220 300 L232 356" stroke="var(--color-accent)" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
        {/* 島面（草皮） */}
        <ellipse cx="200" cy="232" rx="86" ry="24" fill="url(#hi-grass)" />

        {/* 神經核心光暈 */}
        <circle cx="200" cy="150" r="60" fill="url(#hi-core)" />
        {/* 連線 */}
        <g stroke="var(--color-accent-3)" strokeWidth="1.5" strokeOpacity="0.55">
          <line x1="200" y1="150" x2="152" y2="120" />
          <line x1="200" y1="150" x2="250" y2="126" />
          <line x1="200" y1="150" x2="208" y2="192" />
          <line x1="152" y1="120" x2="250" y2="126" />
        </g>
        {/* 節點 */}
        <circle cx="200" cy="150" r="10" fill="var(--color-accent-2)" />
        <circle cx="152" cy="120" r="5.5" fill="var(--color-accent)" />
        <circle cx="250" cy="126" r="5.5" fill="var(--color-accent-3)" />
        <circle cx="208" cy="192" r="4.5" fill="var(--color-accent)" />
      </svg>

      {/* 漂浮功能晶片 */}
      {chips.map((c) => (
        <div
          key={c.label}
          className={`absolute ${c.pos} soft-bob inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium surface-glass shadow-[var(--elev-2)] ${c.cls}`}
          style={{ animationDelay: c.delay }}
        >
          <c.Icon size={13} />
          {c.label}
        </div>
      ))}
    </div>
  );
}
