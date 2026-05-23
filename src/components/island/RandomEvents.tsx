"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { applyBuff, addToInventory, type ResourceKind, RESOURCE_META, setWeather } from "./island-bus";

type EventKind =
  | { id: "wind_gift"; label: "🌬️ 海風吹來"; reward: string }
  | { id: "shooting_star"; label: "🌠 流星雨"; reward: string }
  | { id: "treasure_hint"; label: "🪙 神秘漂流瓶"; reward: string }
  | { id: "double_xp"; label: "✨ 加速幸運符"; reward: string }
  | { id: "storm_coming"; label: "⛈️ 暴風來臨"; reward: string };

/**
 * 隨機事件 — 每 90~180 秒觸發一次、隨機掉落驚喜。
 * 純客戶端、效果 = inventory 加物 / 觸發 buff / 強制天氣 / 等。
 */
export function RandomEvents() {
  const [floats, setFloats] = useState<Array<{ id: number; text: string; sub: string }>>([]);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    let alive = true;
    const timers = timersRef.current;
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };
    const tick = () => {
      if (!alive) return;
      const ev = rollEvent();
      applyEvent(ev);
      const fid = Math.random();
      setFloats((f) => [...f, { id: fid, text: ev.label, sub: ev.reward }]);
      schedule(() => setFloats((f) => f.filter((x) => x.id !== fid)), 4500);
      schedule(tick, 90_000 + Math.random() * 90_000);
    };
    schedule(tick, 45_000);
    return () => {
      alive = false;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  if (floats.length === 0) return null;
  return (
    <div className="absolute top-32 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col gap-2">
      {floats.map((f) => (
        <div key={f.id} className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white rounded-xl shadow-2xl px-4 py-2 animate-[event-pop_400ms_ease-out] flex items-center gap-3 min-w-[260px]">
          <Sparkles size={18} className="flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold">{f.text}</div>
            <div className="text-[10px] opacity-90">{f.sub}</div>
          </div>
        </div>
      ))}
      <style>{`@keyframes event-pop{0%{transform:translateY(-20px) scale(0.9);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}`}</style>
    </div>
  );
}

function rollEvent(): EventKind {
  const r = Math.random();
  if (r < 0.25) return { id: "wind_gift", label: "🌬️ 海風吹來", reward: "+3 木材掉到你包包" };
  if (r < 0.45) return { id: "shooting_star", label: "🌠 流星雨", reward: "+1 水晶掉到包包" };
  if (r < 0.65) return { id: "treasure_hint", label: "🪙 神秘漂流瓶", reward: "+5 貝殼漂上來" };
  if (r < 0.85) return { id: "double_xp", label: "✨ 加速幸運符", reward: "30 秒加速 + 雙倍幸運" };
  return { id: "storm_coming", label: "⛈️ 暴風來臨", reward: "天氣切雨、storm_walker 進度 +" };
}

function applyEvent(ev: EventKind) {
  if (ev.id === "wind_gift") addToInventory("wood" as ResourceKind, 3);
  if (ev.id === "shooting_star") addToInventory("crystal" as ResourceKind, 1);
  if (ev.id === "treasure_hint") addToInventory("shell" as ResourceKind, 5);
  if (ev.id === "double_xp") {
    applyBuff("speed", 30);
    applyBuff("double_coin", 30);
  }
  if (ev.id === "storm_coming") setWeather("rainy");
}
