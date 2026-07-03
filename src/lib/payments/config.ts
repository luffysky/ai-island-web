/**
 * 金流設定：Z幣儲值包、Pro 訂閱方案、可用金流商（依 env 決定）、手續費資訊。
 * 匯率 1:10（NT$1 = 10 Z幣），儲值越多送越多。金額都以「新台幣元」計。
 */

export type PaymentProvider = "ecpay" | "newebpay" | "stripe";
export type PaymentMethod = "credit" | "atm" | "cvs" | "linepay" | "applepay";

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

export type ProPlan = {
  id: string;
  label: string;
  twd: number;
  period: "month" | "year";
  months: number;
  perMonth: number;
  popular?: boolean;
};

export const PRO_PLANS: ProPlan[] = [
  { id: "pro_monthly", label: "Pro 月訂閱", twd: 149, period: "month", months: 1, perMonth: 149 },
  { id: "pro_yearly", label: "Pro 年訂閱", twd: 1490, period: "year", months: 12, perMonth: 124, popular: true },
];

export function getProPlan(id: string): ProPlan | undefined {
  return PRO_PLANS.find((p) => p.id === id);
}

/** Pro 解鎖項目（顯示用；實際 gate 由各功能查 isPro）。 */
export const PRO_PERKS = [
  "無限 AI 對話（綠寶 / 導師 / 創作引擎）",
  "AI 即時批改作業與程式碼",
  "進階創作引擎工具 + 多工作室",
  "成長分析與 AI 學習教練週報",
  "專屬寵物造型 + 每月 Z幣回饋",
];

// ── 金流商可用性：對應 env 有沒有設好金鑰 ──────────────────────────
export function providerEnabled(p: PaymentProvider): boolean {
  if (p === "ecpay") return !!(process.env.ECPAY_MERCHANT_ID && process.env.ECPAY_HASH_KEY && process.env.ECPAY_HASH_IV);
  if (p === "newebpay") return !!(process.env.NEWEBPAY_MERCHANT_ID && process.env.NEWEBPAY_HASH_KEY && process.env.NEWEBPAY_HASH_IV);
  if (p === "stripe") return !!process.env.STRIPE_SECRET_KEY;
  return false;
}

export function enabledProviders(): PaymentProvider[] {
  return (["ecpay", "newebpay", "stripe"] as PaymentProvider[]).filter(providerEnabled);
}

/** 各金流商支援的付款方式（給前端付款方式選擇器）。 */
export const PROVIDER_METHODS: Record<PaymentProvider, PaymentMethod[]> = {
  ecpay: ["credit", "atm", "cvs"],
  newebpay: ["credit", "atm", "cvs"],
  stripe: ["credit"],
};

export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  ecpay: "綠界 ECPay",
  newebpay: "藍新 NewebPay",
  stripe: "Stripe（海外卡）",
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
};

export const CURRENCY = "TWD";
