import { NextRequest } from "next/server";
import { newebpayVerify } from "@/lib/payments/gateways/newebpay";
import { fulfillOrder } from "@/lib/payments/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 藍新 NotifyURL。驗章解密 → 發貨 → 回 200。 */
export async function POST(req: NextRequest) {
  const text = await req.text();
  const body = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
  const v = newebpayVerify(body);
  if (!v.ok) return new Response("0", { status: 200 });
  await fulfillOrder(v.orderNo, v.gatewayRef, v.amount);
  return new Response("1", { status: 200 });
}
