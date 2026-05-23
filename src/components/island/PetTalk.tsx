"use client";

import { useEffect, useState } from "react";
import { X, Heart } from "lucide-react";
import { subscribePetTalk, readBond, bumpBond } from "./island-bus";

const LINES = [
  "主人～你來陪我了 (≧▽≦)",
  "今天又學了新東西嗎？快教我！",
  "好餓喔、想吃魚乾",
  "你身上有貝殼嗎？聞起來香香的",
  "島上的風好舒服喔",
  "天氣陰陰的、要不要去燈塔看看",
  "主人不在的時候、我都在追蝴蝶",
  "你完成了好多 lesson 哦、好厲害",
  "晚一點再去採水晶嘛、陪我玩",
  "我覺得我快進化了！",
];

export function PetTalk({ petName }: { petName: string | null }) {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState("");
  const [bond, setBond] = useState(0);

  useEffect(() => {
    return subscribePetTalk(() => {
      setLine(LINES[Math.floor(Math.random() * LINES.length)]);
      const next = bumpBond(1);
      setBond(next);
      setOpen(true);
    });
  }, []);

  useEffect(() => { setBond(readBond()); }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = () => setOpen(false);
    window.addEventListener("keydown", onEsc);
    const t = setTimeout(() => setOpen(false), 4500);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!open || !petName) return null;

  return (
    <div className="absolute left-1/2 top-1/3 -translate-x-1/2 z-40 pointer-events-auto" onClick={() => setOpen(false)}>
      <div className="bg-pink-500/95 text-white rounded-2xl shadow-2xl px-5 py-3 max-w-sm animate-[bounce-in_300ms_ease-out]">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm">🐾 {petName}</span>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="p-0.5 hover:bg-white/20 rounded">
            <X size={12} />
          </button>
        </div>
        <p className="text-sm leading-relaxed mb-2">{line}</p>
        <div className="flex items-center gap-1 text-[10px]">
          <Heart size={11} className="fill-white" />
          <span>親密度 {bond}/100</span>
          <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden ml-1">
            <div className="h-full bg-white transition-all" style={{ width: `${bond}%` }} />
          </div>
          <span className="text-white/80">+1</span>
        </div>
      </div>
      <style>{`@keyframes bounce-in{0%{transform:translateY(20px) scale(0.8);opacity:0}60%{transform:translateY(-4px) scale(1.05);opacity:1}100%{transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}
