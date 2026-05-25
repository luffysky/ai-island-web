"use client";

import { cn } from "@/lib/utils";

/**
 * Aceternity 風格 SVG 線條動畫背景
 * 純 SVG + CSS、不依賴 framer-motion、輕量
 */
export function BackgroundBeams({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(50%_50%_at_50%_50%,#000_60%,transparent_100%)]",
        className,
      )}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="beamGrad1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beamGrad2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beamGrad3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#50fa7b" stopOpacity="0" />
            <stop offset="50%" stopColor="#50fa7b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#50fa7b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[...Array(8)].map((_, i) => {
          const y = 30 + i * 35;
          const gradId = `beamGrad${(i % 3) + 1}`;
          return (
            <path
              key={i}
              d={`M-100 ${y} Q200 ${y + (i % 2 ? -30 : 30)} 400 ${y} T 900 ${y}`}
              stroke={`url(#${gradId})`}
              strokeWidth="1.2"
              fill="none"
              className="beam-line"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          );
        })}
      </svg>
      <style jsx>{`
        :global(.beam-line) {
          stroke-dasharray: 200 1000;
          animation: beam-flow 8s linear infinite;
        }
        @keyframes beam-flow {
          from { stroke-dashoffset: 1200; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
