/** 字型上傳的共用規則：瀏覽器直傳 Storage（Vercel 請求上限 4.5 MB，字型檔過不了 API）。 */
export const FONT_BUCKET = "fonts";
export const FONT_SLUG_RE = /^[a-z0-9-]+$/;
const MB = 1024 * 1024;
export const FONT_MAX_MB = 15;
export const FONT_MAX_SIZE = FONT_MAX_MB * MB;

export const FONT_CONTENT_TYPE: Record<string, string> = {
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

export function fontExtOf(name: string): string | null {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  const ext = m?.[1]?.toLowerCase();
  return ext && ext in FONT_CONTENT_TYPE ? ext : null;
}

export function normalizeFontWeight(raw: unknown): number {
  const n = Number(raw ?? 400);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 400;
}

export function fontObjectPath(slug: string, weight: number, ext: string): string {
  return `${slug}/${weight}.${ext}`;
}
