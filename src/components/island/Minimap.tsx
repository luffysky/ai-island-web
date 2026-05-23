"use client";

import { useEffect, useRef, useState } from "react";
import {
  playerWorldPos,
  CHESTS,
  readOpenedChests,
  subscribeChests,
} from "./island-bus";

const ISLAND_RADIUS = 30;
const MAP_SIZE = 150;
const SCALE = (MAP_SIZE / 2) / (ISLAND_RADIUS + 3); // 邊緣留 3 公尺 padding

const NODES: Array<{ x: number; z: number; color: string; label: string }> = [
  { x: 8, z: -4, color: "#50fa7b", label: "章" },
  { x: -7, z: 6, color: "#50fa7b", label: "副" },
  { x: 0, z: -12, color: "#50fa7b", label: "榜" },
  { x: 14, z: 12, color: "#50fa7b", label: "壇" },
  { x: -15, z: -10, color: "#50fa7b", label: "格" },
];
const NPCS: Array<{ x: number; z: number; color: string; label: string }> = [
  { x: 16, z: 14, color: "#ffd700", label: "👴" },
  { x: -14, z: 14, color: "#8be9fd", label: "🧙" },
  { x: 0, z: 4, color: "#ff79c6", label: "🔮" },
];

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [opened, setOpened] = useState<Set<number>>(new Set());

  useEffect(() => {
    setOpened(readOpenedChests());
    return subscribeChests(setOpened);
  }, []);

  useEffect(() => {
    const draw = () => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

      // 海背景
      ctx.fillStyle = "rgba(31,111,180,0.7)";
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      // 島嶼圓盤
      const cx = MAP_SIZE / 2;
      const cy = MAP_SIZE / 2;
      ctx.fillStyle = "#3ea05a";
      ctx.beginPath();
      ctx.arc(cx, cy, ISLAND_RADIUS * SCALE, 0, Math.PI * 2);
      ctx.fill();

      // 沙岸圈
      ctx.strokeStyle = "rgba(230,212,154,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 節點
      for (const n of NODES) {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(cx + n.x * SCALE, cy + n.z * SCALE, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // NPC
      for (const n of NPCS) {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(cx + n.x * SCALE, cy + n.z * SCALE, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 寶箱
      for (const c of CHESTS) {
        const isOpen = opened.has(c.id);
        ctx.fillStyle = isOpen ? "#5a4a3a" : "#ffd700";
        ctx.beginPath();
        ctx.arc(cx + c.pos[0] * SCALE, cy + c.pos[1] * SCALE, isOpen ? 2 : 4, 0, Math.PI * 2);
        ctx.fill();
        if (!isOpen) {
          ctx.strokeStyle = "rgba(255,215,0,0.5)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx + c.pos[0] * SCALE, cy + c.pos[1] * SCALE, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 玩家
      const px = cx + playerWorldPos.x * SCALE;
      const py = cy + playerWorldPos.z * SCALE;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      // 朝向錐
      ctx.fillStyle = "#fff";
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(playerWorldPos.rot);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-3, -8);
      ctx.lineTo(3, -8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [opened]);

  return (
    <div className="absolute top-3 left-3 z-30 pointer-events-none mt-12 md:mt-0">
      <div className="relative bg-black/40 backdrop-blur p-1.5 rounded-xl shadow-lg">
        <canvas ref={canvasRef} width={MAP_SIZE} height={MAP_SIZE} className="rounded-lg" />
        <div className="absolute -bottom-4 right-0 text-[9px] text-white/70 select-none">⬤ 你 · ⬤ 節點 · ⬤ NPC · ⬤ 寶箱</div>
      </div>
    </div>
  );
}
