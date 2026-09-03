/**
 * 粒子上色（純函式、不碰 DOM → 可單元測試）。
 *
 * 「只要粒子」模式下不畫場景底色、粒子直接疊在主題的 --color-bg 上。
 *
 * ⚠️ 原則：**粒子本身的顏色不動**——雪就要是白的、櫻花就要是粉的、火花就要是橘的。
 * （早期版本會把亮粒子壓暗、結果亮色主題下的飄雪變成一堆灰色小點、失去了「那是雪」
 *   的樣子；那是錯的做法。）
 *
 * 對比不夠時改成在粒子**後面**墊一層「暈」(halo)：同色相、往對比方向推到底的
 * 放大低透明度版本。白雪在白底上還是白雪、只是多了一圈柔邊而已。
 */

/** rgb 三元組（"r,g,b" 或 computed 的 "rgb(...)"）→ 相對亮度 0~1。看不懂就回 null。 */
export function luminanceOf(rgb: string): number | null {
  const m = rgb.match(/-?[\d.]+/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map(Number) as [number, number, number];
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * 亮度差小於這個值就視為「看不清楚」、要加暈。
 * 0.18 是實測抓的線：白雪(差 0.03)/冰晶(差 0.05)/雨絲(差 0.16) 在亮色主題下會加暈，
 * 櫻花粉(差 0.19) 本來就看得清楚 → 不動它。
 */
const MIN_CONTRAST = 0.18;
const HALO_DARK = 0.1; // 淺底：暈壓到接近黑
const HALO_LIGHT = 0.9; // 深底：暈提到接近白

function parseRgb(rgb: string): [number, number, number] | null {
  const parts = rgb.split(",").map((n) => Number(n.trim()));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts as [number, number, number];
}

/** 等比縮放 → 壓暗但保留色相。 */
function darkenTo(
  [r, g, b]: [number, number, number],
  lum: number,
  target: number,
): string {
  const k = lum <= 0 ? 0 : Math.max(0, Math.min(1, target / lum));
  return [r, g, b].map((n) => Math.round(n * k)).join(",");
}

/** 往白色混 → 提亮但保留色相。 */
function lightenTo(
  [r, g, b]: [number, number, number],
  lum: number,
  target: number,
): string {
  const t = lum >= 1 ? 0 : Math.max(0, Math.min(1, (target - lum) / (1 - lum)));
  return [r, g, b].map((n) => Math.round(n + (255 - n) * t)).join(",");
}

export type ParticleInk = {
  /** 粒子本體顏色（永遠＝場景定義的原色）。 */
  fill: string;
  /** 對比不足時墊在後面的暈；夠對比就是 null。 */
  halo: string | null;
};

/**
 * 依「實際底色亮度」決定要不要幫粒子加暈。
 *
 * 底色不是固定的：使用者可以在 /theme-studio 自訂主題（`--color-bg` 什麼顏色都可能、
 * 亮暗也不一定跟 data-mode 一致），所以這裡不看模式、只看底色亮度。
 * bgLum 為 null（有畫場景底色 / 讀不到底色）→ 完全不動。
 */
export function particleInk(color: string, bgLum: number | null): ParticleInk {
  if (bgLum === null) return { fill: color, halo: null };
  const rgb = parseRgb(color);
  if (!rgb) return { fill: color, halo: null };
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (Math.abs(lum - bgLum) >= MIN_CONTRAST) return { fill: color, halo: null };
  const halo =
    bgLum > 0.5
      ? darkenTo(rgb, lum, HALO_DARK)
      : lightenTo(rgb, lum, HALO_LIGHT);
  return { fill: color, halo };
}
