// 24 節氣（壽星公式·21 世紀常數，適用 2000–2099）。純函式、可測；精度 ±1 天（少數例外年）。
// 用途：農民曆月曆標節氣、顯示下一個節氣。零依賴、零成本。

export const SOLAR_TERMS = [
  "小寒", "大寒", "立春", "雨水", "驚蟄", "春分", "清明", "穀雨",
  "立夏", "小滿", "芒種", "夏至", "小暑", "大暑", "立秋", "處暑",
  "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
] as const;

// 每個節氣的 C 常數（壽星公式，21 世紀）。i=0 小寒 … i=23 冬至。
const C21 = [
  5.4055, 20.12, 3.87, 18.73, 5.63, 20.646, 4.81, 20.1,
  5.52, 21.04, 5.678, 21.37, 7.108, 22.83, 7.5, 23.13,
  7.646, 23.042, 8.318, 23.438, 7.438, 22.36, 7.18, 21.94,
];

/** 節氣 i（0=小寒…）落在西元 year 的哪一天（該節氣所屬月份的日）。月份 = floor(i/2)+1。 */
export function solarTermDay(year: number, i: number): number {
  const D = 0.2422;
  const Y = year % 100;
  return Math.floor(Y * D + C21[i]) - Math.floor((Y - 1) / 4);
}

export type SolarTerm = { name: string; month: number; day: number; index: number };

/** 某西元月（1-based）的兩個節氣。 */
export function solarTermsInMonth(year: number, month1: number): SolarTerm[] {
  const out: SolarTerm[] = [];
  for (const i of [2 * (month1 - 1), 2 * (month1 - 1) + 1]) {
    out.push({ name: SOLAR_TERMS[i], month: month1, day: solarTermDay(year, i), index: i });
  }
  return out;
}

/** 從 today 起算「下一個節氣」（含當天）。回 { name, date, daysUntil }。 */
export function nextSolarTerm(today: Date): { name: string; date: Date; daysUntil: number } {
  const y = today.getFullYear();
  const t0 = new Date(y, today.getMonth(), today.getDate()).getTime();
  const candidates: { name: string; date: Date }[] = [];
  for (let i = 0; i < 24; i++) {
    const m = Math.floor(i / 2) + 1;
    candidates.push({ name: SOLAR_TERMS[i], date: new Date(y, m - 1, solarTermDay(y, i)) });
  }
  // 跨年：補下一年前幾個節氣
  for (let i = 0; i < 4; i++) {
    const m = Math.floor(i / 2) + 1;
    candidates.push({ name: SOLAR_TERMS[i], date: new Date(y + 1, m - 1, solarTermDay(y + 1, i)) });
  }
  const hit = candidates
    .filter((c) => c.date.getTime() >= t0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const daysUntil = Math.round((hit.date.getTime() - t0) / 86400000);
  return { name: hit.name, date: hit.date, daysUntil };
}
