"use client";

/**
 * 連勝火焰：天數越多燒越旺（縮放 + 光暈 + 閃爍）。0 天不燒。
 *   <StreakFlame streak={profile.streak_days} />
 * 配合 globals.css 的 @keyframes flame-flicker。
 */
export function StreakFlame({ streak, className = "" }: { streak: number; className?: string }) {
  const lvl = streak >= 30 ? 3 : streak >= 14 ? 2 : streak >= 3 ? 1 : streak >= 1 ? 0 : -1;
  if (lvl < 0) return <span className={className} aria-hidden style={{ opacity: 0.4 }}>🔥</span>;
  const glow = [
    "drop-shadow(0 0 1px #fdba74)",
    "drop-shadow(0 0 3px #fb923c)",
    "drop-shadow(0 0 5px #f97316)",
    "drop-shadow(0 0 8px #ef4444) drop-shadow(0 0 3px #fde68a)",
  ][lvl];
  const em = [1, 1.06, 1.14, 1.24][lvl]; // 用 font-size 放大、把 transform 留給閃爍動畫
  return (
    <span
      className={`inline-block ${className}`}
      aria-hidden
      title={`連勝 ${streak} 天`}
      style={{
        filter: glow,
        fontSize: `${em}em`,
        transformOrigin: "bottom center",
        animation: `flame-flicker ${1.4 - lvl * 0.2}s ease-in-out infinite`,
      }}
    >
      🔥
    </span>
  );
}
