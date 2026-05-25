"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 共用 section 標題 — 整站統一
 */
export function SectionHeader({
  icon,
  title,
  subtitle,
  align = "center",
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "mb-8",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {icon && (
        <div className={cn("text-4xl mb-2", align === "center" && "flex justify-center")}>
          {icon}
        </div>
      )}
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="mt-2 text-sm md:text-base text-fg-muted max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
      )}
    </motion.header>
  );
}
