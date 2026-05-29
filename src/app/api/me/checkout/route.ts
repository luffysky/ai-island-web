import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe, priceIdForPlan, type PlanKey } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe Checkout 啟動
 * POST /api/me/checkout { plan: 'monthly'|'yearly'|'single' }
 * 回 { url: 'https://checkout.stripe.com/...' }
 *
 * 用戶按「立即訂閱」→ 我們建一個 Stripe Checkout Session → redirect 過去
 * 付完 Stripe 會 redirect 回 /me?checkout=success
 * 真正開通走 webhook（避免 client 端被繞過）
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "stripe_not_configured", hint: "管理員需設 STRIPE_SECRET_KEY" }, { status: 503 });

  const body = await req.json().catch(() => ({} as any));
  const plan: PlanKey = ["monthly", "yearly", "single"].includes(body.plan) ? body.plan : "monthly";
  const priceId = priceIdForPlan(plan);
  if (!priceId) return NextResponse.json({ error: "no_price_id", hint: `管理員需設 STRIPE_PRICE_ID_${plan.toUpperCase()}` }, { status: 503 });

  const admin = createSupabaseAdmin();

  // 找 / 建 Stripe customer
  let stripeCustomerId: string | null = null;
  const { data: existing } = await admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (existing?.stripe_customer_id) {
    stripeCustomerId = existing.stripe_customer_id as string;
  } else {
    const { data: profile } = await admin.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle();
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: (profile as any)?.display_name || (profile as any)?.username || undefined,
      metadata: { user_id: user.id },
    });
    stripeCustomerId = customer.id;
    await admin.from("stripe_customers").upsert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      email: user.email ?? null,
    });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
  const isOneTime = plan === "single";
  const session = await stripe.checkout.sessions.create({
    mode: isOneTime ? "payment" : "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${site}/me?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/pricing?checkout=cancel`,
    allow_promotion_codes: true,
    locale: "zh-TW",
    metadata: { user_id: user.id, plan },
    subscription_data: isOneTime ? undefined : {
      metadata: { user_id: user.id, plan },
    },
  });

  return NextResponse.json({ url: session.url });
}
