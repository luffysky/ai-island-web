"use client";
import { motion } from "framer-motion";

export function LevelUpModal({ level, onClose }: { level: number; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12 }}
        className="bg-gradient-to-br from-accent to-accent-2 p-1 rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-bg-elevated rounded-[14px] px-12 py-10 text-center">
          <div className="text-7xl mb-4 animate-pulse-glow inline-block">⭐</div>
          <div className="text-sm text-fg-muted mb-2 tracking-widest">LEVEL UP</div>
          <div className="text-6xl font-bold bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent mb-3">
            Lv {level}
          </div>
          <p className="text-fg-muted mb-6">繼續加油、AI 島之巔在等你！</p>
          <button onClick={onClose} className="px-6 py-2 bg-accent text-black rounded-lg font-bold hover:scale-105 transition-transform">
            繼續冒險
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
