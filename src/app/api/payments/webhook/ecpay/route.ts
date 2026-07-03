import { NextRequest } from "next/server";
import { ecpayVerify } from "@/lib/payments/gateways/ecpay";
import { fulfillOrder } from "@/lib/payments/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 綠界 ReturnURL（server-to-server）。驗章 → 發貨 → 回 "1|OK"。 */
export async function POST(req: NextRequest) {
  const text = await req.text();
  const body = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
  const v = ecpayVerify(body);
  if (!v.ok) return new Response("0|ERR", { status: 200 });
  const r = await fulfillOrder(v.orderNo, v.gatewayRef, v.amount);
  // 即使 already 也回 1|OK（冪等），綠界才不會一直重送
  return new Response(r.ok ? "1|OK" : "0|ERR", { status: 200 });
}
