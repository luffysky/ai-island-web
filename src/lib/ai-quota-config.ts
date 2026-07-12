// AI 額度設定（可調）。免費模型成本≈0 → 免費放很大方；高階(Claude/GPT/Gemini)才嚴格。
export const AI_FREE_DAILY = 100;          // 免費用戶：免費/中階模型每日免費次數
export const AI_HIGH_DAILY_FREE = 3;       // 免費用戶：每日可用少量高階模型（看圖 / 難題自動升級）
export const AI_HIGH_DAILY_PLUS = 20;      // Plus：高階模型每日次數
export const AI_HIGH_DAILY_PRO = 100;      // Pro：高階模型每日次數
export const AI_ZCOIN_FREE_OVERFLOW = 2;   // 免費額度用完後、每次續用扣多少 Z幣（免費模型成本≈0、很便宜）
export const AI_ZCOIN_HIGH_OVERFLOW = 20;  // 高階額度用完後、每次加購扣多少 Z幣（約 NT$2、cover 一次高階呼叫成本）

export function highDailyFor(subTier: string | null | undefined): number {
  if (subTier === "pro") return AI_HIGH_DAILY_PRO;
  if (subTier === "plus") return AI_HIGH_DAILY_PLUS;
  return AI_HIGH_DAILY_FREE;               // 免費（含未訂閱）：每日 3 次高階
}

// 創作者島嶼「綠寶」每日軟上限（防濫用）：決策＝聊天保持免費、只擋高階模型。
// 預設 0 = 關閉（不限次數）。濫用出現再把它設成正整數（如 200）即生效；正式收費前不動。
export const CREATOR_DAILY_SOFT_CAP = 0;
