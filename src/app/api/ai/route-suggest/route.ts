import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { routeModel, pickModelByTier } from "@/lib/ai-router";

export const dynamic = "force-dynamic";

/**
 * 客戶端發問題前先打這個、拿建議用哪個 model。
 * 不強制、客戶端可以忽略並用原本選的 model。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const question = String(body.question ?? "");
  const isFirstMessage = !!body.isFirstMessage;
  const contextChapterId = body.contextChapterId ?? null;
  const hasCodeContext = !!body.hasCodeContext;

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("level").eq("id", user.id).single();
  const userLevel = (profile as any)?.level ?? 1;

  const decision = routeModel({ question, isFirstMessage, userLevel, contextChapterId, hasCodeContext });

  // 從 ai_models 挑同 tier 第一個 active
  const { data: models } = await admin.from("ai_models").select("id, provider, model_name, tier, is_active").eq("is_active", true);
  const pick = pickModelByTier((models as any) ?? [], decision.tier);

  return NextResponse.json({
    tier: decision.tier,
    score: decision.score,
    reasons: decision.reasons,
    suggested_model: pick,
  });
}
