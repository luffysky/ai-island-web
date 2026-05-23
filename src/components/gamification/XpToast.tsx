"use client";

import { useEffect, useState } from "react";

/**
 * XP 領取動畫 — 完成 lesson 時、「+XX XP」從中央往上飄、淡出
 * 用法：放在頁面任一處、透過 ref 或事件觸發 show()
 */

export interface XpToastData {
  xp: number;
  levelUp?: number;   // 若有升級、帶新等級
  key: number;        // 每次觸發給不同 key 重新播放
}

export function XpToast({ data }: { data: XpToastData | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!data) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, [data?.key]);

  if (!data || !visible) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
      <div
        key={data.key}
        className="xp-toast-float flex flex-col items-center"
      >
        {/* +XP 數字 */}
        <div className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-black font-extrabold text-2xl shadow-2xl">
          <span className="text-xl">⚡</span>
          <span>+{data.xp}</span>
          <span className="text-sm font-bold mt-1">XP</span>
        </div>
        {/* 升級訊息 */}
        {data.levelUp && (
          <div className="mt-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-accent-3 to-accent text-black font-bold text-sm shadow-xl animate-pulse">
            🎉 升到 Lv.{data.levelUp}！
          </div>
        )}
      </div>

      <style jsx>{`
        .xp-toast-float {
          animation: xpFloat 1.8s ease-out forwards;
        }
        @keyframes xpFloat {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.6);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1.15);
          }
          30% {
            transform: translateY(0) scale(1);
          }
          75% {
            opacity: 1;
            transform: translateY(-40px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-90px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
