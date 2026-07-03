import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createOrder } from "@/lib/payments/orders";
import { startCheckout } from "@/lib/payments";
import { providerEnabled, type PaymentMethod, type PaymentProvider } from "@/lib/payments/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { purpose:"zcoin"|"pro", itemId, provider, method } → { kind, action?, fields?, url? } */
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", message: "請先登入" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const purpose = b.purpose === "pro" ? "pro" : b.purpose === "zcoin" ? "zcoin" : null;
  const provider = String(b.provider || "") as PaymentProvider;
  const method = String(b.method || "credit") as PaymentMethod;
  const itemId = String(b.itemId || "");
  if (!purpose || !itemId) return NextResponse.json({ error: "validation", message: "缺參數" }, { status: 422 });
  if (!["ecpay", "newebpay", "stripe"].includes(provider) || !providerEnabled(provider)) {
    return NextResponse.json({ error: "provider", message: "此付款方式尚未開通" }, { status: 400 });
  }

  const created = await createOrder({ userId: user.id, purpose, itemId, provider, method });
  if (!created.ok) return NextResponse.json({ error: "order", message: created.error }, { status: 400 });

  try {
    const result = await startCheckout(created.order);
    return NextResponse.json({ orderNo: created.order.order_no, ...result });
  } catch (e) {
    return NextResponse.json({ error: "checkout", message: (e as Error).message }, { status: 500 });
  }
}
