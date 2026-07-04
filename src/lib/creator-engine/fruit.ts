/**
 * Creator Engine — 果實 (Fruit)：創作者收入貨幣（與 Z 幣 / Dust 分離、反洗幣）。
 * 只能從賣作品/被打賞賺得；不可用真錢買。之後開真金流只有果實可提現。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function getFruitBalance(userId: string): Promise<number> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_fruit_ledger").select("balance_after").eq("user_id", userId).order("id", { ascending: false }).limit(1).maybeSingle();
  return Number((data as any)?.balance_after ?? 0);
}

export async function listFruitLedger(userId: string, limit = 50) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_fruit_ledger").select("id, amount, balance_after, reason, meta, created_at").eq("user_id", userId).order("id", { ascending: false }).limit(Math.min(100, limit));
  return (data as any[]) ?? [];
}

/** 加/減果實（原子、不可為負）。回 { ok, balance_after } 或 { ok:false, error }。 */
export async function fruitTx(userId: string, amount: number, reason: string, meta: Record<string, unknown> = {}): Promise<{ ok: boolean; error?: string; balance_after?: number }> {
  const admin = createSupabaseAdmin();
  const r = await admin.rpc("ci_fruit_tx", { p_user_id: userId, p_amount: amount, p_reason: reason, p_meta: meta });
  return (r.data as any) ?? { ok: false, error: "rpc_failed" };
}
