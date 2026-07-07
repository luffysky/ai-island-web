"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Cloud, CloudRain, CloudSnow, Sun, CloudFog } from "lucide-react";
import { type Weather, getWeatherState, subscribeWeather, setWeather } from "./island-bus";

const META: Record<Weather, { icon: any; labelKey: string; color: string }> = {
  sunny:  { icon: Sun,       labelKey: "weatherSunny",  color: "text-yellow-300" },
  cloudy: { icon: Cloud,     labelKey: "weatherCloudy", color: "text-gray-300" },
  rainy:  { icon: CloudRain, labelKey: "weatherRainy",  color: "text-blue-300" },
  snowy:  { icon: CloudSnow, labelKey: "weatherSnowy",  color: "text-sky-100" },
  foggy:  { icon: CloudFog,  labelKey: "weatherFoggy",  color: "text-zinc-300" },
};

const ORDER: Weather[] = ["sunny", "cloudy", "rainy", "snowy", "foggy"];

export function WeatherChip() {
  const t = useTranslations("island");
  const [s, setS] = useState(() => getWeatherState());
  useEffect(() => subscribeWeather(setS), []);
  const M = META[s.kind];
  const Icon = M.icon;
  const label = t(M.labelKey);
  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(s.kind) + 1) % ORDER.length];
    setWeather(next);
  };
  // 風向箭頭 (0°=東 → →、90°=南 → ↓)
  const windArrow = "→";
  return (
    <button
      onClick={cycle}
      title={t("weatherTip", { label, deg: s.windDeg })}
      className="absolute top-14 right-3 z-30 pointer-events-auto h-9 px-2.5 rounded-full bg-black/60 backdrop-blur text-white text-xs flex items-center gap-1.5 hover:bg-black/80"
    >
      <Icon size={14} className={M.color} />
      <span>{label}</span>
      <span className="text-[9px] text-white/60 inline-flex items-center gap-0.5">
        <span style={{ display: "inline-block", transform: `rotate(${s.windDeg}deg)` }}>{windArrow}</span>
        {Math.round(s.windSpeed * 100)}%
      </span>
    </button>
  );
}
