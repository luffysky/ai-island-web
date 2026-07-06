"use client";

/**
 * 漂流瓶海面：純 CSS/SVG（零外部素材、CSP 安全）。夜空 + 月亮 + 星星 + 波浪 + 漂來的瓶子。
 * 當背景包住內容用：<DriftBottleSea>...卡片內容...</DriftBottleSea>
 */
import { ReactNode } from "react";

function Bottle({ hue = 175 }: { hue?: number }) {
  return (
    <svg viewBox="0 0 24 52" width="100%" height="100%" aria-hidden>
      <rect x="9.5" y="1" width="5" height="6" rx="1.5" fill="#8a5a33" />
      <rect x="9" y="5" width="6" height="3" rx="1" fill="#6f4626" />
      <path d="M8 9c0-1 1-1.5 2-2h4c1 .5 2 1 2 2v3c2 1.5 3 3.5 3 6v25c0 3-2 5-5 5h-7c-3 0-5-2-5-5V18c0-2.5 1-4.5 3-6V9z"
        fill={`hsla(${hue},70%,70%,0.55)`} stroke={`hsla(${hue},70%,85%,0.7)`} strokeWidth="0.7" />
      <rect x="8" y="22" width="8" height="14" rx="1.5" fill="#f5ecd6" transform="rotate(-6 12 29)" />
      <line x1="9" y1="26" x2="15" y2="26" stroke="#c9b78e" strokeWidth="0.7" transform="rotate(-6 12 29)" />
      <line x1="9" y1="29" x2="14" y2="29" stroke="#c9b78e" strokeWidth="0.7" transform="rotate(-6 12 29)" />
      <line x1="9" y1="32" x2="15" y2="32" stroke="#c9b78e" strokeWidth="0.7" transform="rotate(-6 12 29)" />
      <ellipse cx="9" cy="16" rx="1.4" ry="4" fill="hsla(0,0%,100%,0.35)" />
    </svg>
  );
}

const BOTTLES = [
  { top: "42%", size: 30, dur: 26, delay: 0, hue: 175, bob: 3.4 },
  { top: "58%", size: 40, dur: 32, delay: 4, hue: 200, bob: 4.1 },
  { top: "70%", size: 26, dur: 22, delay: 9, hue: 160, bob: 3.0 },
  { top: "50%", size: 34, dur: 29, delay: 14, hue: 190, bob: 3.7 },
  { top: "64%", size: 22, dur: 24, delay: 18, hue: 210, bob: 2.8 },
  { top: "46%", size: 28, dur: 35, delay: 11, hue: 168, bob: 3.9 },
];

export function DriftBottleSea({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* 夜空 → 海 漸層 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a3a] via-[#0e2a52] to-[#0a4b63]" />
      {/* 月亮 */}
      <div className="absolute top-4 right-6 w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 shadow-[0_0_28px_8px_rgba(253,230,138,0.35)]" />
      {/* 星星 */}
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(1px 1px at 15% 18%,#fff,transparent),radial-gradient(1px 1px at 60% 12%,#dbeafe,transparent),radial-gradient(1.4px 1.4px at 80% 25%,#fff,transparent),radial-gradient(1px 1px at 35% 8%,#fff,transparent)", backgroundRepeat: "no-repeat" }} />

      {/* 瓶子 */}
      <div className="absolute inset-0 db-sea" aria-hidden>
        {BOTTLES.map((b, i) => (
          <span key={i} className="db-drift" style={{ top: b.top, width: b.size, height: b.size * 2, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}>
            <span className="db-bob" style={{ animationDuration: `${b.bob}s` }}><Bottle hue={b.hue} /></span>
          </span>
        ))}
      </div>

      {/* 波浪（兩層平移，海面粼光）*/}
      <svg className="absolute bottom-0 left-0 w-[200%] db-wave db-wave-slow" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 Q150 10 300 40 T600 40 T900 40 T1200 40 V80 H0 Z" fill="rgba(56,189,201,0.35)" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-[200%] db-wave" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden>
        <path d="M0 50 Q150 25 300 50 T600 50 T900 50 T1200 50 V80 H0 Z" fill="rgba(13,75,99,0.6)" />
      </svg>

      {/* 內容 */}
      <div className="relative z-10">{children}</div>

      <style>{`
        @keyframes dbDrift { from { transform: translateX(-15vw); } to { transform: translateX(115vw); } }
        @keyframes dbBob { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-7px) rotate(5deg); } }
        @keyframes dbWave { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .db-drift { position: absolute; left: 0; animation-name: dbDrift; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform; }
        .db-bob { display: block; width: 100%; height: 100%; animation-name: dbBob; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .db-wave { animation: dbWave 9s linear infinite; }
        .db-wave-slow { animation-duration: 14s; opacity: 0.8; }
        @media (prefers-reduced-motion: reduce) { .db-drift, .db-bob, .db-wave { animation: none; } }
      `}</style>
    </div>
  );
}
