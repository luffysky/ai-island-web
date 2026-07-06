/**
 * Stripe 金流 adapter（Checkout Session，一次性付款；Pro 也用一次性、由我們自行延展到期日）。
 * 需 env：STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
 * TWD 非零位小數幣別 → unit_amount = 元 × 100。
 */
import Stripe from "stripe";
import type { Order } from "../orders";

let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  return _stripe;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet").replace(/\/$/, "");
}

export async function stripeCheckout(order: Order): Promise<{ kind: "redirect"; url: string }> {
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    // 不寫死 payment_method_types → Stripe 自動帶入 Dashboard 啟用的付款方式（含 Stripe Link）。
    line_items: [{
      price_data: { currency: "twd", unit_amount: order.amount * 100, product_data: { name: order.product_name } },
      quantity: 1,
    }],
    metadata: { order_no: order.order_no },
    client_reference_id: order.order_no,
    success_url: `${siteUrl()}/store/result?no=${order.order_no}`,
    cancel_url: `${siteUrl()}/store?canceled=1`,
  });
  return { kind: "redirect", url: session.url || `${siteUrl()}/store?err=stripe` };
}

/** 用 webhook 簽章驗證。回付款結果。constructEvent 失敗會 throw。 */
export function stripeVerify(rawBody: string, signature: string): { ok: boolean; orderNo: string; gatewayRef: string; amount?: number } {
  const event = stripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET || "");
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    return {
      ok: s.payment_status === "paid",
      orderNo: String(s.metadata?.order_no || s.client_reference_id || ""),
      gatewayRef: String(s.payment_intent || s.id || ""),
      amount: s.amount_total != null ? s.amount_total / 100 : undefined,
    };
  }
  return { ok: false, orderNo: "", gatewayRef: "" };
}
