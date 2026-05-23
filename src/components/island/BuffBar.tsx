"use client";

import { useEffect, useState } from "react";
import { Zap, Coins, Sprout } from "lucide-react";
import { type BuffKind, subscribeBuffs, getActiveBuffs } from "./island-bus";

const META: Record<BuffKind, { icon: any; label: string; color: string }> = {
  speed:         { icon: Zap,    label: "加速",     color: "text-yellow-300" },
  double_coin:   { icon: Coins,  label: "雙倍幸運", color: "text-amber-300" },
  fast_respawn:  { icon: Sprout, label: "豐收",     color: "text-emerald-300" },
};

/**
 * Active buff bar — 右上、顯示剩餘秒數。
 */
export function BuffBar() {
  const [buffs, setBuffs] = useState(getActiveBuffs());
  const [, setTick] = useState(0);

  useEffect(() => subscribeBuffs(setBuffs), []);

  // 每秒重 render 更新倒數
  useEffect(() => {
    const i = setInterval(() => {
      setBuffs(getActiveBuffs());
      setTick((v) => v + 1);
    }, 1000);
    return () => clearInterval(i);
  }, []);

  if (buffs.length === 0) return null;

  return (
    <div className="absolute top-14 right-3 z-30 pointer-events-none flex flex-col items-end gap-1">
      {buffs.map((b) => {
        const M = META[b.kind];
        if (!M) return null;
        const Icon = M.icon;
        const remain = Math.max(0, Math.ceil((b.until - performance.now()) / 1000));
        return (
          <div key={b.kind} className="bg-black/60 backdrop-blur text-white text-[10px] rounded-full px-2 py-1 flex items-center gap-1">
            <Icon size={11} className={M.color} />
            <span>{M.label}</span>
            <span className="opacity-70 font-mono">{remain}s</span>
          </div>
        );
      })}
    </div>
  );
}
