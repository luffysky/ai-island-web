/**
 * 時間格式化 — 全站用台灣時區（UTC+8）。
 *
 * 為什麼不直接 toLocaleString('zh-TW')：
 *   - 預設使用「瀏覽器時區」、伺服器端是 UTC、會差 8 小時
 *   - 顯示給林董看的「最後活躍」「註冊時間」要看到台北時間
 *
 * 用法：
 *   formatTW(date)         → '2026-05-23 14:30'
 *   formatTW(date, true)   → '2026-05-23 14:30:00'
 *   formatTWDate(date)     → '2026-05-23'
 *   formatTWRelative(date) → '3 分鐘前' / '昨天' / '2026-05-23'
 */

const TZ = "Asia/Taipei";

export function formatTW(date: string | Date | null | undefined, withSeconds = false): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-TW", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  });
}

export function formatTWDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("zh-TW", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatTWTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("zh-TW", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 相對時間（30 秒前 / 5 分鐘前 / 昨天 / 2026-05-23）
 * 超過 7 天回絕對日期。
 */
export function formatTWRelative(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return sec <= 1 ? "剛剛" : `${sec} 秒前`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.round(hr / 24);
  if (day === 1) return "昨天";
  if (day < 7) return `${day} 天前`;
  return formatTWDate(d);
}
