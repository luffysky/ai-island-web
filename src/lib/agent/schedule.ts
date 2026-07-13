// 排程時間計算：hour/weekday 都用「台灣時間」(UTC+8、無日光節約)，next_run_at 存絕對 UTC。
// 抽出來獨立、方便單元測試（見 schedule.test.ts）。

export type Frequency = "daily" | "weekly";
const TW_OFFSET_MS = 8 * 3600_000;

/**
 * 算下一次該跑的絕對時間（UTC ISO 字串）。
 * @param frequency daily｜weekly
 * @param hour      0-23，台灣時間的小時
 * @param weekday   0=週日..6=週六（只有 weekly 用；daily 忽略）
 * @param fromMs    從哪個時間點往後算（預設 now）——用 Date.now() 由呼叫端傳入以利測試
 */
export function computeNextRun(frequency: Frequency, hour: number, weekday: number | null, fromMs: number): string {
  const h = Math.min(Math.max(Math.round(hour), 0), 23);
  // 把 fromMs 位移成「台灣牆上時鐘」，之後用 UTC getter 讀出來的就是台灣的年月日時分。
  const twNowMs = fromMs + TW_OFFSET_MS;
  const tw = new Date(twNowMs);

  let candTw: number; // 候選時間，一樣以「台灣牆鐘當成 UTC」表示
  if (frequency === "weekly" && weekday != null) {
    const wd = Math.min(Math.max(Math.round(weekday), 0), 6);
    const add = (wd - tw.getUTCDay() + 7) % 7;
    candTw = Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate() + add, h, 0, 0);
    if (candTw <= twNowMs) candTw += 7 * 86400_000;
  } else {
    candTw = Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate(), h, 0, 0);
    if (candTw <= twNowMs) candTw += 86400_000;
  }
  // 台灣牆鐘 → 真實 UTC
  return new Date(candTw - TW_OFFSET_MS).toISOString();
}

const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"];

/** 人話描述：如「每天 09:00」「每週三 20:00」 */
export function describeSchedule(frequency: Frequency, hour: number, weekday: number | null): string {
  const hh = String(Math.min(Math.max(Math.round(hour), 0), 23)).padStart(2, "0");
  if (frequency === "weekly" && weekday != null) return `每週${WEEKDAY_ZH[Math.min(Math.max(weekday, 0), 6)]} ${hh}:00`;
  return `每天 ${hh}:00`;
}
