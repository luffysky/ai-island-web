import { createSupabaseAdmin } from "@/lib/supabase";

/**
 * 檢查使用者是否有「AI 無限額度特權」
 * - profiles.ai_unlimited = true → 免費無額度限制
 * - role = 'admin' 也視為有特權（管理員自己用不受限）
 *
 * 移植自 Insight 的 platform_unlimited 機制
 */
export async function hasAiUnlimited(userId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("ai_unlimited, role")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return false;
  return data.ai_unlimited === true || data.role === "admin";
}
