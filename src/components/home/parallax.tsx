"use client";

/**
 * 連續世界骨架 — 可重用的滾動視差 / 揭示元件。
 * 讓首頁像「一座可往下探索的 AI 島」：圖層以不同速度移動＝2.5D 景深、滾到才淡入。
 * 全部尊重 prefers-reduced-motion（關動態時 = 靜止、不位移）。
 */

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/** 滾動進入視窗時淡入 + 上浮。取代零散的 inline motion，全站一致。 */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 視差圖層 — 隨頁面捲動把子內容上下位移 ±speed(px)。
 * speed 越大＝越「近景」跑越快。透明覆蓋層用（子內容建議 overscan、避免露邊）。
 */
export function ParallaxLayer({
  children,
  speed = 40,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-speed, speed]);
  return (
    <div ref={ref} className={className} aria-hidden>
      <motion.div style={{ y }} className="absolute inset-0">
        {children}
      </motion.div>
    </div>
  );
}

/** 星空 / 光塵層。far＝遠景小白星、near＝近景品牌色光塵。overscan 供視差位移不露邊。 */
export function StarField({ variant = "far" }: { variant?: "far" | "near" }) {
  return (
    <div
      aria-hidden
      className={`absolute inset-[-18%] pointer-events-none ${
        variant === "far" ? "starfield opacity-70" : "starfield-2 opacity-60"
      }`}
    />
  );
}
