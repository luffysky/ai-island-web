"use client";

import { useMemo } from "react";

/**
 * 純 CSS 閃光粒子 — 不依賴 framer-motion
 * 用於 Hero / CTA / 1st place 等 wow 區
 */
export function Sparkles({
  count = 20,
  className = "",
  colors = ["#fde047", "#a855f7", "#06b6d4", "#fb923c"],
}: {
  count?: number;
  className?: string;
  colors?: string[];
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3,
        color: colors[i % colors.length],
      })),
    [count, colors.join(",")],
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {particles.map((p) => (
        <span
          key={p.id}
          className="sparkle-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style jsx>{`
        .sparkle-particle {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          animation-name: sparkle-pulse;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          filter: blur(0.5px);
          box-shadow: 0 0 8px currentColor;
        }
        @keyframes sparkle-pulse {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
