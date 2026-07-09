// AI 額度設定（可調）。免費模型成本≈0 → 免費放很大方；高階(Claude/GPT/Gemini)才嚴格。
export const AI_FREE_DAILY = 100;          // 免費用戶：免費/中階模型每日免費次數
export const AI_HIGH_DAILY_PLUS = 20;      // Plus：高階模型每日次數
export const AI_HIGH_DAILY_PRO = 100;      // Pro：高階模型每日次數
export const AI_ZCOIN_FREE_OVERFLOW = 10;  // 免費額度用完後、每次續用扣多少 Z幣（便宜）
export const AI_ZCOIN_HIGH_OVERFLOW = 50;  // 高階額度用完後、每次加購扣多少 Z幣（cover 成本）

export function highDailyFor(subTier: string | null | undefined): number {
  return subTier === "pro" ? AI_HIGH_DAILY_PRO : AI_HIGH_DAILY_PLUS;
}
