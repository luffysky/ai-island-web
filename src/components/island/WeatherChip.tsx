"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudRain, Sun } from "lucide-react";
import { type Weather, getWeather, subscribeWeather, setWeather } from "./island-bus";

const META: Record<Weather, { icon: any; label: string; color: string }> = {
  sunny:  { icon: Sun,       label: "晴", color: "text-yellow-300" },
  cloudy: { icon: Cloud,     label: "陰", color: "text-gray-300" },
  rainy:  { icon: CloudRain, label: "雨", color: "text-blue-300" },
};

export function WeatherChip() {
  const [w, setW] = useState<Weather>(getWeather());
  useEffect(() => subscribeWeather(setW), []);
  const M = META[w];
  const Icon = M.icon;
  const cycle = () => {
    const order: Weather[] = ["sunny", "cloudy", "rainy"];
    const next = order[(order.indexOf(w) + 1) % order.length];
    setWeather(next);
  };
  return (
    <button
      onClick={cycle}
      title={`目前 ${M.label}、點切換`}
      className="absolute top-14 right-3 z-30 pointer-events-auto h-9 px-2.5 rounded-full bg-black/60 backdrop-blur text-white text-xs flex items-center gap-1.5 hover:bg-black/80"
    >
      <Icon size={14} className={M.color} />
      <span>{M.label}</span>
    </button>
  );
}
