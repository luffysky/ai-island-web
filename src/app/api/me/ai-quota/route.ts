import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { AI_FREE_DAILY } from "@/lib/ai-quota-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/me/ai-quota — 今日免費 AI 額度（給 header 愛心視覺化用；純讀取、不消耗）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();

  // 特權 / 訂閱 → 無限（愛心顯示滿 + ∞）
  try {
    const { hasAiUnlimited } = await import("@/lib/ai-privilege");
    if (await hasAiUnlimited(user.id)) return NextResponse.json({ unlimited: true, cap: AI_FREE_DAILY, remaining: AI_FREE_DAILY });
  } catch { /* ignore */ }
  try {
    const { data: premium } = await admin.rpc("has_active_subscription", { p_user_id: user.id });
    if (premium) return NextResponse.json({ unlimited: true, premium: true, cap: AI_FREE_DAILY, remaining: AI_FREE_DAILY });
  } catch { /* ignore */ }

  const { data } = await admin.from("ai_daily_quota")
    .select("free_used").eq("user_id", user.id).eq("date", new Date().toISOString().slice(0, 10)).maybeSingle();
  const used = Math.max(0, (data as any)?.free_used ?? 0);
  const remaining = Math.max(0, AI_FREE_DAILY - used);
  return NextResponse.json({ unlimited: false, cap: AI_FREE_DAILY, used, remaining });
}
