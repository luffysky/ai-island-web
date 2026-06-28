/**
 * Creator Engine — Cost Manager（M2 最小版）
 * - estimateCostUsd：用 ai_models 費率算「分析用」USD（非使用者貨幣）。
 * - 核心動作（凝聚/演化/編織）預設「免費」(z_charged=0、E10 不做 token-trap)；
 *   未來高級模型/大量生成才扣 Z 幣（保留 chargeZ 介面）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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

/**
 * 依 workspace AI 設定 + 動作決定要扣多少 Z 幣。
 * M2：核心 3 動作免費（回 0）。保留結構：未來可按 model tier / bulk 收費。
 */
export async function resolveZCharge(_workspaceId: string, _agentType: string): Promise<number> {
  return 0; // 核心動作免費（E10）
}
