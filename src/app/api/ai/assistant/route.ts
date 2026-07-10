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

  // 語意快取：只快取「無個人化」的 hint / recommend（grade_draft/companion、或帶最近錯題的個人化查詢不快取）。
  // 命中直接回 → 不查模型、不扣額度、不燒 token。全程 fail-soft。
  const cacheable = (mode === "hint" || mode === "recommend") && !(Array.isArray(body.context?.recentErrors) && body.context.recentErrors.length);
  const cacheKey = {
    tone: null as string | null,
    personaId: `asst:${mode}`,
    contextChapterId: typeof body.context?.chapterId === "number" ? body.context.chapterId : null,
    contextLessonId: (body.context?.lessonId ?? null) as string | null,
  };
  if (cacheable) {
    const { lookupCache, lookupSemanticCache, bumpHit } = await import("@/lib/ai-cache");
    const hit = (await lookupCache(userMessage, cacheKey)) ?? (await lookupSemanticCache(userMessage, cacheKey));
    if (hit) {
      bumpHit(hit.id).catch(() => {});
      return NextResponse.json({ ok: true, text: hit.answer, mode, cached: true });
    }
  }

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
      // 跟主聊天共用同一個每日免費池（consume_ai_quota_v2 kind=free）；用完即擋（不接 Z 幣續用 UX 屬前端後續）
      const { AI_FREE_DAILY, AI_ZCOIN_FREE_OVERFLOW } = await import("@/lib/ai-quota-config");
      const { data: q } = await admin.rpc("consume_ai_quota_v2", {
        p_user_id: user.id, p_kind: "free", p_daily_limit: AI_FREE_DAILY, p_zcoin_price: AI_ZCOIN_FREE_OVERFLOW, p_allow_zcoin: false,
      });
      if (!(q as any)?.ok) return NextResponse.json({ error: "quota_exceeded" }, { status: 429 });
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
    // 寫語意快取（下次同課同題不燒 token）
    if (cacheable && resp.text) {
      const { writeCache } = await import("@/lib/ai-cache");
      writeCache(userMessage, resp.text, `${model.provider}/${model.model_name}`, cacheKey).catch(() => {});
    }
    return NextResponse.json({ ok: true, text: resp.text, mode, tokens: resp.tokensInput + resp.tokensOutput });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_call_failed", message: e?.message }, { status: 500 });
  }
}
