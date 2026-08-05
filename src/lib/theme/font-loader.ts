/**
 * 前台字體載入（client）。
 *
 * `/api/fonts` 回一份公開目錄；這裡把目前主題（ThemeDefinition.typography）
 * 選的 heading / body / ui 角色解析成目錄中的字體、注入 `@font-face`、
 * 並把 `--font-heading/body/ui` CSS 變數設到目標元素上。
 *
 * v1：整檔 @font-face、不做 subsetting、不帶 unicode-range。
 *   - 一個 `<style id="sr-theme-fonts">`，每次呼叫整份取代 → 冪等。
 *   - `font-display: swap` → 字體檔沒載入前先用 fallback 顯示，不留白畫面。
 *   - 解析不到的角色 → 不設該變數，讓它 fall through 到 globals 的 `--font-*`。
 */

import type { ThemeDefinition } from "@/lib/theme/engine";

export type FontCatalogEntry = {
  id: string;
  slug: string;
  family: string;
  category: string;
  weights: number[];
  fallback_stack: string | null;
  files: Record<string, string>;
  /** 外部 webfont CSS（如 Google Fonts CSS2 API）→ 用 <link> 載入、由供應商做子集/供檔。 */
  css_url?: string | null;
};

export type FontCatalog = {
  fonts: FontCatalogEntry[];
  pairs: unknown[];
};

const STYLE_ID = "sr-theme-fonts";
const LINK_ATTR = "data-sr-theme-font";

/** 一個字體是否能用（自架檔或外部 css_url 皆可）。 */
function isUsable(font: FontCatalogEntry): boolean {
  return Object.keys(font.files).length > 0 || !!(font.css_url && font.css_url.trim());
}

/**
 * 同步外部 webfont <link>（Google Fonts 等）：加缺的、移不再需要的。冪等。
 * 這些 <link> 帶 data-sr-theme-font 屬性、只受本函式管理。
 */
function syncFontLinks(hrefs: Set<string>): void {
  const existing = new Map<string, HTMLLinkElement>();
  document
    .querySelectorAll<HTMLLinkElement>(`link[${LINK_ATTR}]`)
    .forEach((l) => existing.set(l.href, l));

  // 移除不再需要的
  for (const [href, el] of existing) {
    // href 是絕對化後的字串；用 getAttribute 原值比對較穩
    const raw = el.getAttribute("href") ?? href;
    if (!hrefs.has(raw)) el.remove();
  }
  // 加缺的
  const present = new Set(
    Array.from(document.querySelectorAll<HTMLLinkElement>(`link[${LINK_ATTR}]`)).map(
      (l) => l.getAttribute("href") ?? "",
    ),
  );
  for (const href of hrefs) {
    if (present.has(href)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute(LINK_ATTR, "");
    link.setAttribute("crossorigin", "anonymous");
    link.href = href;
    document.head.appendChild(link);
  }
}

type Role = "heading" | "body" | "ui";
const ROLE_KEYS: Record<Role, keyof ThemeDefinition["typography"]> = {
  heading: "headingFontId",
  body: "bodyFontId",
  ui: "uiFontId",
};
const ROLE_VARS: Record<Role, string> = {
  heading: "--font-heading",
  body: "--font-body",
  ui: "--font-ui",
};

/** 依副檔名回 CSS `format()` 值。 */
function formatForUrl(url: string): string {
  const clean = url.split(/[?#]/)[0].toLowerCase();
  if (clean.endsWith(".woff2")) return "woff2";
  if (clean.endsWith(".woff")) return "woff";
  if (clean.endsWith(".ttf")) return "truetype";
  if (clean.endsWith(".otf")) return "opentype";
  return "woff2";
}

/** 字體名稱一律加引號（含空白/非 ASCII 時不加會被瀏覽器整條忽略）。 */
function quoteFamily(family: string): string {
  return `"${family.replace(/"/g, "")}"`;
}

/** 用 slug 或 uuid（id）比對目錄中的字體。 */
function resolveRole(idOrSlug: string | undefined, catalog: FontCatalog): FontCatalogEntry | undefined {
  if (!idOrSlug) return undefined;
  return catalog.fonts.find((f) => f.slug === idOrSlug || f.id === idOrSlug);
}

/** 產生單一字體所有字重的 @font-face。 */
function fontFaceCss(font: FontCatalogEntry): string {
  const rules: string[] = [];
  for (const weight of Object.keys(font.files)) {
    const url = font.files[weight];
    if (!url) continue;
    rules.push(
      [
        "@font-face {",
        `  font-family: ${quoteFamily(font.family)};`,
        `  font-style: normal;`,
        `  font-weight: ${weight};`,
        `  font-display: swap;`,
        `  src: url("${url}") format("${formatForUrl(url)}");`,
        "}",
      ].join("\n"),
    );
  }
  return rules.join("\n\n");
}

/** family 堆疊：`"<family>", <fallback_stack>`（fallback 缺省補 sans-serif）。 */
function familyStack(font: FontCatalogEntry): string {
  const fallback = font.fallback_stack && font.fallback_stack.trim()
    ? font.fallback_stack
    : "sans-serif";
  return `${quoteFamily(font.family)}, ${fallback}`;
}

/**
 * 把 def 選的字體注入頁面並設定 CSS 變數。
 *
 * @param def      目前套用（或預覽中）的主題定義
 * @param catalog  /api/fonts 回的目錄
 * @param target   要設 CSS 變數的元素（預設 document.documentElement；
 *                 主題工作室傳預覽容器 → 只有預覽套到字體）。
 *                 @font-face 一律注入 <head>（無法 scope）。
 */
export function loadThemeFonts(
  def: ThemeDefinition,
  catalog: FontCatalog,
  target?: HTMLElement | null,
): void {
  if (typeof document === "undefined") return;

  const el = target ?? document.documentElement;
  const faces: string[] = [];
  const links = new Set<string>();
  const seen = new Set<string>();

  for (const role of Object.keys(ROLE_KEYS) as Role[]) {
    const idOrSlug = def.typography?.[ROLE_KEYS[role]] as string | undefined;
    const font = resolveRole(idOrSlug, catalog);
    if (!font || !isUsable(font)) {
      // 解析不到 / 無檔無 css_url → 不動該變數（fall through 到 globals 的 --font-*）
      continue;
    }
    if (!seen.has(font.slug)) {
      seen.add(font.slug);
      if (font.css_url && font.css_url.trim()) {
        // 外部 webfont（Google Fonts 等）→ 用 <link> 載，供應商做子集/供檔
        links.add(font.css_url.trim());
      } else {
        const css = fontFaceCss(font);
        if (css) faces.push(css);
      }
    }
    el.style.setProperty(ROLE_VARS[role], familyStack(font));
  }

  // 外部 webfont <link> 同步（冪等：加缺移多）
  syncFontLinks(links);

  // 自架檔 @font-face：整份取代 <style id="sr-theme-fonts">（冪等）
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (faces.length === 0) {
    if (style) style.textContent = "";
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = faces.join("\n\n");
}
