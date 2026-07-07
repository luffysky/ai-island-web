/**
 * Lemon Squeezy（Merchant of Record，海外卡・USD）adapter。
 * checkout：呼叫 /v1/checkouts 建 hosted checkout（custom_price 覆寫金額、custom 帶 order_no）→ 回跳轉網址。
 * verify：驗 X-Signature（HMAC-SHA256 hex）→ order_created & paid 算成功。
 * 需 env：LEMONSQUEEZY_API_KEY / LEMONSQUEEZY_STORE_ID / LEMONSQUEEZY_VARIANT_ID / LEMONSQUEEZY_WEBHOOK_SECRET
 * 金額以 USD 收（TWD→USD 用 MOR_USD_RATE）。
 */
import crypto from "crypto";
import type { Order } from "../orders";
import { twdToUsdCents } from "../config";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet").replace(/\/$/, "");
}

export async function lemonSqueezyCheckout(order: Order): Promise<{ kind: "redirect"; url: string }> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY || "";
  const storeId = process.env.LEMONSQUEEZY_STORE_ID || "";
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID || "";
  const usdCents = twdToUsdCents(order.amount);

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: usdCents, // 覆寫價格（該 variant 需允許 pay-what-you-want / 自訂價）
        product_options: {
          name: order.product_name.slice(0, 120),
          redirect_url: `${siteUrl()}/store/result?no=${order.order_no}`,
        },
        checkout_data: {
          custom: { order_no: order.order_no },
        },
      },
      relationships: {
        store: { data: { type: "stores", id: String(storeId) } },
        variant: { data: { type: "variants", id: String(variantId) } },
      },
    },
  };

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const j: any = await res.json().catch(() => ({}));
  const url = j?.data?.attributes?.url;
  if (!res.ok || !url) throw new Error(`lemonsqueezy_checkout_failed: ${j?.errors?.[0]?.detail ?? res.status}`);
  return { kind: "redirect", url };
}

/** 驗 webhook（X-Signature = HMAC-SHA256 hex of raw body）→ 回付款結果。 */
export function lemonSqueezyVerify(rawBody: string, signature: string): { ok: boolean; orderNo: string; gatewayRef: string } {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const sig = String(signature || "");
  const good = sig.length === digest.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sig));
  if (!good) return { ok: false, orderNo: "", gatewayRef: "" };

  let payload: any = {};
  try { payload = JSON.parse(rawBody); } catch { return { ok: false, orderNo: "", gatewayRef: "" }; }
  const eventName = payload?.meta?.event_name ?? "";
  const orderNo = payload?.meta?.custom_data?.order_no ?? "";
  const status = payload?.data?.attributes?.status ?? "";
  const paid = (eventName === "order_created" && status === "paid") || eventName === "subscription_payment_success";
  return { ok: !!paid && !!orderNo, orderNo: String(orderNo), gatewayRef: String(payload?.data?.id ?? "") };
}
