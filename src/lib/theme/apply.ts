/**
 * 主題套用（client helper）。
 *
 * 純函式、無 React：主題切換要在 150ms 內完成，唯一做得到的方式是
 * 直接寫 element.style，不經過 render。這裡把 compile 出來的 CSS 變數
 * 一次批次寫進 style.cssText（單次 reflow），再補上 data-* 屬性。
 */

import {
  compileThemeToCssVars,
  effectiveTheme,
  themeDataAttributes,
  type ThemeDefinition,
} from "@/lib/theme/engine";

/** 讀目前 light/dark 模式（<html data-mode>，未設視為 dark）。 */
export function currentMode(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-mode") === "light"
    ? "light"
    : "dark";
}

/** 把 CSS 變數 map 串成 cssText（保留既有 style.cssText 以外的值不需要——這裡是整批覆寫）。 */
function varsToCssText(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}

/**
 * 全站套用：把主題寫進 target（預設 :root = document.documentElement）。
 * 一次 cssText 批次寫入所有 CSS 變數，再設 data-* 屬性。
 */
export function applyThemeToDom(
  def: ThemeDefinition,
  mode: "light" | "dark",
  target?: HTMLElement,
): void {
  const el =
    target ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!el) return;

  const eff = effectiveTheme(def, mode);
  const vars = compileThemeToCssVars(eff);
  el.style.cssText = varsToCssText(vars);

  const attrs = themeDataAttributes(eff);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

/**
 * 局部預覽套用：與 applyThemeToDom 相同，但一定作用在傳入的容器上，
 * 不碰 :root。Theme Studio 的即時預覽用。
 */
export function applyThemeToPreview(
  def: ThemeDefinition,
  mode: "light" | "dark",
  el: HTMLElement,
): void {
  if (!el) return;
  const eff = effectiveTheme(def, mode);
  const vars = compileThemeToCssVars(eff);
  // ⚠️ cssText 是整條覆蓋 → 會把 React 寫在 style prop 上的 background/color/border 洗掉，
  // 之後 React 因為 props 沒變也不會補回來（預覽框就會變成「站台的卡片底色」而不是
  // 「預覽中這個主題的底色」）。→ 這裡自己把這三個帶上，預覽框才真的長得像該主題。
  el.style.cssText =
    varsToCssText(vars) +
    " background: var(--color-bg); color: var(--color-fg); border-color: var(--color-border);";

  const attrs = themeDataAttributes(eff);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

/** themeDataAttributes 會設的 data-* 屬性（清除時要移除的）。 */
const THEME_DATA_ATTRS = [
  "data-surface-style",
  "data-motion-preset",
  "data-shadow",
  "data-glow",
  "data-noise",
] as const;

/** 清掉套用的主題，回到 globals.css 的預設值。 */
export function clearAppliedTheme(target?: HTMLElement): void {
  const el =
    target ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!el) return;
  el.style.cssText = "";
  for (const k of THEME_DATA_ATTRS) el.removeAttribute(k);
}
