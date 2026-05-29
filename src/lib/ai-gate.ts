/**
 * AI 使用閘門 — 所有 user-facing AI endpoint 共用
 *
 * 特權邏輯（林董要求）：
 * - is_owner / ai_unlimited = true → 最高禮遇、做任何事都免費、跳過所有 quota / cap
 * - Premium 訂閱中 → 跳過月 token cap
 * - 其他學員 → 月 token cap 100K（profiles.ai_monthly_token_cap、可調）
 *
 * 用法：
 *   const gate = await gateAiUsage(user.id);
 *   if (!gate.allow) return NextResponse.json({ error: gate.reason }, { status: 429 });
 *   ... 跑 AI ...
 *   if (gate.chargeable) await consumeAiTokens(user.id, totalTokens);
 */

import { createSupabaseAdmin } from "./supabase-admin";

export type GateResult = {
  allow: boolean;           // 是否允許使用 AI
  unlimited: boolean;       // 特權帳號（最高禮遇）
  isPremium: boolean;       // 訂閱中
  chargeable: boolean;      // 結束後要扣 token cap
  reason?: string;          // 不允許時的原因
  cap?: number;             // 月 cap
  used?: number;            // 已用
  remaining?: number;       // 剩餘
};

export async function gateAiUsage(userId: string): Promise<GateResult> {
  const admin = createSupabaseAdmin();

  // 1. 特權檢查 — owner / ai_unlimited 完全跳過所有限制
  try {
    const { hasAiUnlimited } = await import("./ai-privilege");
    const unlimited = await hasAiUnlimited(userId);
    if (unlimited) {
      return { allow: true, unlimited: true, isPremium: false, chargeable: false };
    }
  } catch {}

  // 2. Premium 檢查 — 訂閱中也跳過 token cap
  let isPremium = false;
  try {
    const { data: premiumOk } = await admin.rpc("has_active_subscription", { p_user_id: userId });
    isPremium = !!premiumOk;
  } catch {}
  if (isPremium) {
    return { allow: true, unlimited: false, isPremium: true, chargeable: false };
  }

  // 3. Free user — 看月 token cap
  const { data: prof } = await admin
    .from("profiles")
    .select("ai_monthly_token_cap, ai_monthly_token_used")
    .eq("id", userId)
    .maybeSingle();
  const cap = (prof as any)?.ai_monthly_token_cap ?? 100000;
  const used = (prof as any)?.ai_monthly_token_used ?? 0;
  const remaining = Math.max(0, cap - used);

  if (used >= cap) {
    return {
      allow: false,
      unlimited: false,
      isPremium: false,
      chargeable: true,
      reason: `本月 AI 上限 ${cap.toLocaleString()} token 已用完（已用 ${used.toLocaleString()}）、可升級 Premium 或自帶 API key`,
      cap, used, remaining,
    };
  }

  return {
    allow: true,
    unlimited: false,
    isPremium: false,
    chargeable: true,
    cap, used, remaining,
  };
}

/** AI 跑完後扣 token cap（只在 chargeable=true 時呼叫） */
export async function consumeAiTokens(userId: string, totalTokens: number): Promise<void> {
  if (totalTokens <= 0) return;
  try {
    const admin = createSupabaseAdmin();
    await admin.rpc("consume_ai_token_cap", { p_user_id: userId, p_tokens: totalTokens });
  } catch (e: any) {
    console.warn("[ai-gate] consume_ai_tokens failed:", e?.message);
  }
}

/**
 * 林董規格 — AI action quota（按行為類型計每月次數）
 * - tutor_thread: 10 / 月（不能刪、刪 conversation 不減 count）
 * - 其他項目: 3 / 月
 * - 特權 / Premium 不檢查、最高禮遇
 */
export const AI_ACTION_CAPS = {
  tutor_thread: 10,
  resume: 3,
  interview: 3,
  challenge: 3,
  subscription_rec: 5,
  blog_write: 3,
  pet_quest_gen: 30,
  resource_rec: 5,
  chapter_audit: 5,
  kanban_suggest: 10,
  kanban_ai_add: 10,
  kanban_auto_sync: 5,
} as const;

export type AiActionType = keyof typeof AI_ACTION_CAPS;

export type ActionGateResult = {
  allow: boolean;
  cap: number;
  used: number;
  remaining: number;
  reason?: string;
};

export async function consumeAiAction(userId: string, action: AiActionType): Promise<ActionGateResult> {
  const cap = AI_ACTION_CAPS[action];
  const admin = createSupabaseAdmin();
  try {
    const { data } = await admin.rpc("consume_ai_action", {
      p_user_id: userId, p_action_type: action, p_cap: cap,
    });
    const d = data as any;
    return {
      allow: !!d?.ok,
      cap: d?.cap ?? cap,
      used: d?.used ?? 0,
      remaining: d?.remaining ?? 0,
      reason: d?.ok ? undefined : `本月 ${action} 額度已用完（${d?.used}/${d?.cap}）、升級 Premium 解鎖無限`,
    };
  } catch (e: any) {
    console.warn("[ai-gate] consume_ai_action failed:", e?.message);
    return { allow: true, cap, used: 0, remaining: cap }; // RPC fail 放行
  }
}

/**
 * One-stop helper — gate (特權跳) + action quota check + auto consume action count
 * 用法：
 *   const r = await requireAiAction(user.id, "resume");
 *   if (!r.ok) return NextResponse.json({ error: r.error, reason: r.reason }, { status: 429 });
 *   ... 跑 AI ...
 *   if (r.chargeable) await consumeAiTokens(user.id, totalTokens);
 */
export async function requireAiAction(userId: string, action: AiActionType): Promise<{
  ok: boolean;
  unlimited: boolean;
  isPremium: boolean;
  chargeable: boolean;
  error?: string;
  reason?: string;
  used?: number;
  cap?: number;
}> {
  const gate = await gateAiUsage(userId);
  if (gate.unlimited || gate.isPremium) {
    return { ok: true, unlimited: gate.unlimited, isPremium: gate.isPremium, chargeable: false };
  }
  if (!gate.allow) {
    return { ok: false, unlimited: false, isPremium: false, chargeable: true, error: "token_cap_exceeded", reason: gate.reason };
  }
  const a = await consumeAiAction(userId, action);
  if (!a.allow) {
    return { ok: false, unlimited: false, isPremium: false, chargeable: true, error: "action_quota_exceeded", reason: a.reason, used: a.used, cap: a.cap };
  }
  return { ok: true, unlimited: false, isPremium: false, chargeable: true, used: a.used, cap: a.cap };
}
