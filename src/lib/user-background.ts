// 學員個人背景：預設漸層 + 自訂上傳圖片
export const BG_PRESETS: { key: string; label: string; css: string }[] = [
  { key: "gradient-aurora", label: "極光", css: "linear-gradient(135deg,#0a0e14,#13263b,#0a2e2a)" },
  { key: "gradient-sunset", label: "夕陽", css: "linear-gradient(135deg,#1a0e14,#3b1326,#2e1a0a)" },
  { key: "gradient-ocean", label: "海洋", css: "linear-gradient(135deg,#070a14,#0a1e3b,#0a2e3b)" },
  { key: "gradient-forest", label: "森林", css: "linear-gradient(135deg,#070f0a,#0f2e1a,#1a2e0a)" },
  { key: "gradient-sakura", label: "櫻花", css: "linear-gradient(135deg,#140a10,#3b1330,#2e0a1a)" },
  { key: "gradient-mono", label: "石墨", css: "linear-gradient(135deg,#0a0a0c,#16161a,#0a0a0c)" },
];

export const BG_PRESET_KEYS = new Set(BG_PRESETS.map((p) => p.key));

/** 把存的 background 值（preset key / 圖片 URL / null）轉成 CSS background 值 */
export function backgroundCss(bg?: string | null): string | null {
  if (!bg) return null;
  const p = BG_PRESETS.find((x) => x.key === bg);
  if (p) return p.css;
  if (/^https?:\/\//.test(bg) || bg.startsWith("/")) {
    return `url("${bg.replace(/["\\]/g, "")}") center / cover no-repeat fixed`;
  }
  return null;
}

/** 驗證一個 background 值是否允許（preset / 站內外圖片 URL / 空字串清除） */
export function isValidBackground(bg: string): boolean {
  return bg === "" || BG_PRESET_KEYS.has(bg) || /^https?:\/\//.test(bg) || bg.startsWith("/");
}
