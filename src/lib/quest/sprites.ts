/**
 * Code Quest 像素美術（原創 CC0：本專案自繪、可自由商用）。
 * 每個 sprite = 一組色碼列（'.'/' '=透明）；spriteCanvas() 轉成 canvas 供 PixiJS Texture 用（nearest 放大保持像素感）。
 */
export type PixelSprite = { rows: string[]; palette: Record<string, string> };

/** 機器人（面朝「上」；用 sprite.rotation 轉向）。 */
export const ROBOT: PixelSprite = {
  palette: { K: "#16222e", B: "#5aa9e6", L: "#c8e8ff", E: "#19f0dd", D: "#2f6ea5", Y: "#ffd166" },
  rows: [
    "....Y..Y....",
    "...KBBBBK...",
    "..KBBBBBBK..",
    "..KBEEEEBK..",
    "..KBEEEEBK..",
    "..KBBBBBBK..",
    "..KBDDDDBK..",
    "...KBBBBK...",
    "...K.BB.K...",
    "....KBBK....",
    "...KK..KK...",
    "............",
  ],
};

/** 寶石 💎 */
export const GEM: PixelSprite = {
  palette: { K: "#0e7490", C: "#22d3ee", W: "#ecfeff" },
  rows: [
    "....K....",
    "...KCK...",
    "..KCWCK..",
    ".KCCCCCK.",
    "KCCCCCCCK",
    ".KCCCCCK.",
    "..KCCCK..",
    "...KCK...",
    "....K....",
  ],
};

/** 終點旗子 🎯 */
export const FLAG: PixelSprite = {
  palette: { K: "#3f2d1a", R: "#f59e0b", D: "#d97706" },
  rows: [
    ".K........",
    ".KRRR.....",
    ".KRRRRR...",
    ".KRRRRRRR.",
    ".KRRRRD...",
    ".KRRR.....",
    ".K........",
    ".K........",
    ".K........",
    ".K........",
    ".KK.......",
    "KKKKK.....",
  ],
};

/** 把 sprite 轉成 canvas（每像素放大 px 倍）。只在瀏覽器呼叫。 */
export function spriteCanvas(s: PixelSprite, px = 6): HTMLCanvasElement {
  const w = Math.max(...s.rows.map((r) => r.length));
  const h = s.rows.length;
  const cv = document.createElement("canvas");
  cv.width = w * px; cv.height = h * px;
  const ctx = cv.getContext("2d")!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < s.rows[y].length; x++) {
      const c = s.rows[y][x];
      if (c === "." || c === " ") continue;
      const col = s.palette[c];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * px, y * px, px, px);
    }
  }
  return cv;
}
