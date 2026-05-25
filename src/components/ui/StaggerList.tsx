"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 一個容器、子元素逐個 fade-in stagger
 *
 * <StaggerList className="grid grid-cols-3 gap-3">
 *   <StaggerList.Item>...</StaggerList.Item>
 *   <StaggerList.Item>...</StaggerList.Item>
 * </StaggerList>
 */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as any } },
};

export function StaggerList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      className={cn(className)}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
    >
      {children}
    </motion.div>
  );
}

function Item({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div variants={itemVariants} className={cn(className)}>
      {children}
    </motion.div>
  );
}

StaggerList.Item = Item;
