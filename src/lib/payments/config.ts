/**
 * 金流設定：Z幣儲值包、Pro 訂閱方案、可用金流商（依 env 決定）、手續費資訊。
 * 匯率 1:10（NT$1 = 10 Z幣），儲值越多送越多。金額都以「新台幣元」計。
 */

export type PaymentProvider = "ecpay" | "newebpay" | "stripe" | "lemonsqueezy" | "paddle";
export type PaymentMethod = "credit" | "atm" | "cvs" | "linepay" | "applepay";

// 海外客戶用 Merchant-of-Record（Lemon Squeezy / Paddle）以 USD 收款；TWD→USD 匯率（env 可調，預設 32）。
export function morUsdRate(): number {
  const r = Number(process.env.MOR_USD_RATE);
  return Number.isFinite(r) && r > 0 ? r : 32;
}
export function twdToUsdCents(twd: number): number {
  return Math.max(50, Math.round((twd / morUsdRate()) * 100)); // 至少 US$0.50
}

export type ZcoinPackage = {
  id: string;
  twd: number;      // 付多少新台幣
  zcoin: number;    // 拿多少 Z幣（含加碼）
  bonusPct: number; // 加碼百分比（顯示用）
  popular?: boolean;
};

/** 1:10 基底 + 越多送越多。base = twd*10。 */
export const ZCOIN_PACKAGES: ZcoinPackage[] = [
  { id: "z100", twd: 100, zcoin: 1000, bonusPct: 0 },
  { id: "z300", twd: 300, zcoin: 3300, bonusPct: 10 },
  { id: "z500", twd: 500, zcoin: 5750, bonusPct: 15, popular: true },
  { id: "z1000", twd: 1000, zcoin: 12000, bonusPct: 20 },
  { id: "z2000", twd: 2000, zcoin: 25000, bonusPct: 25 },
];

export function getZcoinPackage(id: string): ZcoinPackage | undefined {
  return ZCOIN_PACKAGES.find((p) => p.id === id);
}

export type SubTier = "plus" | "pro";

export type ProPlan = {
  id: string;
  label: string;
  tier: SubTier;        // plus=學習版 / pro=求職版
  twd: number;          // 台幣定價（海外自動用 twdToUsdCents 換算 USD、不另收美金原價）
  period: "month" | "year";
  months: number;
  perMonth: number;
  popular?: boolean;
};

// 兩層訂閱 × 月/年。台幣為定價基準；海外(MoR)自動換算 USD（NT$149≈US$4.7、NT$349≈US$10.9）。
export const PRO_PLANS: ProPlan[] = [
  { id: "plus_monthly", label: "學習 Plus・月", tier: "plus", twd: 149, period: "month", months: 1, perMonth: 149 },
  { id: "plus_yearly", label: "學習 Plus・年", tier: "plus", twd: 1490, period: "year", months: 12, perMonth: 124 },
  { id: "pro_monthly", label: "求職 Pro・月", tier: "pro", twd: 349, period: "month", months: 1, perMonth: 349, popular: true },
  { id: "pro_yearly", label: "求職 Pro・年", tier: "pro", twd: 2990, period: "year", months: 12, perMonth: 249 },
];

export function getProPlan(id: string): ProPlan | undefined {
  return PRO_PLANS.find((p) => p.id === id);
}

/** 由方案 id 取訂閱層級（給日後 tier-aware gating 用；目前 isPro 仍為布林）。 */
export function planTier(id: string): SubTier | undefined {
  return getProPlan(id)?.tier;
}

/** 學習 Plus 解鎖項目（顯示用）。 */
export const PLUS_PERKS = [
  "AI 導師更多每日次數 + 中階模型",
  "筆記全功能（3 層知識樹 / 間隔複習 SRS / 多人協作）",
  "離線閱讀、無廣告、每日測驗加抽",
];

/** 求職 Pro 解鎖項目（含 Plus 全部；顯示用。實際 gate 由各功能查 isPro / 日後查 tier）。 */
export const PRO_PERKS = [
  "【含 學習 Plus 全部】",
  "AI 高階模型（Opus / GPT-4o 等）高額度",
  "AI 模擬面試 + 履歷 / 作品集工具",
  "完課證書優先發放 + 優先客服",
  "進階創作引擎工具 + 多工作室",
  "專屬寵物造型 + 每月 Z幣回饋",
];

// ── 金流商可用性：對應 env 有沒有設好金鑰 ──────────────────────────
export function providerEnabled(p: PaymentProvider): boolean {
  if (p === "ecpay") return !!(process.env.ECPAY_MERCHANT_ID && process.env.ECPAY_HASH_KEY && process.env.ECPAY_HASH_IV);
  if (p === "newebpay") return !!(process.env.NEWEBPAY_MERCHANT_ID && process.env.NEWEBPAY_HASH_KEY && process.env.NEWEBPAY_HASH_IV);
  if (p === "stripe") return !!process.env.STRIPE_SECRET_KEY;
  if (p === "lemonsqueezy") return !!(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID && process.env.LEMONSQUEEZY_VARIANT_ID);
  if (p === "paddle") return !!process.env.PADDLE_API_KEY;
  return false;
}

export function enabledProviders(): PaymentProvider[] {
  return (["ecpay", "newebpay", "stripe", "lemonsqueezy", "paddle"] as PaymentProvider[]).filter(providerEnabled);
}

/** 各金流商支援的付款方式（給前端付款方式選擇器）。 */
export const PROVIDER_METHODS: Record<PaymentProvider, PaymentMethod[]> = {
  ecpay: ["credit", "atm", "cvs"],
  newebpay: ["credit", "atm", "cvs"],
  stripe: ["credit"],
  lemonsqueezy: ["credit"],
  paddle: ["credit"],
};

export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  ecpay: "綠界 ECPay",
  newebpay: "藍新 NewebPay",
  stripe: "Stripe（海外卡）",
  lemonsqueezy: "Lemon Squeezy（海外・USD）",
  paddle: "Paddle（海外・USD）",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  credit: "信用卡",
  atm: "ATM 轉帳",
  cvs: "超商代碼",
  linepay: "LINE Pay",
  applepay: "Apple Pay",
};

/** 手續費資訊（大約，顯示/後台參考用；實際依合約）。 */
export const PROVIDER_FEE_NOTE: Record<PaymentProvider, string> = {
  ecpay: "信用卡約 2.75%；ATM/超商每筆固定小額",
  newebpay: "信用卡約 2.75%；ATM/超商每筆固定小額",
  stripe: "本地卡 2.9%＋NT$10；國際卡再＋1.5%",
  lemonsqueezy: "MoR 代收全球卡＋代繳稅，約 5%＋US$0.50/筆",
  paddle: "MoR 代收全球卡＋代繳稅，約 5%＋US$0.50/筆",
};

export const CURRENCY = "TWD";
