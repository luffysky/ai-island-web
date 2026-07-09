import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { hasAiUnlimited } from "@/lib/ai-privilege";
import { getUserSubTier } from "@/lib/payments/orders";

export const dynamic = "force-dynamic";

// 回傳使用者的 AI 分層：canPickModel（免費不能選、一律 auto）、unlimited、subTier。
// 前端用來決定要不要顯示模型選單。
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ canPickModel: false, unlimited: false, subTier: null });

  const unlimited = await hasAiUnlimited(user.id);
  const subTier = unlimited ? "pro" : await getUserSubTier(user.id); // "plus" | "pro" | null
  const canPickModel = unlimited || subTier === "plus" || subTier === "pro";
  return NextResponse.json({ canPickModel, unlimited, subTier });
}
