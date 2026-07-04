/**
 * Creator Engine — Cost Manager（E10 嚴格）
 * - estimateCostUsd：用 ai_models 費率算「分析用」USD（非使用者貨幣）。
 * - computeZCharge：核心動作免費；只有「大量生成 / 商用導出」才扣 Z 幣（E10 no-token-trap）。
 * - chargeWorkspace / refundWorkspace：個人 workspace 扣 profiles.z_coin；studio 扣 ci_workspace_wallet。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getWorkspaceById } from "@/lib/creator-engine/workspace";
import { spendZcoin, grantZcoin } from "@/lib/zcoin";

export async function estimateCostUsd(provider: string, model: string, tokensIn: number, tokensOut: number): Promise<number> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("ai_models")
      .select("cost_input_per_1m, cost_output_per_1m")
      .eq("provider", provider).eq("model_name", model).limit(1).maybeSingle();
    const inRate = Number((data as any)?.cost_input_per_1m) || 0;
    const outRate = Number((data as any)?.cost_output_per_1m) || 0;
    return (tokensIn / 1e6) * inRate + (tokensOut / 1e6) * outRate;
  } catch {
    return 0;
  }
}

// 免費演化的變體數；超過每個 +1 Z 幣（大量生成）。
const EVOLVE_FREE = 6;
// 歌曲編織（含 Suno/MV 商用導出）固定收費。
const SONG_EXPORT_Z = 10;

/**
 * E10 嚴格：算此次 AI 動作要收多少 Z 幣。
 * - 核心 凝聚/演化(≤6)/文化轉譯/顧問/DNA/assist = 0（免費）。
 * - 演化 >6 個變體：每多一個 +1 Z（大量生成）。
 * - 編織歌曲(song，出 Suno/MV)：+10 Z（商用導出）。
 */
export function computeZCharge(agentType: string, input: unknown): number {
  const i = (input ?? {}) as Record<string, any>;
  if (agentType === "evolve") {
    const count = Number(i.count) || 0;
    return count > EVOLVE_FREE ? count - EVOLVE_FREE : 0;
  }
  if (agentType === "compose") {
    return i.workType === "song" ? SONG_EXPORT_Z : 0;
  }
  return 0;
}

/** 向後相容：舊呼叫點用。核心動作回 0。 */
export async function resolveZCharge(_workspaceId: string, _agentType: string): Promise<number> {
  return 0;
}

/** 扣 Z 幣（個人 workspace → profiles.z_coin；studio → ci_workspace_wallet）。回 { ok } 或 insufficient。 */
export async function chargeWorkspace(
  workspaceId: string, userId: string, amount: number, reason: string, meta: Record<string, unknown> = {},
): Promise<{ ok: boolean; error?: string; balance?: number }> {
  if (amount <= 0) return { ok: true };
  const ws = await getWorkspaceById(workspaceId).catch(() => null);
  if (ws?.type === "studio") {
    const admin = createSupabaseAdmin();
    const r = await admin.rpc("ci_debit_workspace_wallet", { p_workspace_id: workspaceId, p_user_id: userId, p_amount: -amount, p_reason: reason, p_meta: meta });
    const d = r.data as { ok: boolean; error?: string; balance_after?: number };
    return d?.ok ? { ok: true, balance: d.balance_after } : { ok: false, error: d?.error ?? "insufficient_funds" };
  }
  // 個人 workspace：扣使用者個人 Z 幣
  const r = await spendZcoin(userId, amount, reason, meta);
  return r.ok ? { ok: true, balance: r.balance } : { ok: false, error: r.error };
}

/** 退回 Z 幣（AI 失敗時把預扣的退還）。 */
export async function refundWorkspace(
  workspaceId: string, userId: string, amount: number, reason: string, meta: Record<string, unknown> = {},
): Promise<void> {
  if (amount <= 0) return;
  const ws = await getWorkspaceById(workspaceId).catch(() => null);
  if (ws?.type === "studio") {
    const admin = createSupabaseAdmin();
    await admin.rpc("ci_debit_workspace_wallet", { p_workspace_id: workspaceId, p_user_id: userId, p_amount: amount, p_reason: reason, p_meta: meta }).then(() => {}, () => {});
    return;
  }
  await grantZcoin(userId, amount, reason, meta).catch(() => {});
}
