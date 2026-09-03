/**
 * 粒子顏色計算（純函式、不碰 DOM → 可單元測試）。
 *
 * 「只要粒子」模式下不畫場景底色、粒子直接疊在主題的 --color-bg 上，
 * 而主題底色是使用者在 /theme-studio 自己調的（什麼顏色都可能、亮暗也不一定
 * 跟 data-mode 一致）→ 這裡一律用「底色亮度」決定要壓暗還是提亮粒子。
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
 * 「只要粒子」模式下、把粒子調到跟**實際底色**有對比。
 *
 * 底色不是固定的：使用者可以在 /theme-studio 自訂主題（`--color-bg` 什麼顏色都可能，
 * 而且亮暗不一定跟 data-mode 一致），所以這裡不看模式、直接看底色亮度：
 *   底色亮（>0.55）+ 粒子也亮 → 壓暗；底色暗（<0.45）+ 粒子也暗 → 提亮。
 * 兩者都保留色相（等比縮放 RGB），櫻花粉/霓虹色不會走鐘。
 */
export function adaptColor(rgb: string, bgLum: number | null): string {
  if (bgLum === null) return rgb;
  const parts = rgb.split(",").map((n) => Number(n.trim()));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return rgb;
  const [r, g, b] = parts as [number, number, number];
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  let target: number | null = null;
  if (bgLum > 0.55 && lum > 0.6) target = 0.34; // 淺底 + 亮粒子 → 壓暗
  else if (bgLum < 0.45 && lum < 0.22) target = 0.62; // 深底 + 暗粒子 → 提亮
  if (target === null || lum === 0) return rgb;
  const k = target / lum;
  return [r, g, b].map((n) => Math.round(Math.max(0, Math.min(255, n * k)))).join(",");
}

