import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe, planFromPriceId } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Stripe webhook — 訂閱事件處理
 *
 * Stripe Dashboard → Developers → Webhooks → 加 endpoint：
 *   https://ai-island-web.snowrealm.pet/api/stripe/webhook
 * 訂閱 events：
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.paid
 *   invoice.payment_failed
 *   checkout.session.completed
 *
 * 拿 Signing secret → 設成 STRIPE_WEBHOOK_SECRET env
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "no_webhook_secret" }, { status: 503 });

  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: `signature_failed: ${e?.message}` }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // dedup：同一個 event_id 跑過就跳過
  const { data: existed } = await admin.from("webhook_events").select("id, processed_at").eq("source", "stripe").eq("event_id", event.id).maybeSingle();
  if (existed?.processed_at) {
    return NextResponse.json({ ok: true, deduped: true });
  }
  // 紀錄
  const { data: rec } = await admin.from("webhook_events").upsert({
    source: "stripe",
    event_id: event.id,
    event_type: event.type,
    raw: event,
  }, { onConflict: "source,event_id" }).select("id").single();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object);
        break;
    }
    await admin.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", (rec as any).id);
  } catch (e: any) {
    await admin.from("webhook_events").update({ error: e?.message?.slice(0, 500) }).eq("id", (rec as any).id);
    console.error("[stripe webhook]", event.type, e?.message);
    // 回 200 避免 Stripe 一直 retry、錯誤已記錄到 webhook_events
  }

  return NextResponse.json({ ok: true });
}

// 找 user_id：metadata.user_id 優先、否則查 stripe_customers 表
async function resolveUserId(obj: any): Promise<string | null> {
  if (obj?.metadata?.user_id) return obj.metadata.user_id;
  const customerId = obj?.customer;
  if (!customerId) return null;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("stripe_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return (data as any)?.user_id ?? null;
}

async function handleCheckoutCompleted(session: any) {
  const userId = await resolveUserId(session);
  if (!userId) return;
  const admin = createSupabaseAdmin();

  // 一次性付款（single 章節）→ 直接記 active subscription 一段時間
  if (session.mode === "payment" && session.metadata?.plan === "single") {
    await admin.from("subscriptions").upsert({
      user_id: userId,
      plan: "single",
      status: "active",
      start_date: new Date().toISOString(),
      end_date: null,
      granted_by: "stripe_oneshot",
    }, { onConflict: "user_id" });
    await syncDiscordRole(userId, true);
  }
  // 訂閱模式由 subscription.created / updated 事件 handle
}

async function handleSubscriptionUpsert(sub: any) {
  const userId = await resolveUserId(sub);
  const admin = createSupabaseAdmin();
  const priceId = sub?.items?.data?.[0]?.price?.id ?? null;
  const plan = planFromPriceId(priceId) ?? sub?.metadata?.plan ?? null;
  const amount = sub?.items?.data?.[0]?.price?.unit_amount ?? null;
  const currency = sub?.items?.data?.[0]?.price?.currency ?? "twd";

  await admin.from("stripe_subscriptions").upsert({
    stripe_subscription_id: sub.id,
    user_id: userId,
    stripe_customer_id: sub.customer,
    status: sub.status,
    price_id: priceId,
    plan,
    amount_cents: amount,
    currency,
    current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    metadata: sub.metadata ?? {},
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });

  if (!userId) return;

  // 同步 subscriptions（既有表、其他 code 看這個判 active）
  const isActive = ["active", "trialing"].includes(sub.status);
  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan: plan ?? "monthly",
    status: isActive ? "active" : sub.status,
    start_date: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : new Date().toISOString(),
    end_date: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    granted_by: "stripe",
  }, { onConflict: "user_id" });

  await syncDiscordRole(userId, isActive);
}

async function handleSubscriptionDeleted(sub: any) {
  const userId = await resolveUserId(sub);
  const admin = createSupabaseAdmin();
  await admin.from("stripe_subscriptions").update({
    status: "canceled",
    canceled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", sub.id);
  if (!userId) return;
  await admin.from("subscriptions").update({ status: "canceled" }).eq("user_id", userId);
  await syncDiscordRole(userId, false);
}

async function handleInvoicePaid(invoice: any) {
  // 記到 orders 表
  const userId = await resolveUserId(invoice);
  if (!userId) return;
  const admin = createSupabaseAdmin();
  try {
    await admin.from("orders").insert({
      user_id: userId,
      amount: (invoice.amount_paid ?? 0) / 100,
      currency: invoice.currency ?? "twd",
      status: "paid",
      meta: { source: "stripe", invoice_id: invoice.id, subscription_id: invoice.subscription },
    });
  } catch {}
}

async function handleInvoiceFailed(invoice: any) {
  const userId = await resolveUserId(invoice);
  if (!userId) return;
  const admin = createSupabaseAdmin();
  // 不馬上取消、Stripe 會自己 retry。寫一筆 error_log
  try {
    await admin.from("error_logs").insert({
      source: "stripe-webhook",
      level: "warn",
      message: `[invoice_payment_failed] user ${userId} invoice ${invoice.id}`,
      extra: { invoice_id: invoice.id, amount: invoice.amount_due },
    });
  } catch {}
}

/** 同步 Discord VIP role（active → assign、非 active → revoke） */
async function syncDiscordRole(userId: string, makeVip: boolean): Promise<void> {
  try {
    const { getDiscordIdForUser, assignVipRole, revokeVipRole } = await import("@/lib/discord-binding");
    const dcId = await getDiscordIdForUser(userId);
    if (!dcId) return;
    if (makeVip) await assignVipRole(dcId);
    else await revokeVipRole(dcId);
    const admin = createSupabaseAdmin();
    await admin.from("user_discord_bind").update({ last_role_sync_at: new Date().toISOString() }).eq("user_id", userId);
  } catch (e) {
    console.warn("[stripe webhook] discord sync failed:", (e as any)?.message);
  }
}
