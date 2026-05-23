"use client";

import { useEffect, useMemo, useState } from "react";
import { type Weather, getWeatherState, subscribeWeather } from "./island-bus";

/**
 * 零 WebGL 開銷的天氣 overlay：純 CSS 動畫雨 / 雪 / 霧。
 * - 雨：100 條白線、垂直 falling + skewX 受 wind 角度
 * - 雪：80 個圓點、慢速 falling + sin 左右搖
 * - 霧：覆蓋一層 backdrop-blur + 白色漸層
 */
const RAIN_COUNT = 100;
const SNOW_COUNT = 80;

export function WeatherOverlay() {
  const [state, setState] = useState(() => getWeatherState());
  useEffect(() => subscribeWeather(setState), []);

  // wind 影響傾斜：-30° ~ +30° skew
  const tilt = useMemo(() => {
    // wind 0°=東 / 90°=南 / 180°=西 / 270°=北、map 到水平分量
    const rad = (state.windDeg * Math.PI) / 180;
    const horiz = Math.cos(rad) * state.windSpeed;
    return Math.max(-30, Math.min(30, horiz * 30));
  }, [state.windDeg, state.windSpeed]);

  // 預先生成位置（不依 weather、避免每次切換重 layout）
  const rainSpec = useMemo(() => Array.from({ length: RAIN_COUNT }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 0.6 + Math.random() * 0.4,
    opacity: 0.3 + Math.random() * 0.5,
    height: 12 + Math.random() * 18,
  })), []);
  const snowSpec = useMemo(() => Array.from({ length: SNOW_COUNT }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 6 + Math.random() * 6,
    opacity: 0.5 + Math.random() * 0.5,
    size: 4 + Math.random() * 6,
    drift: 10 + Math.random() * 30,
  })), []);

  const w: Weather = state.kind;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {/* 霧 / 多雲 — backdrop-blur 覆蓋 */}
      {w === "foggy" && (
        <div className="absolute inset-0 bg-white/15 backdrop-blur-[2px]" />
      )}
      {w === "cloudy" && (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-500/20 via-transparent to-gray-500/10" />
      )}
      {w === "snowy" && (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/10 via-transparent to-white/5" />
      )}

      {/* 雨 */}
      {w === "rainy" && (
        <div className="absolute inset-0" style={{ transform: `skewX(${tilt}deg)` }}>
          {rainSpec.map((r, i) => (
            <span
              key={i}
              className="absolute bg-sky-200/70 rounded-full"
              style={{
                left: `${r.left}%`,
                top: "-20px",
                width: 1,
                height: `${r.height}px`,
                opacity: r.opacity,
                animation: `rain-fall ${r.duration}s linear ${r.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* 雪 */}
      {w === "snowy" && (
        <>
          {snowSpec.map((s, i) => (
            <span
              key={i}
              className="absolute bg-white rounded-full shadow-[0_0_3px_rgba(255,255,255,0.8)]"
              style={{
                left: `${s.left}%`,
                top: "-20px",
                width: s.size,
                height: s.size,
                opacity: s.opacity,
                animation: `snow-fall ${s.duration}s linear ${s.delay}s infinite, snow-drift ${4 + (i % 5)}s ease-in-out ${s.delay}s infinite alternate`,
                ["--drift" as any]: `${s.drift * (tilt > 0 ? 1 : -1)}px`,
              }}
            />
          ))}
        </>
      )}

      <style>{`
        @keyframes rain-fall { 0% { transform: translateY(-30px); } 100% { transform: translateY(100vh); } }
        @keyframes snow-fall { 0% { transform: translateY(-30px); } 100% { transform: translateY(105vh); } }
        @keyframes snow-drift { from { margin-left: 0; } to { margin-left: var(--drift, 20px); } }
      `}</style>
    </div>
  );
}
