import type { CSSProperties } from "react";

/**
 * 筆記頁專屬背景設定（跟 /me 全域背景分開）。
 * 純前端、存 localStorage（個人裝飾偏好、不進 DB / 不吃 egress）。
 */
export type NotesBgConfig = {
  /** preset id（見 NOTES_BG_PRESETS）或 "image" */
  preset: string;
  /** 自訂圖片 URL（preset === "image" 時用） */
  imageUrl?: string | null;
  /** 液態玻璃層（frosted glass over 背景）。預設關 */
  glass: boolean;
  /** 玻璃霧面不透明度 0–1 */
  glassOpacity: number;
};

export const DEFAULT_NOTES_BG: NotesBgConfig = {
  preset: "none",
  imageUrl: null,
  glass: false,
  glassOpacity: 0.35,
};

export type NotesBgPreset = {
  id: string;
  label: string;
  group: "純色" | "漸層" | "圖樣";
  style: CSSProperties;
};

// 圖樣 style 小工具（讓 ≥20 個圖樣不用每個手寫一長串）
const dots = (bgc: string, dot: string): CSSProperties => ({ backgroundColor: bgc, backgroundImage: `radial-gradient(${dot} 1.5px, transparent 1.5px)`, backgroundSize: "18px 18px" });
const grid = (bgc: string, line: string): CSSProperties => ({ backgroundColor: bgc, backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`, backgroundSize: "22px 22px" });
const ruled = (bgc: string, line: string): CSSProperties => ({ backgroundColor: bgc, backgroundImage: `repeating-linear-gradient(0deg, transparent 0 27px, ${line} 27px 28px)` });
const diag = (bgc: string, line: string): CSSProperties => ({ backgroundColor: bgc, backgroundImage: `repeating-linear-gradient(45deg, ${line} 0 8px, transparent 8px 18px)` });
const cross = (bgc: string, line: string): CSSProperties => ({ backgroundColor: bgc, backgroundImage: `repeating-linear-gradient(45deg, ${line} 0 1px, transparent 1px 12px), repeating-linear-gradient(-45deg, ${line} 0 1px, transparent 1px 12px)` });
const grad = (deg: number, ...c: string[]): CSSProperties => ({ background: `linear-gradient(${deg}deg, ${c.join(",")})` });

const D = "rgba(0,0,0,0.10)";
const L = "rgba(255,255,255,0.12)";

const SOLIDS: [string, string, string][] = [
  ["paper-white", "紙白", "#f6f5f1"], ["pure-white", "純白", "#ffffff"], ["warm", "暖米", "#f3ece0"],
  ["cream", "奶油", "#fdf6e3"], ["sand", "細沙", "#efe6d5"], ["mint", "薄荷", "#e6f3ec"],
  ["sage", "鼠尾草", "#e3ece1"], ["sky", "天藍", "#e6f0fa"], ["powder", "粉藍", "#e8eef7"],
  ["lavender", "薰衣草", "#efeaf7"], ["blush", "腮紅", "#fbe9ee"], ["rose", "玫瑰", "#f7e3e8"],
  ["peachy", "蜜桃", "#fbeadf"], ["lemon", "檸檬", "#f9f3d6"], ["honey", "蜂蜜", "#f7eccb"],
  ["stone", "石灰", "#ececec"], ["slate", "板岩", "#e4e7eb"], ["graphite", "石墨", "#d9dde2"],
  ["ink", "墨黑", "#16161a"], ["charcoal", "炭黑", "#23232a"], ["navy", "午夜藍", "#1b2433"],
  ["forest", "森綠", "#16241c"], ["wine", "酒紅", "#2a1820"],
];

const GRADS: [string, string, CSSProperties][] = [
  ["sunset", "晚霞", grad(135, "#ffd9e8", "#c6f0ff")],
  ["aurora", "極光", grad(135, "#d2efd2", "#cfe6ff", "#e9d9ff")],
  ["peach", "蜜桃", grad(135, "#ffe2c4", "#ffd9e8")],
  ["dusk", "暮色", grad(160, "#2b2d42", "#3a3a5a")],
  ["ocean", "海洋", grad(135, "#2193b0", "#6dd5ed")],
  ["grape", "葡萄", grad(135, "#654ea3", "#eaafc8")],
  ["lime", "青檸", grad(135, "#a8e063", "#56ab2f")],
  ["flamingo", "火鶴", grad(135, "#f12711", "#f5af19")],
  ["sky2", "晴空", grad(135, "#a1c4fd", "#c2e9fb")],
  ["candy", "棉花糖", grad(135, "#fbc2eb", "#a6c1ee")],
  ["mojito", "莫西多", grad(135, "#1d976c", "#93f9b9")],
  ["cherry", "櫻桃", grad(135, "#eb3349", "#f45c43")],
  ["lush", "蔥綠", grad(135, "#56ab2f", "#a8e063")],
  ["plum", "梅紫", grad(135, "#c471f5", "#fa71cd")],
  ["steel", "鋼藍", grad(135, "#bdc3c7", "#2c3e50")],
  ["sunrise", "日出", grad(135, "#ff512f", "#f09819")],
  ["mintg", "薄荷綠", grad(135, "#00b09b", "#96c93d")],
  ["berry", "莓果", grad(135, "#8e2de2", "#4a00e0")],
  ["cotton", "雲彩", grad(135, "#d9afd9", "#97d9e1")],
  ["amberg", "琥珀", grad(135, "#f7971e", "#ffd200")],
  ["night", "深夜", grad(160, "#0f2027", "#203a43", "#2c5364")],
  ["roseg", "玫瑰金", grad(135, "#ee9ca7", "#ffdde1")],
];

const PATTERNS: [string, string, CSSProperties][] = [
  ["dots", "點點", dots("#faf8f3", D)],
  ["dots-blue", "藍點", dots("#eef3fb", "rgba(37,99,235,0.18)")],
  ["dots-pink", "粉點", dots("#fbeef3", "rgba(190,57,137,0.18)")],
  ["dots-green", "綠點", dots("#eef6ee", "rgba(22,163,74,0.18)")],
  ["dots-big", "大點", { backgroundColor: "#f7f6f2", backgroundImage: `radial-gradient(${D} 2.5px, transparent 2.5px)`, backgroundSize: "26px 26px" }],
  ["dots-dark", "暗點", dots("#1a1a20", L)],
  ["grid", "方格", grid("#fbfbfd", "rgba(0,0,0,0.06)")],
  ["grid-blue", "藍格", grid("#eef3fb", "rgba(37,99,235,0.10)")],
  ["grid-mint", "綠格", grid("#ecf6f0", "rgba(22,163,74,0.10)")],
  ["grid-pink", "粉格", grid("#fbeef3", "rgba(190,57,137,0.10)")],
  ["grid-dark", "暗格", grid("#16161c", L)],
  ["graph", "細格", { backgroundColor: "#f3f8ff", backgroundImage: "linear-gradient(rgba(37,99,235,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.08) 1px, transparent 1px)", backgroundSize: "12px 12px" }],
  ["lines", "橫隔線", ruled("#fffdf7", "rgba(0,0,0,0.09)")],
  ["lines-blue", "藍隔線", ruled("#eef3fb", "rgba(37,99,235,0.12)")],
  ["lines-dark", "暗隔線", ruled("#1b1b22", L)],
  ["diagonal", "斜紋", diag("#f4f4f7", "rgba(0,0,0,0.05)")],
  ["diagonal-warm", "暖斜紋", diag("#f6efe6", "rgba(120,80,20,0.07)")],
  ["diagonal-blue", "藍斜紋", diag("#eef3fb", "rgba(37,99,235,0.07)")],
  ["cross", "交叉", cross("#f4f5f7", "rgba(0,0,0,0.06)")],
  ["cross-warm", "暖交叉", cross("#f6efe6", "rgba(120,80,20,0.08)")],
  ["cross-dark", "暗交叉", cross("#17171d", L)],
];

export const NOTES_BG_PRESETS: NotesBgPreset[] = [
  { id: "none", label: "無", group: "純色", style: {} },
  ...SOLIDS.map(([id, label, bg]) => ({ id, label, group: "純色" as const, style: { background: bg } })),
  ...GRADS.map(([id, label, style]) => ({ id, label, group: "漸層" as const, style })),
  ...PATTERNS.map(([id, label, style]) => ({ id, label, group: "圖樣" as const, style })),
];

export function getNotesBgPreset(id: string): NotesBgPreset | undefined {
  return NOTES_BG_PRESETS.find((p) => p.id === id);
}

/** 把 config 轉成容器 style */
export function notesBgStyle(cfg: NotesBgConfig): CSSProperties {
  if (cfg.preset === "image" && cfg.imageUrl) {
    return {
      backgroundImage: `url(${cfg.imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "local",
    };
  }
  return getNotesBgPreset(cfg.preset)?.style ?? {};
}

const LS_KEY = "notes-bg-v1";

export function loadNotesBg(): NotesBgConfig {
  if (typeof window === "undefined") return DEFAULT_NOTES_BG;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_NOTES_BG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_NOTES_BG, ...parsed };
  } catch {
    return DEFAULT_NOTES_BG;
  }
}

export function saveNotesBg(cfg: NotesBgConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch {
    /* localStorage 滿了就算了 */
  }
}
