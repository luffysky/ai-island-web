import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { buildAssistantPrompt, type AssistantMode } from "@/lib/ai-assistant";
import { callAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { rateLimit } from "@/lib/rate-limit";
import { hasAiUnlimited } from "@/lib/ai-privilege";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_MODES: AssistantMode[] = ["grade_draft", "hint", "recommend", "companion"];

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 每用戶 30 次/分鐘
  const rl = rateLimit(`ai:assistant:${user.id}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const mode = body.mode as AssistantMode;
  const userMessage = String(body.message ?? "").trim();
  if (!VALID_MODES.includes(mode)) return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  if (!userMessage) return NextResponse.json({ error: "empty_message" }, { status: 400 });
  if (userMessage.length > 3000) return NextResponse.json({ error: "too_long" }, { status: 400 });

  const admin = createSupabaseAdmin();

  // 找一個 active model（用 mid tier、或 default）
  const { data: models } = await admin
    .from("ai_models")
    .select("id, provider, model_name, is_active, free_tier_daily_limit")
    .eq("is_active", true)
    .limit(20);
  const model = (models as any[])?.find((m) => m.provider === "anthropic") ?? (models as any[])?.[0];
  if (!model) return NextResponse.json({ error: "no_model_available" }, { status: 500 });

  // 取 system API key
  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return NextResponse.json({ error: "no_system_key" }, { status: 500 });
  const apiKey = decryptKey((sysKey as any).api_key_encrypted);

  // quota check（assistant 也走 quota、除非 ai_unlimited 或 premium）
  const unlimited = await hasAiUnlimited(user.id);
  if (!unlimited) {
    const { data: premiumOk } = await admin.rpc("has_active_subscription", { p_user_id: user.id });
    if (!premiumOk) {
      const { data: quotaOk } = await admin.rpc("consume_ai_quota", { p_user_id: user.id, p_amount: 1 });
      if (quotaOk === false) return NextResponse.json({ error: "quota_exceeded" }, { status: 429 });
    }
  }

  // build prompt + call AI（non-stream、短回覆）
  const { system, user: userPrompt } = buildAssistantPrompt({
    mode,
    userMessage,
    context: body.context,
  });

  try {
    const resp = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 600,
    });
    return NextResponse.json({ ok: true, text: resp.text, mode, tokens: resp.tokensInput + resp.tokensOutput });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_call_failed", message: e?.message }, { status: 500 });
  }
}
