/**
 * 訂單服務：建單（orders 表 status=pending）→ 金流回調時 fulfill（冪等）。
 * fulfill = 標記 paid + 依 product_type 發 Z幣（grantZcoinOnce）或開通 Pro 訂閱。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { grantZcoinOnce } from "@/lib/zcoin";
import { CURRENCY, getProPlan, getZcoinPackage, type PaymentMethod, type PaymentProvider } from "./config";

export type OrderPurpose = "zcoin" | "pro";

export type CreateOrderInput = {
  userId: string;
  purpose: OrderPurpose;
  itemId: string;                 // package id or plan id
  provider: PaymentProvider;
  method: PaymentMethod;
};

export type Order = {
  id: string;
  user_id: string;
  order_no: string;
  product_type: string;
  product_name: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  payment_id: string | null;
  metadata: Record<string, unknown>;
};

/** 產生 ≤20 碼英數訂單編號（綠界 MerchantTradeNo 上限 20）。 */
function genOrderNo(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AI${ts}${rnd}`.slice(0, 20);
}

export async function createOrder(input: CreateOrderInput): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  let amount = 0;
  let productName = "";
  let productType = "";
  const meta: Record<string, unknown> = { purpose: input.purpose, itemId: input.itemId, provider: input.provider, method: input.method };

  if (input.purpose === "zcoin") {
    const pkg = getZcoinPackage(input.itemId);
    if (!pkg) return { ok: false, error: "unknown_package" };
    amount = pkg.twd; productName = `Z幣 ${pkg.zcoin.toLocaleString()}`; productType = "zcoin_topup";
    meta.zcoin = pkg.zcoin;
  } else if (input.purpose === "pro") {
    const plan = getProPlan(input.itemId);
    if (!plan) return { ok: false, error: "unknown_plan" };
    amount = plan.twd; productName = plan.label; productType = "pro_subscription";
    meta.plan = plan.id; meta.months = plan.months;
  } else {
    return { ok: false, error: "unknown_purpose" };
  }

  const admin = createSupabaseAdmin();
  const order_no = genOrderNo();
  const { data, error } = await admin.from("orders").insert({
    user_id: input.userId, order_no, product_type: productType, product_name: productName,
    amount, currency: CURRENCY, status: "pending", payment_method: `${input.provider}:${input.method}`, metadata: meta,
  }).select("*").single();
  if (error || !data) return { ok: false, error: error?.message ?? "insert_failed" };
  return { ok: true, order: data as Order };
}

export async function getOrderByNo(orderNo: string): Promise<Order | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("orders").select("*").eq("order_no", orderNo).maybeSingle();
  return (data as Order) ?? null;
}

/**
 * 金流確認付款成功 → 發貨。冪等：已 paid 直接回。
 * gatewayRef = 金流商交易編號（存 payment_id）。
 */
export async function fulfillOrder(orderNo: string, gatewayRef: string, paidAmount?: number): Promise<{ ok: boolean; already?: boolean; error?: string }> {
  const admin = createSupabaseAdmin();
  const order = await getOrderByNo(orderNo);
  if (!order) return { ok: false, error: "order_not_found" };
  if (order.status === "paid") return { ok: true, already: true };
  // 金額防偽：金流回報金額要對得上（有帶才驗）
  if (paidAmount != null && Number(paidAmount) !== Number(order.amount)) {
    return { ok: false, error: "amount_mismatch" };
  }

  await admin.from("orders").update({ status: "paid", payment_id: gatewayRef, paid_at: new Date().toISOString() }).eq("id", order.id);

  const meta = order.metadata || {};
  if (order.product_type === "zcoin_topup") {
    const zcoin = Number((meta as any).zcoin ?? 0);
    if (zcoin > 0) await grantZcoinOnce(order.user_id, zcoin, "topup", order.order_no, { amount_twd: order.amount });
  } else if (order.product_type === "pro_subscription") {
    await activatePro(order.user_id, String((meta as any).plan ?? "pro_monthly"), Number((meta as any).months ?? 1), order.order_no, `${order.payment_method}`);
  }
  return { ok: true };
}

/** 開通/續訂 Pro：從現有到期日往後加（沒到期日就從現在）。 */
async function activatePro(userId: string, plan: string, months: number, orderNo: string, paymentMethod: string) {
  const admin = createSupabaseAdmin();
  const { data: existing } = await admin.from("subscriptions").select("id, expires_at, status").eq("user_id", userId).eq("plan", "pro").order("expires_at", { ascending: false }).maybeSingle();
  const base = existing?.expires_at && new Date(existing.expires_at) > new Date() ? new Date(existing.expires_at) : new Date();
  base.setMonth(base.getMonth() + months);
  const expires = base.toISOString();
  const meta = { plan_id: plan, last_order: orderNo };
  if (existing?.id) {
    await admin.from("subscriptions").update({ status: "active", expires_at: expires, payment_method: paymentMethod, external_id: orderNo, metadata: meta }).eq("id", existing.id);
  } else {
    await admin.from("subscriptions").insert({ user_id: userId, plan: "pro", status: "active", started_at: new Date().toISOString(), expires_at: expires, payment_method: paymentMethod, external_id: orderNo, metadata: meta });
  }
}

/** 使用者是不是 Pro（有效訂閱）。 */
export async function isPro(userId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("subscriptions").select("expires_at, status").eq("user_id", userId).eq("status", "active").order("expires_at", { ascending: false }).maybeSingle();
  return !!(data?.expires_at && new Date(data.expires_at) > new Date());
}
