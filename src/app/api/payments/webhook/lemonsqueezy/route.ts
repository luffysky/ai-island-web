import { NextRequest, NextResponse } from "next/server";
import { lemonSqueezyVerify } from "@/lib/payments/gateways/lemonsqueezy";
import { fulfillOrder } from "@/lib/payments/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lemon Squeezy webhook：驗 X-Signature → order_created(paid) → 發貨。 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-signature") || "";
  const v = lemonSqueezyVerify(raw, sig);
  if (v.ok && v.orderNo) await fulfillOrder(v.orderNo, v.gatewayRef); // 不傳金額：MoR 收 USD、跟 TWD 訂單額不同
  return NextResponse.json({ received: true });
}
