/**
 * 演算法 #4 — 動態 XP
 *
 * 依當前狀態調整 reward、讓「該獎的多獎、該回的多回」：
 *  - 連勝越長：略加成（避免歐皇飆太快、上限 1.4x）
 *  - 久未活躍剛回來：comeback bonus（>= 7 天 1.5x、>= 30 天 2x）
 *  - 新手前 10 個 lesson：1.3x（加速第一印象）
 *  - 週末（六日）：1.2x
 *  - 生日當天：2x
 *  - 雙倍 buff（買道具）：×2（multiplicative）
 */

export type XpContext = {
  baseXp: number;
  streakDays: number;          // profiles.streak_days
  daysSinceLastActive: number; // 0 = 今天有活躍
  totalLessonsDone: number;
  isWeekend?: boolean;         // 由 caller 傳（避免 timezone 在 lib 內猜）
  isBirthday?: boolean;
  hasDoubleCoinBuff?: boolean; // island 雙倍幸運 buff
};

export type XpDecision = {
  finalXp: number;
  multiplier: number;          // 總乘數
  parts: Array<{ name: string; factor: number; note?: string }>;
};

export function calcXp(ctx: XpContext): XpDecision {
  const parts: Array<{ name: string; factor: number; note?: string }> = [];
  let multiplier = 1;

  // 連勝（log-ish 曲線、不暴力線性）
  const streakBoost = ctx.streakDays >= 30
    ? 1.4 : ctx.streakDays >= 14
    ? 1.25 : ctx.streakDays >= 7
    ? 1.15 : ctx.streakDays >= 3
    ? 1.05 : 1;
  if (streakBoost > 1) parts.push({ name: "streak", factor: streakBoost, note: `${ctx.streakDays} 天` });
  multiplier *= streakBoost;

  // comeback bonus
  const cb = ctx.daysSinceLastActive >= 30 ? 2 : ctx.daysSinceLastActive >= 14 ? 1.7 : ctx.daysSinceLastActive >= 7 ? 1.5 : 1;
  if (cb > 1) parts.push({ name: "comeback", factor: cb, note: `${ctx.daysSinceLastActive} 天未回` });
  multiplier *= cb;

  // 新手
  if (ctx.totalLessonsDone < 10) {
    parts.push({ name: "newbie", factor: 1.3, note: "前 10 lesson" });
    multiplier *= 1.3;
  }

  // 週末
  if (ctx.isWeekend) {
    parts.push({ name: "weekend", factor: 1.2 });
    multiplier *= 1.2;
  }

  // 生日
  if (ctx.isBirthday) {
    parts.push({ name: "birthday", factor: 2 });
    multiplier *= 2;
  }

  // 雙倍 buff
  if (ctx.hasDoubleCoinBuff) {
    parts.push({ name: "double_coin_buff", factor: 2 });
    multiplier *= 2;
  }

  // 安全上限 5x（避免疊到天文數字）
  if (multiplier > 5) multiplier = 5;

  return {
    finalXp: Math.round(ctx.baseXp * multiplier),
    multiplier,
    parts,
  };
}

/**
 * 給 server 用：算出今天是否週末（台北日）
 */
export function isTaipeiWeekend(now: number = Date.now()): boolean {
  const tpe = new Date(now + 8 * 3600_000);
  const day = tpe.getUTCDay(); // 0 sun, 6 sat
  return day === 0 || day === 6;
}
