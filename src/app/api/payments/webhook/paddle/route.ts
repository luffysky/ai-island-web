import { NextRequest, NextResponse } from "next/server";
import { paddleVerify } from "@/lib/payments/gateways/paddle";
import { fulfillOrder } from "@/lib/payments/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Paddle webhook：驗 Paddle-Signature → transaction.completed → 發貨。 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("paddle-signature") || "";
  const v = paddleVerify(raw, sig);
  if (v.ok && v.orderNo) await fulfillOrder(v.orderNo, v.gatewayRef); // 不傳金額：MoR 收 USD
  return NextResponse.json({ received: true });
}
