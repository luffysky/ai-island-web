"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/**
 * 共用卡片元件、進場 + hover lift
 * 用於整站統一風格
 */
type MotionCardProps = HTMLMotionProps<"div"> & {
  delay?: number;
  hover?: boolean;
};

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(function MotionCard(
  { className, delay = 0, hover = true, children, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -3, transition: { duration: 0.18 } } : undefined}
      className={cn(
        "rounded-2xl bg-bg-card border border-border transition-shadow hover:shadow-xl hover:shadow-accent/5 hover:border-accent/30",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
});
