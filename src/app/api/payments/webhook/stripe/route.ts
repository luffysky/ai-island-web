import { NextRequest, NextResponse } from "next/server";
import { stripeVerify } from "@/lib/payments/gateways/stripe";
import { fulfillOrder } from "@/lib/payments/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stripe webhook：驗簽 → checkout.session.completed → 發貨。 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  let v: { ok: boolean; orderNo: string; gatewayRef: string; amount?: number };
  try {
    v = stripeVerify(raw, sig);
  } catch (e) {
    return NextResponse.json({ error: "bad_signature", message: (e as Error).message }, { status: 400 });
  }
  if (v.ok && v.orderNo) await fulfillOrder(v.orderNo, v.gatewayRef, v.amount);
  return NextResponse.json({ received: true });
}
