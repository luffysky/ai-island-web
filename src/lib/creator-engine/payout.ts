/**
 * 創作者提現（果實 → 真錢）。目前 method='manual'：使用者申請 → 平台人工撥款 → 後台標記已付。
 * 果實在「申請當下」就先扣住（hold），駁回再退回 → 避免重複提領同一筆。
 * 匯率/門檻/抽成先用常數（可改；之後要動態再搬 app_settings）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { fruitTx, getFruitBalance } from "./fruit";

// 果實計價：跟 Z 幣同基底（1 NT$ = 10）。門檻 1000 果實(=NT$100) 起提；抽成先 0%。
export const PAYOUT = { fruitPerNtd: 10, minFruit: 1000, feePct: 0 };

export function estimateNtd(fruit: number): { gross: number; fee: number; net: number } {
  const gross = Math.floor(fruit / PAYOUT.fruitPerNtd);
  const fee = Math.round((gross * PAYOUT.feePct) / 100);
  return { gross, fee, net: Math.max(0, gross - fee) };
}

export function maskAccount(acc?: string | null): string {
  const s = String(acc ?? "").replace(/\s/g, "");
  if (s.length <= 4) return s ? `****${s}` : "";
  return `****${s.slice(-4)}`;
}

export type PayoutInput = { fruitAmount: number; accountName: string; bankName: string; bankAccount: string };

/** 建立提現申請：驗門檻/餘額 → 先扣果實(hold) → 建 pending 紀錄。 */
export async function requestPayout(userId: string, input: PayoutInput): Promise<{ ok: boolean; error?: string; message?: string; id?: string }> {
  const fruit = Math.floor(Number(input.fruitAmount) || 0);
  if (fruit < PAYOUT.minFruit) return { ok: false, error: "below_min", message: `最低提領 ${PAYOUT.minFruit} 果實（約 NT$${Math.floor(PAYOUT.minFruit / PAYOUT.fruitPerNtd)}）` };
  if (!input.accountName?.trim() || !input.bankName?.trim() || !input.bankAccount?.trim()) return { ok: false, error: "missing_account", message: "請填收款人姓名 / 銀行 / 帳號" };

  const bal = await getFruitBalance(userId);
  if (bal < fruit) return { ok: false, error: "insufficient", message: `果實不足（有 ${bal}、要提 ${fruit}）` };

  // 先扣住果實（申請即 hold；駁回時退回）
  const held = await fruitTx(userId, -fruit, "payout_hold", { kind: "payout_request" });
  if (!held.ok) return { ok: false, error: held.error ?? "hold_failed", message: "扣款失敗，請重試" };

  const { gross, fee } = estimateNtd(fruit);
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_payouts").insert({
    user_id: userId, fruit_amount: fruit, ntd_amount: gross, fee_ntd: fee, method: "manual",
    account_name: input.accountName.trim().slice(0, 60),
    bank_name: input.bankName.trim().slice(0, 60),
    bank_account: input.bankAccount.trim().slice(0, 40),
    status: "pending",
  }).select("id").single();
  if (error) {
    // 建單失敗 → 退回果實，避免卡住
    await fruitTx(userId, fruit, "payout_refund", { kind: "request_rollback" });
    return { ok: false, error: "insert_failed", message: error.message };
  }
  return { ok: true, id: (data as any).id };
}

export async function listMyPayouts(userId: string, limit = 30) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_payouts")
    .select("id, fruit_amount, ntd_amount, fee_ntd, status, admin_note, requested_at, processed_at")
    .eq("user_id", userId).order("requested_at", { ascending: false }).limit(Math.min(100, limit));
  return (data as any[]) ?? [];
}

/** 後台：更新狀態。reject 會退回果實。paid 可帶實際撥款金額覆寫。 */
export async function setPayoutStatus(
  id: string, adminId: string, action: "approved" | "paid" | "rejected", opts: { adminNote?: string; ntdAmount?: number } = {}
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from("ci_payouts").select("*").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "not_found", message: "找不到申請" };
  const p = row as any;
  if (p.status === "paid" || p.status === "rejected") return { ok: false, error: "already_final", message: "此申請已結案" };

  if (action === "rejected") {
    // 退回果實
    const back = await fruitTx(p.user_id, p.fruit_amount, "payout_refund", { kind: "payout_rejected", payout_id: id });
    if (!back.ok) return { ok: false, error: back.error ?? "refund_failed", message: "退回果實失敗" };
  }

  const patch: any = { status: action, admin_note: opts.adminNote ?? p.admin_note, processed_at: new Date().toISOString(), processed_by: adminId };
  if (action === "paid" && Number.isFinite(Number(opts.ntdAmount)) && Number(opts.ntdAmount) >= 0) patch.ntd_amount = Math.floor(Number(opts.ntdAmount));
  if (action === "approved") patch.processed_at = null; // approved 只是標記，還沒撥
  const { error } = await admin.from("ci_payouts").update(patch).eq("id", id);
  if (error) return { ok: false, error: "update_failed", message: error.message };
  return { ok: true };
}
