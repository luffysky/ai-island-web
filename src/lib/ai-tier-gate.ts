import { hasAiUnlimited } from "@/lib/ai-privilege";
import { getUserSubTier } from "@/lib/payments/orders";

/**
 * 全站共用的「高階模型分層授權」：高階(tier==="high")模型只有 **Pro / 特權 / BYOK** 可用。
 * 免費 / Plus 拿到高階 → 降級為 active 的非高階模型（mid 優先、否則 low）。
 * 給主聊天以外的 AI 入口（寵物 / Nami / 創作引擎…）呼叫，讓全站行為一致。
 *
 * @param admin  service-role supabase client
 * @param userId 使用者
 * @param model  已解析出的模型 row（需含 tier / id）
 * @param opts.byok 走自帶金鑰（成本自負、不降級）
 * @returns 允許用的模型（可能降級後的）
 */
export async function gateHighTierModel(
  admin: any,
  userId: string,
  model: any,
  opts?: { byok?: boolean },
): Promise<any> {
  if (!model || opts?.byok) return model;
  if (model.tier !== "high") return model; // 非高階不用管
  const unlimited = await hasAiUnlimited(userId);
  if (unlimited) return model;
  const subTier = await getUserSubTier(userId);
  if (subTier === "pro") return model;
  // free / plus → 降級
  const { data: actives } = await admin.from("ai_models").select("*").eq("is_active", true);
  const { pickModelByTier } = await import("@/lib/ai-difficulty");
  const pool = ((actives ?? []) as any[]).filter((m) => m.tier !== "high");
  return pickModelByTier(pool, "mid") ?? pickModelByTier(pool, "low") ?? model;
}
