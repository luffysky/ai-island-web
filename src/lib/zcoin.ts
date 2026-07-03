/**
 * Z幣帳本（server / service-role）。
 * 餘額存 `profiles.z_coin`，每筆進出寫一列 `coin_transactions`（含 reason + meta + balance_after）。
 * 與 gamification.ts 的 addCoin 同一套資料，但這支支援 meta + 冪等（金流補款用）。
 *
 * Reason code 規範（進帳為正、出帳為負）：
 *  進：checkin_daily｜streak_bonus｜lesson_complete｜chapter_complete｜boss_clear｜quiz_perfect
 *     ｜achievement｜first_action｜social_reward｜market_sale｜referral｜topup｜admin_airdrop
 *  出：ai_spend｜egg_open｜market_buy｜pet_cosmetic｜tip｜boost｜unlock
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function getZcoinBalance(userId: string): Promise<number> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select("z_coin").eq("id", userId).single();
  return (data as any)?.z_coin ?? 0;
}

/** 加 Z幣。回新餘額。 */
export async function grantZcoin(userId: string, amount: number, reason: string, meta: Record<string, unknown> = {}): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "invalid_amount" };
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select("z_coin").eq("id", userId).single();
  const newBalance = ((data as any)?.z_coin ?? 0) + amount;
  await admin.from("profiles").update({ z_coin: newBalance }).eq("id", userId);
  await admin.from("coin_transactions").insert({ user_id: userId, amount, balance_after: newBalance, reason, meta });
  return { ok: true, balance: newBalance };
}

/** 扣 Z幣（餘額不足回錯，不扣）。回新餘額。 */
export async function spendZcoin(userId: string, amount: number, reason: string, meta: Record<string, unknown> = {}): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "invalid_amount" };
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select("z_coin").eq("id", userId).single();
  const bal = (data as any)?.z_coin ?? 0;
  if (bal < amount) return { ok: false, error: "insufficient_coins" };
  const newBalance = bal - amount;
  await admin.from("profiles").update({ z_coin: newBalance }).eq("id", userId);
  await admin.from("coin_transactions").insert({ user_id: userId, amount: -amount, balance_after: newBalance, reason, meta });
  return { ok: true, balance: newBalance };
}

/**
 * 冪等加 Z幣：同一個 order_no 只會加一次（金流 webhook 可能重送）。
 * 靠 coin_transactions.meta->>order_no 檢查有沒有記過。
 */
export async function grantZcoinOnce(userId: string, amount: number, reason: string, orderNo: string, meta: Record<string, unknown> = {}): Promise<{ ok: boolean; balance?: number; duplicated?: boolean }> {
  const admin = createSupabaseAdmin();
  const { data: existing } = await admin.from("coin_transactions").select("id").eq("user_id", userId).eq("reason", reason).contains("meta", { order_no: orderNo }).limit(1);
  if (existing && existing.length) return { ok: true, duplicated: true };
  const r = await grantZcoin(userId, amount, reason, { ...meta, order_no: orderNo });
  return r.ok ? { ok: true, balance: r.balance } : { ok: false };
}
