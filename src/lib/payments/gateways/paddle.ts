/**
 * Paddle（Billing v2，Merchant of Record，海外卡・USD）adapter。
 * checkout：建 transaction（非目錄價、自訂 unit_price）→ 回 data.checkout.url 跳轉。
 * verify：驗 Paddle-Signature（ts + h1 = HMAC-SHA256）→ transaction.completed 算成功。
 * 需 env：PADDLE_API_KEY / PADDLE_PRODUCT_ID / PADDLE_WEBHOOK_SECRET（PADDLE_SANDBOX=1 用測試站）
 * ⚠️ 要拿到 checkout.url，Paddle 後台需先設「default payment link」(Checkout settings)。
 */
import crypto from "crypto";
import type { Order } from "../orders";
import { twdToUsdCents } from "../config";

function apiBase(): string {
  return process.env.PADDLE_SANDBOX === "1" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
}

export async function paddleCheckout(order: Order): Promise<{ kind: "redirect"; url: string }> {
  const apiKey = process.env.PADDLE_API_KEY || "";
  const productId = process.env.PADDLE_PRODUCT_ID || "";
  const usdCents = twdToUsdCents(order.amount);

  const body = {
    items: [
      {
        quantity: 1,
        price: {
          description: order.product_name.slice(0, 200),
          product_id: productId,
          unit_price: { amount: String(usdCents), currency_code: "USD" },
        },
      },
    ],
    custom_data: { order_no: order.order_no },
    collection_mode: "automatic",
  };

  const res = await fetch(`${apiBase()}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const j: any = await res.json().catch(() => ({}));
  const url = j?.data?.checkout?.url;
  if (!res.ok || !url) throw new Error(`paddle_checkout_failed: ${j?.error?.detail ?? res.status}`);
  return { kind: "redirect", url };
}

/** 驗 webhook（Paddle-Signature: "ts=..;h1=.."，h1 = HMAC-SHA256 of `${ts}:${rawBody}`）→ 回付款結果。 */
export function paddleVerify(rawBody: string, signatureHeader: string): { ok: boolean; orderNo: string; gatewayRef: string } {
  const secret = process.env.PADDLE_WEBHOOK_SECRET || "";
  const parts: Record<string, string> = {};
  for (const kv of String(signatureHeader || "").split(";")) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const ts = parts.ts, h1 = parts.h1;
  if (!ts || !h1) return { ok: false, orderNo: "", gatewayRef: "" };
  const digest = crypto.createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  const good = h1.length === digest.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(h1));
  if (!good) return { ok: false, orderNo: "", gatewayRef: "" };

  let payload: any = {};
  try { payload = JSON.parse(rawBody); } catch { return { ok: false, orderNo: "", gatewayRef: "" }; }
  const eventType = payload?.event_type ?? "";
  const orderNo = payload?.data?.custom_data?.order_no ?? "";
  const status = payload?.data?.status ?? "";
  const paid = (eventType === "transaction.completed" || eventType === "transaction.paid") && (status === "completed" || status === "paid");
  return { ok: !!paid && !!orderNo, orderNo: String(orderNo), gatewayRef: String(payload?.data?.id ?? "") };
}
