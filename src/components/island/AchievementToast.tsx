"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { ACHIEVEMENTS, type AchievementId, subscribeAchUnlock } from "./island-bus";

/**
 * 成就解鎖飄字 toast（畫面中央上方）
 */
export function AchievementToast() {
  const [queue, setQueue] = useState<AchievementId[]>([]);

  useEffect(() => subscribeAchUnlock((id) => {
    setQueue((q) => [...q, id]);
    setTimeout(() => setQueue((q) => q.slice(1)), 3500);
  }), []);

  if (queue.length === 0) return null;
  const cur = queue[0];
  const meta = ACHIEVEMENTS[cur];

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-black rounded-xl shadow-2xl px-5 py-3 animate-[ach-pop_400ms_ease-out] flex items-center gap-3 min-w-0 w-[calc(100vw-2rem)] sm:min-w-[280px] sm:w-auto">
        <Trophy size={24} className="flex-shrink-0" />
        <div className="flex-1">
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-70">成就解鎖</div>
          <div className="text-sm font-black">{meta.emoji} {meta.label}</div>
          <div className="text-[10px] opacity-80">{meta.desc}</div>
        </div>
        <div className="text-xs font-bold bg-black/20 rounded-full px-2 py-1">+{meta.reward} 🪙</div>
      </div>
      <style>{`@keyframes ach-pop{0%{transform:translateY(-30px) scale(0.7);opacity:0}60%{transform:translateY(4px) scale(1.05);opacity:1}100%{transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}
