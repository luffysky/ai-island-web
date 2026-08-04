// 月相計算（純函式、可測）。用已知新月 + 朔望月週期推算，零外部依賴。
const LUNAR = 29.53058867;                          // 朔望月（天）
const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // 已知新月（天）

const PHASES = [
  { emoji: "🌑", name: "新月" },
  { emoji: "🌒", name: "眉月" },
  { emoji: "🌓", name: "上弦月" },
  { emoji: "🌔", name: "盈凸月" },
  { emoji: "🌕", name: "滿月" },
  { emoji: "🌖", name: "虧凸月" },
  { emoji: "🌗", name: "下弦月" },
  { emoji: "🌘", name: "殘月" },
];

/** 傳入時間（ms）→ 月相 emoji / 名稱 / 照亮百分比。 */
export function moonPhase(dateMs: number): { emoji: string; name: string; illum: number } {
  const days = dateMs / 86400000;
  const age = (((days - KNOWN_NEW) % LUNAR) + LUNAR) % LUNAR;
  const frac = age / LUNAR; // 0..1
  const idx = Math.floor(frac * 8 + 0.5) % 8;
  const illum = Math.round(((1 - Math.cos(2 * Math.PI * frac)) / 2) * 100);
  return { ...PHASES[idx], illum };
}
