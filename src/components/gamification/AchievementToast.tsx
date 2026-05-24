"use client";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useEdgeSafe } from "@/lib/use-edge-safe";

const RARITY_COLORS: Record<string, string> = {
  common: "from-gray-500 to-gray-600",
  rare: "from-blue-500 to-cyan-500",
  epic: "from-purple-500 to-pink-500",
  legendary: "from-yellow-500 to-orange-500 animate-pulse-glow",
};

export function AchievementToast({ achievement, onClose }: { achievement: any; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEdgeSafe(ref);
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30 }}
      className="fixed top-20 right-6 z-50 max-w-sm"
    >
      <div className={`bg-gradient-to-br ${RARITY_COLORS[achievement.rarity] ?? RARITY_COLORS.common} rounded-xl p-1`}>
        <div className="bg-bg-elevated rounded-[10px] p-4">
          <div className="flex items-start gap-3">
            <div className="text-4xl">{achievement.icon}</div>
            <div className="flex-1">
              <div className="text-xs text-fg-muted uppercase tracking-wider mb-1">
                🎉 解鎖成就 · {achievement.rarity}
              </div>
              <div className="font-bold text-lg mb-1">{achievement.name}</div>
              <div className="text-xs text-fg-muted mb-2">{achievement.description}</div>
              <div className="flex gap-2 text-xs">
                {achievement.xp_reward > 0 && <span className="text-warning">+{achievement.xp_reward} XP</span>}
                {achievement.z_coin_reward > 0 && <span className="text-yellow-400">+{achievement.z_coin_reward} Z-coin</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
