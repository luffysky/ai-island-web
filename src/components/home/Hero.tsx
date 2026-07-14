"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { NumberTicker } from "@/components/ui/NumberTicker";
import { StarField } from "./parallax";
import {
  Sparkles as SparkleIcon,
  Palette,
  Palmtree,
  GraduationCap,
  Gamepad2,
  Compass,
  Bot,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

type HeroProps = {
  totalChapters: number;
  totalLessons: number;
  stageCount: number;
  islandEnabled?: boolean;
  creatorIslandEnabled?: boolean;
};

/** 每個模式只取品牌調色盤中的一個色相，僅用在「圖示晶片 + hover 邊框」上，
 *  卡片本體維持中性 surface —— 一致、乾淨、不彩虹。全部用 CSS token → 亮暗自動切。 */
type Tone = { text: string; chip: string; hoverBorder: string };
const TONES: Record<string, Tone> = {
  green: { text: "text-accent", chip: "bg-accent/10", hoverBorder: "hover:border-accent" },
  cyan: { text: "text-accent-2", chip: "bg-accent-2/10", hoverBorder: "hover:border-accent-2" },
  purple: { text: "text-accent-3", chip: "bg-accent-3/10", hoverBorder: "hover:border-accent-3" },
  gold: { text: "text-warning", chip: "bg-warning/10", hoverBorder: "hover:border-warning" },
  pink: { text: "text-pink", chip: "bg-pink/10", hoverBorder: "hover:border-pink" },
};

export function Hero({ totalChapters, totalLessons, stageCount, islandEnabled = true, creatorIslandEnabled = false }: HeroProps) {
  const t = useTranslations("home");
  const reduce = useReducedMotion();

  // 沉浸式滾動穿越：釘住(sticky)的舞台隨捲動洗刷 → 鏡頭往島「飛進去」（縮放+景深錯速），
  // 文案先在、往下淡出上移，最後浮出「進入世界」引導。關動態(reduce)時 = 一般靜態 Hero。
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end start"] });
  // reduce 時全部輸出常數 → 等同原本靜態 Hero
  const islandScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.45]);
  const islandY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -48]);
  const farY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -120]);
  const nearY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -320]);
  const nearScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.8]);
  const scrimOpacity = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.25]);
  const textOpacity = useTransform(scrollYProgress, reduce ? [0, 1] : [0, 0.28, 0.46], reduce ? [1, 1] : [1, 1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.46], reduce ? [0, 0] : [0, -70]);
  const enterOpacity = useTransform(scrollYProgress, reduce ? [0, 1] : [0.55, 0.82], reduce ? [0, 0] : [0, 1]);
  const enterY = useTransform(scrollYProgress, [0.55, 0.9], reduce ? [0, 0] : [40, 0]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.12], reduce ? [0, 0] : [1, 0]);

  const modes: Array<{ href: string; Icon: typeof GraduationCap; tone: Tone; tag: string; title: string; desc: string; cta: string; show: boolean }> = [
    { href: "/chapters", Icon: GraduationCap, tone: TONES.green, tag: t("modeClassicTag"), title: t("modeClassicTitle"), desc: t("modeClassicDesc"), cta: t("modeClassicCta"), show: true },
    { href: "/quest", Icon: Gamepad2, tone: TONES.cyan, tag: t("modeQuestTag"), title: t("modeQuestTitle"), desc: t("modeQuestDesc"), cta: t("modeQuestCta"), show: true },
    { href: "/agent", Icon: Bot, tone: TONES.purple, tag: "分身島", title: "你的 AI 分身，替你動手", desc: "交代目標，分身一步步規劃、查資料、操作，還記得你、跨裝置延續。", cta: "開始使喚", show: true },
    { href: "/opportunities", Icon: Compass, tone: TONES.gold, tag: "機會島", title: "競賽 · 補助 · 創投雷達", desc: "找到適合你的機會、加入航線追蹤截止日，AI 幫你挑、還能模擬評審練膽。", cta: "探索機會", show: true },
    { href: "/creator-island", Icon: Palette, tone: TONES.pink, tag: t("modeCreatorTag"), title: t("modeCreatorTitle"), desc: t("modeCreatorDesc"), cta: t("modeCreatorCta"), show: creatorIslandEnabled },
    { href: "/island", Icon: Palmtree, tone: TONES.green, tag: t("modeIslandTag"), title: t("modeIslandTitle"), desc: t("modeIslandDesc"), cta: t("modeIslandCta"), show: islandEnabled },
  ];
  const visibleModes = modes.filter((m) => m.show);

  return (
    <section className="relative">
      {/* ===== 上：沉浸式滾動穿越 Hero — 高軌道 + 釘住舞台，捲動洗刷鏡頭飛進島 =====
           reduce 時軌道降為一般高度、transform 皆常數 → 退化成靜態 Hero。 */}
      <div ref={trackRef} className={reduce ? "relative" : "relative h-[175vh] md:h-[210vh]"}>
        <div className={`${reduce ? "relative min-h-[86vh]" : "sticky top-0 h-screen"} overflow-hidden`}>
          {/* 背景主視覺（日/夜雙圖：暗色夜景、亮色白天，隨主題切）+ 鏡頭推進縮放 */}
          <motion.div className="absolute inset-0 will-change-transform" style={{ scale: islandScale, y: islandY }}>
            <Image
              src="/home/hero-island-dark.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="img-night object-cover object-[68%_center]"
            />
            <Image
              src="/home/hero-island-light.png"
              alt=""
              fill
              sizes="100vw"
              className="img-day object-cover object-[68%_center]"
            />
          </motion.div>

          {/* 2.5D 視差：遠景星空慢飄上升、近景光塵快飄放大（隨捲動＝往前穿越的景深）*/}
          <motion.div className="absolute inset-0 overflow-hidden pointer-events-none will-change-transform" style={{ y: farY }} aria-hidden>
            <StarField variant="far" />
          </motion.div>
          <motion.div className="absolute inset-0 overflow-hidden pointer-events-none will-change-transform" style={{ y: nearY, scale: nearScale }} aria-hidden>
            <StarField variant="near" />
          </motion.div>

          {/* 左重右輕的暗色遮罩（隨捲動加深＝飛入更深處）→ 左側白字對比足、右側露出島 */}
          <motion.div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" style={{ opacity: scrimOpacity }} aria-hidden />
          {/* 底部融進「世界」色（隨主題：暗＝黃昏、亮＝白天天空，平順銜接下方 Stage Map）*/}
          <div className="absolute inset-x-0 bottom-0 h-32 hero-bottom-seam" aria-hidden />

          {/* 文案（釘住期間隨捲動淡出上移，把畫面讓給「飛入世界」）*/}
          <motion.div
            style={{ opacity: textOpacity, y: textY }}
            className={`${reduce ? "relative py-24 md:py-28" : "absolute inset-0 flex items-center"} max-w-6xl mx-auto px-6`}
          >
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur border border-white/20 text-white/90 mb-6">
              <SparkleIcon size={12} className="text-accent" />
              {t("heroBadge")}
            </span>

            <h1 className="text-[2.6rem] leading-[1.06] md:text-6xl font-bold tracking-tight text-white mb-5 [text-shadow:0_2px_24px_rgba(0,0,0,0.5)]">
              {t("heroTitlePart1")}
              <br className="hidden sm:block" />
              {t("heroTitleLearn")}
              <span className="bg-gradient-to-r from-accent via-accent-2 to-accent-3 bg-clip-text text-transparent">
                {t("heroTitleHardest")}
              </span>
              {t("heroTitleDe")}
              {t("heroTitleTech")}
            </h1>

            <p className="text-base md:text-lg text-white/80 leading-relaxed mb-8 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
              <NumberTicker value={totalChapters} className="text-white font-semibold" /> {t("heroTickerMid")}{" "}
              <NumberTicker value={totalLessons} suffix="+" className="text-white font-semibold" /> {t("heroTickerEnd")}
              {t("heroSubline")}
            </p>

            {/* 主 / 次 CTA */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                href="/chapters"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-accent text-accent-contrast shadow-[0_8px_28px_-6px_rgba(80,250,123,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-6px_rgba(80,250,123,0.65)] active:translate-y-0"
              >
                {t("modeClassicCta")}
                <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/agent"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border border-white/25 bg-white/10 backdrop-blur text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:border-white/40"
              >
                <Bot size={17} />
                認識你的 AI 分身
              </Link>
            </div>

            {/* 統計 */}
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { label: t("statChapters"), value: totalChapters, color: "text-accent" },
                { label: t("statLessons"), value: totalLessons, color: "text-accent-2", suffix: "+" },
                { label: t("statStages"), value: stageCount, color: "text-accent-3" },
              ].map((s) => (
                <div key={s.label}>
                  <NumberTicker value={s.value} suffix={s.suffix ?? ""} className={`text-2xl md:text-3xl font-extrabold ${s.color} [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]`} />
                  <div className="text-xs text-white/65 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
          </motion.div>

          {/* 飛入尾段：中央浮現「進入 AI 島」引導（reduce 時不顯示）*/}
          {!reduce && (
            <motion.div style={{ opacity: enterOpacity, y: enterY }} className="absolute inset-x-0 bottom-24 flex flex-col items-center text-center pointer-events-none">
              <span className="text-xs tracking-[0.3em] text-white/60 mb-2">WELCOME TO</span>
              <span className="text-2xl md:text-3xl font-bold text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">AI 島</span>
              <span className="mt-2 text-sm text-white/70 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">往下，走進這座世界</span>
            </motion.div>
          )}

          {/* 向下捲動提示（起始顯示、一捲就淡出）*/}
          {!reduce && (
            <motion.div style={{ opacity: hintOpacity }} className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
              <ChevronDown size={26} className="text-white/70 animate-bounce" />
            </motion.div>
          )}
        </div>
      </div>

      {/* ===== 下：模式入口卡（跟隨主題、一致化、平順 hover）===== */}
      <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-16">
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
                className={`group flex items-start gap-4 h-full surface-glass p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--elev-3)] ${m.tone.hoverBorder}`}
              >
                <span className={`shrink-0 grid place-items-center w-12 h-12 rounded-xl ${m.tone.chip} ${m.tone.text} transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3`}>
                  <m.Icon size={24} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <span className={`text-xs font-medium ${m.tone.text}`}>{m.tag}</span>
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
    </section>
  );
}
