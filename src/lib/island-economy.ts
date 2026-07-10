// 島嶼經濟 — 伺服器權威的「每日賺幣上限」防刷。
//
// 背景：島嶼庫存 / 魚種存在前端 localStorage（見 tech-inventory「島嶼進度存 localStorage」），
// 伺服器無法逐筆驗證「你真的釣到龍魚 / 真的有 200 水晶」。在把整個島嶼狀態搬上伺服器之前，
// 這裡用「每日島嶼賺幣總量上限」把可提取金額鎖在正常遊玩量級 —— 就算前端謊報，一天最多也只能拿 CAP。
//
// grant_zcoin 會把每筆入帳寫進 coin_transactions（reason + created_at），所以可即時加總「今天島嶼賺了多少」。
// phase 2（需同步改前端）：釣魚魚種改由伺服器擲骰決定、前端顯示伺服器回傳結果 → 連單筆 outcome 也權威化。

/** 島嶼「持續型」賺幣（釣魚 + 兌換資源）每日上限。正常玩一天遠低於此；超過視為刷幣。 */
export const ISLAND_DAILY_ZCOIN_CAP = 500;

/**
 * 今天（當地 00:00 起）此使用者從島嶼「持續型」來源賺到的 Z 幣總量。
 * 只算會被前端灌水的來源：釣魚 island_fish*、兌換 island_harvest*；
 * 一次性且以 reason 去重的來源（成就 / 寶箱 / 占卜 / 任務 / 村民）不納入、不影響其上限。
 */
export async function islandEarnedToday(admin: any, userId: string): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data } = await admin
    .from("coin_transactions")
    .select("amount")
    .eq("user_id", userId)
    .gt("amount", 0)
    .or("reason.like.island_fish*,reason.like.island_harvest*")
    .gte("created_at", since.toISOString());
  return ((data ?? []) as any[]).reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

/**
 * 檢查「再賺 want 這麼多」會不會超過每日上限；回可實際入帳的量（0 = 已達上限）。
 * 用法：先算出這次想給多少 → capIslandReward → 只 grant 回傳值、>0 才 grant。
 */
export async function capIslandReward(admin: any, userId: string, want: number): Promise<number> {
  if (want <= 0) return 0;
  const used = await islandEarnedToday(admin, userId);
  const room = Math.max(0, ISLAND_DAILY_ZCOIN_CAP - used);
  return Math.min(want, room);
}
