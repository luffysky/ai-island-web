/**
 * 便利貼配色（共用：NoteCard / 漂浮預覽 / 編輯器選色）。
 * 每組都淺底深字，方便手寫筆記閱讀。
 */
export type StickyColor = { key: string; label: string; bg: string; tape: string };

export const STICKY_COLORS: StickyColor[] = [
  { key: "pink", label: "粉", bg: "#ffd9e8", tape: "#ff9ec4" },
  { key: "yellow", label: "黃", bg: "#fff3c4", tape: "#ffd84d" },
  { key: "green", label: "綠", bg: "#d2efd2", tape: "#86d586" },
  { key: "blue", label: "藍", bg: "#cfe6ff", tape: "#85bdff" },
  { key: "purple", label: "紫", bg: "#e9d9ff", tape: "#bd93f9" },
  { key: "orange", label: "橘", bg: "#ffe2c4", tape: "#ffb673" },
  { key: "mint", label: "薄荷", bg: "#d4f5ee", tape: "#7fdcc8" },
  { key: "slate", label: "灰藍", bg: "#dde3ea", tape: "#9fb0c3" },
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 解析一則筆記要用的便利貼顏色：明確指定優先、否則依 category/id 雜湊自動分配 */
export function resolveSticky(opts: { color?: string | null; category?: string | null; id: string }): StickyColor {
  if (opts.color) {
    const found = STICKY_COLORS.find((c) => c.key === opts.color);
    if (found) return found;
  }
  const h = hashStr(opts.category || opts.id);
  return STICKY_COLORS[h % STICKY_COLORS.length];
}

/** 卡片旋轉角度（手寫便利貼微歪感）— 依 id 穩定 */
export function stickyRotate(id: string, spread = 0.7): number {
  return ((hashStr(id) % 3) - 1) * spread;
}

/** 透明度夾在 0.3–1（太透明會看不到字） */
export function clampOpacity(o: number | null | undefined): number {
  if (typeof o !== "number" || Number.isNaN(o)) return 1;
  return Math.min(1, Math.max(0.3, o));
}

/** #rrggbb → rgba(r,g,b,a)，只讓底色半透明、文字維持清楚 */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
