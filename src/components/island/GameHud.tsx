"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Map as MapIcon,
  Backpack,
  ClipboardList,
  Trophy,
  Users,
  Settings,
} from "lucide-react";
import { emitBagToggle } from "./island-bus";

/**
 * 底部 HUD chip nav（參考 07.png 風格）
 * 地圖 / 背包 / 任務 / 成就 / 好友 / 設定
 */
type Profile = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  level?: number | null;
  xp?: number | null;
  z_coin?: number | null;
};

export function GameHud({ profile }: { profile: Profile | null }) {
  const [showHello, setShowHello] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowHello(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const xp = profile?.xp ?? 0;
  const lv = profile?.level ?? 1;
  const xpInLv = xp % 1000;
  const pct = xpInLv / 10;

  return (
    <>
      {/* 大標題進場 fade-in */}
      {showHello && (
        <div className="absolute top-20 left-0 right-0 z-30 pointer-events-none text-center animate-[fade-out_4s_ease-in-out_forwards]">
          <h1 className="text-5xl md:text-7xl font-black tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            AI Island
          </h1>
          <p className="text-base md:text-xl text-white/85 font-bold tracking-[0.3em] mt-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            學習・探索・創造・連結
          </p>
        </div>
      )}

      {/* 左下角色 panel */}
      <div className="absolute bottom-3 left-3 z-30 pointer-events-auto hidden md:block">
        <div className="bg-black/55 backdrop-blur rounded-2xl px-3 py-2.5 flex items-center gap-3 max-w-xs">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} width={42} height={42} unoptimized alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-accent" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-black font-bold">
              {(profile?.display_name || profile?.username || "?")[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-bold truncate">
              {profile?.display_name || profile?.username || "島民"}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-yellow-300 font-bold">Lv {lv}</span>
              <div className="flex-1 h-1 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-300 to-orange-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[9px] text-white/60">{xpInLv}/1000</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-white/80">
              <span>🪙 {profile?.z_coin ?? 0}</span>
              <span>⚡ {xp}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部 HUD chip nav（中央） */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto hidden md:flex items-center gap-1 bg-black/55 backdrop-blur rounded-full px-2 py-1.5">
        <HudChip icon={<MapIcon size={16} />} label="地圖" onClick={() => scrollMinimap()} />
        <HudChip icon={<Backpack size={16} />} label="背包" onClick={emitBagToggle} hotkey="B" />
        <HudChip icon={<ClipboardList size={16} />} label="任務" onClick={() => alert("走到漁夫長老身邊按 E 開任務")} />
        <HudChip icon={<Trophy size={16} />} label="成就" onClick={emitBagToggle} />
        <HudChip icon={<Users size={16} />} label="排行" onClick={() => alert("走到 🏆 牌子按 E")} />
        <HudChip icon={<Settings size={16} />} label="設定" onClick={() => alert("設定面板待加（音量/畫質/控制）")} />
      </div>

      <style>{`@keyframes fade-out{0%{opacity:0;transform:translateY(-20px)}15%{opacity:1;transform:translateY(0)}80%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}}`}</style>
    </>
  );
}

function HudChip({ icon, label, onClick, hotkey }: { icon: React.ReactNode; label: string; onClick: () => void; hotkey?: string }) {
  return (
    <button
      onClick={onClick}
      className="relative px-3 py-1.5 rounded-full hover:bg-white/15 text-white flex items-center gap-1.5 text-xs transition"
      title={hotkey ? `${label}（${hotkey}）` : label}
    >
      {icon}
      <span>{label}</span>
      {hotkey && <kbd className="text-[8px] bg-white/15 rounded px-1 py-0.5 font-mono">{hotkey}</kbd>}
    </button>
  );
}

function scrollMinimap() {
  // 簡單高亮 minimap（pulse 動畫）
  const el = document.querySelector("[data-island-minimap]");
  if (el) (el as HTMLElement).animate([{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }], { duration: 400 });
}
