/**
 * 邀請（referral）獎勵：新使用者用邀請碼註冊時，雙方各得 Z幣。
 *
 * 資料表：
 *  - referral_codes    每位使用者一組邀請碼（code / user_id / uses_count …）
 *  - referrals         每筆「誰邀請了誰」的紀錄（idempotency 靠 referred_id 唯一）
 *  - referral_commissions  稽核帳本（本檔用 source='referral_signup' 記一筆，amount_twd 存發出的 Z幣數）
 *
 * grant_zcoin(p_user_id, p_amount, p_reason) RPC 會直接加到 profiles.z_coin。
 * 整個流程用 try/catch 包住、任何錯誤都不能中斷註冊主流程。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** 雙方各得的 Z幣 */
export const REFERRAL_ZCOIN = 50;

export function normalizeReferralCode(raw?: string | null): string | null {
  if (!raw) return null;
  const c = String(raw).trim().toUpperCase();
  if (c.length < 4 || c.length > 40) return null;
  if (!/^[A-Z0-9_-]+$/.test(c)) return null;
  return c;
}

async function grantZcoin(admin: SupabaseClient, userId: string, amount: number, reason: string) {
  try {
    await admin.rpc("grant_zcoin", { p_user_id: userId, p_amount: amount, p_reason: reason });
  } catch {
    // RPC 失敗時的保底：直接加欄位（跟 line-postback.ts 同策略）
    const { data: p } = await admin.from("profiles").select("z_coin").eq("id", userId).single();
    await admin.from("profiles").update({ z_coin: ((p as any)?.z_coin ?? 0) + amount }).eq("id", userId);
  }
}

export type ReferralResult =
  | { ok: true; rewarded: true; referrerId: string; amount: number }
  | { ok: true; rewarded: false; reason: string };

/**
 * 處理一筆註冊邀請獎勵。冪等：同一位 referred 使用者只會發一次獎勵。
 * 只在「新 profile 首次建立」時呼叫（ensure-profile 的 insert 分支）。
 */
export async function processReferralSignup(
  admin: SupabaseClient,
  referredUserId: string,
  rawCode?: string | null,
): Promise<ReferralResult> {
  try {
    const code = normalizeReferralCode(rawCode);
    if (!code) return { ok: true, rewarded: false, reason: "no_code" };

    // 冪等守門：此 referred 使用者已被邀請過 → 不重複發
    const { data: existing } = await admin
      .from("referrals")
      .select("id")
      .eq("referred_id", referredUserId)
      .maybeSingle();
    if (existing) return { ok: true, rewarded: false, reason: "already_rewarded" };

    // 找邀請碼主人
    const { data: rc } = await admin
      .from("referral_codes")
      .select("code, user_id, enabled, max_uses, uses_count")
      .eq("code", code)
      .maybeSingle();
    if (!rc) return { ok: true, rewarded: false, reason: "code_not_found" };
    if ((rc as any).enabled === false) return { ok: true, rewarded: false, reason: "code_disabled" };

    const referrerId = (rc as any).user_id as string;
    if (referrerId === referredUserId) return { ok: true, rewarded: false, reason: "self_referral" };

    const maxUses = (rc as any).max_uses as number | null;
    if (maxUses != null && (rc as any).uses_count >= maxUses) {
      return { ok: true, rewarded: false, reason: "max_uses_reached" };
    }

    // 寫 referrals 紀錄（此表若對 referred_id 有唯一鍵，重覆時會擋掉 → 再次確保冪等）
    const { error: insErr } = await admin.from("referrals").insert({
      referrer_id: referrerId,
      referred_id: referredUserId,
      code,
      reward_granted: true,
    });
    if (insErr) {
      // 併發或唯一鍵衝突：視為已處理、不重複發獎
      return { ok: true, rewarded: false, reason: "insert_conflict" };
    }

    // 雙方各得 Z幣
    const reason = `referral_signup:${new Date().toISOString().slice(0, 10)}`;
    await grantZcoin(admin, referrerId, REFERRAL_ZCOIN, reason);
    await grantZcoin(admin, referredUserId, REFERRAL_ZCOIN, reason);

    // 更新使用次數
    await admin
      .from("referral_codes")
      .update({ uses_count: ((rc as any).uses_count ?? 0) + 1 })
      .eq("code", code);

    // 稽核帳本（amount_twd 這裡存的是發出的 Z幣數；status 直接 paid）
    await admin
      .from("referral_commissions")
      .insert({
        referrer_id: referrerId,
        referred_id: referredUserId,
        amount_twd: REFERRAL_ZCOIN,
        source: "referral_signup",
        source_id: referredUserId,
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .then(() => {}, () => {}); // 稽核失敗不影響主流程

    return { ok: true, rewarded: true, referrerId, amount: REFERRAL_ZCOIN };
  } catch (e: any) {
    console.error("[referral] processReferralSignup failed:", e?.message);
    return { ok: true, rewarded: false, reason: "error" };
  }
}
