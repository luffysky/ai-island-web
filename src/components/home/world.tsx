"use client";

/**
 * 連續世界 — 首頁＝一座可往下探索的 AI 島。
 *
 * 設計原則（全部資料驅動、與圖片解耦）：
 *  - 場景「內容」不寫死：島名 / 進度 / 鎖定 / 目前章節 / 點擊行為全走 HTML + props。
 *  - 圖片只當「圖層」：可抽換（GPT 每生一張 / 一個圖層就換 src），不依賴圖裡的文字或節點。
 *  - 效能 / a11y：below-fold 圖 lazy、prefers-reduced-motion 靜止、低階裝置靜態降級。
 */

import Link from "next/link";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  Lock,
  Check,
  Landmark,
  Castle,
  Settings,
  Globe,
  Briefcase,
  Bot,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ParallaxLayer, StarField } from "./parallax";

/* 世界固定色盤（不跟主題切 → 亮暗都維持這條電影感日→夜世界；主題只影響世界區外的頁面）*/
export const WORLD_DUSK = "#1a1533";
export const WORLD_MID = "#0d1030";
export const WORLD_NIGHT = "#05060f";

/** 節點可掛的圖示（用字串 key、方便 server 端資料驅動）*/
const NODE_ICONS: Record<string, LucideIcon> = {
  landmark: Landmark,
  castle: Castle,
  settings: Settings,
  globe: Globe,
  briefcase: Briefcase,
  bot: Bot,
};

// ─────────────────────────────────────────────────────────────────────────────
// WorldZone — 連續「日→夜」世界背景容器（包 Hero + Stage Map + 之後的場景）
// ─────────────────────────────────────────────────────────────────────────────
export function WorldZone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`world-zone relative isolate ${className}`}>
      {/* 日→夜漸層（隨主題切：暗＝黃昏→深夜、亮＝白天天空），GPU 便宜、無 JS */}
      <div className="absolute inset-0 -z-20 world-zone-bg" />
      {/* 星空景深：遠景慢、近景快（reduced-motion 自動靜止）；越往下夜越深、星越明顯由漸層負責 */}
      <ParallaxLayer speed={28} className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <StarField variant="far" />
      </ParallaxLayer>
      <ParallaxLayer speed={68} className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <StarField variant="near" />
      </ParallaxLayer>

      {children}

      {/* 底部無縫銜接回主題頁面底色 */}
      <div className="absolute inset-x-0 bottom-0 h-40 -z-10 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ParallaxScene — 可重用多圖層視差場景（#2 #6：新圖層直接 push 進 layers 即可接入）
// ─────────────────────────────────────────────────────────────────────────────
export type SceneLayer = {
  /** 圖片路徑（可抽換）。沒給就用 content 自訂圖層 */
  src?: string;
  content?: ReactNode;
  /** 視差速度：越大＝越近景、跑越快 */
  speed?: number;
  /** 首屏圖給 true（priority）；below-fold 留空＝next/image 自動 lazy */
  priority?: boolean;
  opacity?: number;
  className?: string;
  alt?: string;
};

export function ParallaxScene({
  layers,
  children,
  className = "",
  minHeight = "60vh",
}: {
  layers: SceneLayer[];
  children?: ReactNode;
  className?: string;
  minHeight?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ minHeight }}>
      {layers.map((l, i) => (
        <ParallaxLayer key={i} speed={l.speed ?? 18} className="absolute inset-0 overflow-hidden pointer-events-none">
          {l.src ? (
            <Image
              src={l.src}
              alt={l.alt ?? ""}
              fill
              priority={l.priority}
              sizes="100vw"
              className={`object-cover ${l.className ?? ""}`}
              style={{ opacity: l.opacity }}
            />
          ) : (
            l.content
          )}
        </ParallaxLayer>
      ))}
      <div className="relative">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorldMap — 互動關卡地圖（#5：節點＝純資料，與圖片完全解耦）
// ─────────────────────────────────────────────────────────────────────────────
export type NodeState = "done" | "current" | "unlocked" | "locked";
export type MapNode = {
  id: number | string;
  name: string;
  sub?: string;
  chapters?: string;
  href: string;
  x: number; // 0–100（%）
  y: number; // 0–100（%）
  color?: string; // 節點主色（CSS color）
  iconKey?: keyof typeof NODE_ICONS;
  state?: NodeState;
};

export function WorldMap({
  nodes,
  image,
  imageSpeed = 12,
  /** 底圖若已畫好路徑（例如 hero path 層），就別再畫 HTML 連線、避免雙線 */
  drawConnections,
  aspect = "aspect-[4/3] sm:aspect-[16/10]",
  imageObjectFit = "cover",
  className = "",
}: {
  nodes: MapNode[];
  /** 可抽換的地圖底圖（text-free）；沒給＝用內建 SVG 地形降級 */
  image?: string;
  imageSpeed?: number;
  drawConnections?: boolean;
  aspect?: string;
  imageObjectFit?: "cover" | "contain";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const showConnections = drawConnections ?? !image; // 有底圖預設不畫線（底圖自帶路徑）
  return (
    <div className={`relative w-full overflow-hidden rounded-3xl border border-white/10 surface-glass ${aspect} ${className}`}>
      {/* 底圖層（可抽換）；沒圖時用漸層 + SVG 地形降級 */}
      {image ? (
        <ParallaxLayer speed={imageSpeed} className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image src={image} alt="" fill sizes="(max-width:768px) 100vw, 1000px" className={imageObjectFit === "contain" ? "object-contain" : "object-cover"} />
        </ParallaxLayer>
      ) : (
        <FallbackTerrain />
      )}

      {/* 連線（資料驅動：依序連接節點）*/}
      {showConnections && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
          {nodes.slice(1).map((n, i) => {
            const p = nodes[i];
            const dim = n.state === "locked";
            return (
              <line
                key={n.id}
                x1={p.x}
                y1={p.y}
                x2={n.x}
                y2={n.y}
                stroke={dim ? "color-mix(in srgb, var(--color-fg) 18%, transparent)" : "color-mix(in srgb, var(--color-accent-2) 60%, transparent)"}
                strokeWidth={2}
                strokeDasharray="1.5 2.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      )}

      {/* 節點（資料驅動、可點、狀態化）*/}
      {nodes.map((n) => (
        <MapNodeDot key={n.id} node={n} reduce={!!reduce} />
      ))}
    </div>
  );
}

function MapNodeDot({ node, reduce }: { node: MapNode; reduce: boolean }) {
  const Icon = (node.iconKey && NODE_ICONS[node.iconKey]) || Sparkles;
  const state = node.state ?? "unlocked";
  const color = node.color ?? "var(--color-accent)";
  const locked = state === "locked";
  const done = state === "done";
  const current = state === "current";

  const dot = (
    <span
      className={`relative grid place-items-center w-11 h-11 rounded-full border-2 backdrop-blur transition-all duration-200 ${
        locked
          ? "bg-black/40 border-white/15 text-white/40"
          : "bg-black/30 group-hover:scale-110 group-hover:-translate-y-0.5"
      } ${current && !reduce ? "animate-pulse-soft" : ""}`}
      style={!locked ? { borderColor: color, color, boxShadow: current ? `0 0 0 6px color-mix(in srgb, ${color} 22%, transparent)` : undefined } : undefined}
    >
      {locked ? <Lock size={16} /> : done ? <Check size={18} /> : <Icon size={18} strokeWidth={2} />}
    </span>
  );

  const label = (
    <span className="mt-1.5 block text-center">
      <span className="text-xs font-semibold text-fg [text-shadow:0_1px_6px_rgba(0,0,0,0.55)] dark:[text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">{node.name}</span>
      {node.chapters && (
        <span className="block text-[10px] font-mono text-fg-muted">{node.chapters}</span>
      )}
    </span>
  );

  const posStyle = { left: `${node.x}%`, top: `${node.y}%` } as const;

  if (locked) {
    return (
      <div
        className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-not-allowed opacity-70"
        style={posStyle}
        title="完成前面關卡後解鎖"
        aria-disabled
      >
        {dot}
        {label}
      </div>
    );
  }

  return (
    <Link
      href={node.href as any}
      className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center focus-visible:outline-none"
      style={posStyle}
      aria-label={`${node.name}${node.sub ? "：" + node.sub : ""}`}
    >
      {dot}
      {label}
      {/* hover 詳情泡（沿用玻璃感）*/}
      {node.sub && (
        <span className="pointer-events-none absolute bottom-full mb-2 hidden group-hover:block whitespace-nowrap rounded-lg surface-glass px-2.5 py-1 text-[11px] text-fg shadow-[var(--elev-2)]">
          {node.sub}
        </span>
      )}
    </Link>
  );
}

/** 沒有地圖底圖時的降級：柔和漸層 + 抽象漂浮島剪影（純 SVG、極輕量）*/
function FallbackTerrain() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="wm-glow" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="var(--color-accent-2)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--color-accent-2)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#wm-glow)" />
      {/* 幾座抽象漂浮島剪影 */}
      {[
        { cx: 70, cy: 240, rx: 46, ry: 12 },
        { cx: 165, cy: 205, rx: 40, ry: 11 },
        { cx: 250, cy: 225, rx: 44, ry: 12 },
        { cx: 320, cy: 165, rx: 38, ry: 10 },
        { cx: 215, cy: 110, rx: 42, ry: 11 },
        { cx: 120, cy: 60, rx: 40, ry: 11 },
      ].map((is, i) => (
        <g key={i} opacity="0.5">
          <ellipse cx={is.cx} cy={is.cy} rx={is.rx} ry={is.ry} fill="var(--color-accent)" opacity="0.14" />
          <path d={`M${is.cx - is.rx} ${is.cy} Q${is.cx} ${is.cy + is.ry * 3} ${is.cx + is.rx} ${is.cy} Z`} fill="#000" opacity="0.25" />
        </g>
      ))}
    </svg>
  );
}
