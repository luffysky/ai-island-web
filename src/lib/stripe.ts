/**
 * Stripe lib — server-only
 *
 * 環境變數需要：
 *   STRIPE_SECRET_KEY        sk_live_... / sk_test_...
 *   STRIPE_WEBHOOK_SECRET    whsec_... (Stripe Dashboard → Webhooks → 拿)
 *   STRIPE_PRICE_ID_MONTHLY  price_xxx 月訂方案
 *   STRIPE_PRICE_ID_YEARLY   price_xxx 年訂方案
 *   STRIPE_PRICE_ID_SINGLE   price_xxx 單章方案（選用）
 *
 * 林董：「訂閱付款 — VIP 才能真的賣」
 */
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as any });
  return _stripe;
}

export type PlanKey = "monthly" | "yearly" | "single";

export function priceIdForPlan(plan: PlanKey): string | null {
  switch (plan) {
    case "monthly": return process.env.STRIPE_PRICE_ID_MONTHLY ?? null;
    case "yearly":  return process.env.STRIPE_PRICE_ID_YEARLY ?? null;
    case "single":  return process.env.STRIPE_PRICE_ID_SINGLE ?? null;
  }
}

export function planFromPriceId(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_ID_YEARLY) return "yearly";
  if (priceId === process.env.STRIPE_PRICE_ID_SINGLE) return "single";
  return null;
}
