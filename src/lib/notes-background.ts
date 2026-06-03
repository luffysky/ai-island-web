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

export const NOTES_BG_PRESETS: NotesBgPreset[] = [
  { id: "none", label: "無", group: "純色", style: {} },
  // 純色
  { id: "paper-white", label: "紙白", group: "純色", style: { background: "#f6f5f1" } },
  { id: "warm", label: "暖米", group: "純色", style: { background: "#f3ece0" } },
  { id: "mint", label: "薄荷", group: "純色", style: { background: "#e6f3ec" } },
  { id: "ink", label: "墨黑", group: "純色", style: { background: "#16161a" } },
  // 漸層
  { id: "sunset", label: "晚霞", group: "漸層", style: { background: "linear-gradient(135deg,#ffd9e8,#c6f0ff)" } },
  { id: "aurora", label: "極光", group: "漸層", style: { background: "linear-gradient(135deg,#d2efd2,#cfe6ff,#e9d9ff)" } },
  { id: "peach", label: "蜜桃", group: "漸層", style: { background: "linear-gradient(135deg,#ffe2c4,#ffd9e8)" } },
  { id: "dusk", label: "暮色", group: "漸層", style: { background: "linear-gradient(160deg,#2b2d42,#3a3a5a)" } },
  // 圖樣
  {
    id: "dots", label: "點點", group: "圖樣",
    style: { backgroundColor: "#faf8f3", backgroundImage: "radial-gradient(rgba(0,0,0,0.12) 1.5px, transparent 1.5px)", backgroundSize: "18px 18px" },
  },
  {
    id: "grid", label: "方格", group: "圖樣",
    style: { backgroundColor: "#fbfbfd", backgroundImage: "linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)", backgroundSize: "22px 22px" },
  },
  {
    id: "lines", label: "橫隔線", group: "圖樣",
    style: { backgroundColor: "#fffdf7", backgroundImage: "repeating-linear-gradient(0deg, transparent 0 27px, rgba(0,0,0,0.09) 27px 28px)" },
  },
  {
    id: "diagonal", label: "斜紋", group: "圖樣",
    style: { backgroundColor: "#f4f4f7", backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0 8px, transparent 8px 18px)" },
  },
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
