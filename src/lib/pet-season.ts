// 季節 + 國曆節日偵測（不含農曆、避免引入 lunar 套件）
// 用 client local time

export type Season = "spring" | "summer" | "autumn" | "winter";

export type Holiday =
  | "newyear"      // 1/1 元旦
  | "valentine"    // 2/14 西洋情人節
  | "white-day"    // 3/14 白色情人節
  | "children"     // 4/4 兒童節 / 清明前後
  | "labor"        // 5/1 勞動節
  | "qixi"         // 7 月七夕 - 用國曆 8/7 ± 概略
  | "halloween"    // 10/31
  | "national"     // 10/10 雙十
  | "christmas-eve"// 12/24
  | "christmas"    // 12/25
  | "newyear-eve"; // 12/31

export function getSeason(date: Date = new Date()): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export function getHoliday(date: Date = new Date()): Holiday | null {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 1 && d === 1) return "newyear";
  if (m === 2 && d === 14) return "valentine";
  if (m === 3 && d === 14) return "white-day";
  if (m === 4 && d === 4) return "children";
  if (m === 5 && d === 1) return "labor";
  if (m === 8 && d >= 6 && d <= 8) return "qixi";
  if (m === 10 && d === 10) return "national";
  if (m === 10 && d === 31) return "halloween";
  if (m === 12 && d === 24) return "christmas-eve";
  if (m === 12 && d === 25) return "christmas";
  if (m === 12 && d === 31) return "newyear-eve";
  return null;
}

// 寵物頭頂裝飾（節日特定）
export function getHeadDecoration(date: Date = new Date()): string | null {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // 聖誕季 12/15-12/26 都戴聖誕帽
  if (m === 12 && d >= 15 && d <= 26) return "🎅";
  // 萬聖週 10/25-10/31
  if (m === 10 && d >= 25) return "🎃";
  // 新年週 12/29 - 1/3
  if ((m === 12 && d >= 29) || (m === 1 && d <= 3)) return "🎉";
  // 情人節 2/13-14
  if (m === 2 && (d === 13 || d === 14)) return "💝";
  // 國慶 10/9-10
  if (m === 10 && (d === 9 || d === 10)) return "🇹🇼";
  return null;
}
