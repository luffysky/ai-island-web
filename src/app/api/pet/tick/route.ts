import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { streamAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { getSpecies } from "@/lib/pet-species";
import { rateLimit } from "@/lib/rate-limit";
import { hasAiUnlimited } from "@/lib/ai-privilege";

export const maxDuration = 20;

const PROACTIVE_INTERVAL_MIN = 15;     // 每 15 分鐘最多一次主動訊息
const SLEEPY_AFTER_MIN = 30;            // 30 分鐘沒互動 → sleepy mood

/**
 * POST /api/pet/tick { path }
 * 回 { mood, autoMessage? }
 * 客戶端每 60s 呼叫一次。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ mood: "idle" });

  // tick 也算 rate limit、防有人手動爆打
  const rl = rateLimit(`pet-tick:${user.id}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ mood: "idle" });

  const { path } = await req.json().catch(() => ({} as any));

  const admin = createSupabaseAdmin();
  const { data: pet } = await admin
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pet) return NextResponse.json({ mood: "idle" });

  const lastInteractedMin = (Date.now() - new Date(pet.last_interacted_at ?? pet.updated_at ?? Date.now()).getTime()) / 60_000;

  // mood：idle / sleepy
  let mood: string = "idle";
  if (lastInteractedMin >= SLEEPY_AFTER_MIN) mood = "sleepy";

  // 是否該主動發訊
  if (!pet.proactive_enabled) {
    return NextResponse.json({ mood });
  }
  const sinceLastInteract = lastInteractedMin;
  // 至少 15 分內沒互動 + 不是剛剛已經主動過、才主動
  if (sinceLastInteract < PROACTIVE_INTERVAL_MIN) {
    return NextResponse.json({ mood });
  }

  // 查最近一次「主動訊息」距離（用 context.kind === auto 標記）
  const { data: lastAuto } = await admin
    .from("pet_messages")
    .select("created_at, context")
    .eq("user_id", user.id)
    .eq("role", "pet")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastAuto) {
    const min = (Date.now() - new Date(lastAuto.created_at).getTime()) / 60_000;
    if (min < PROACTIVE_INTERVAL_MIN) {
      return NextResponse.json({ mood });
    }
  }

  // 生成一條主動訊息——admin 後台改 usage_key=pet 即可換 model
  const { getModelNameForUsage } = await import("@/lib/ai-usage-models");
  const petModelName = await getModelNameForUsage("pet", "claude-haiku-4-5-20251001");
  let { data: model } = await admin
    .from("ai_models")
    .select("*")
    .eq("model_name", petModelName)
    .eq("is_active", true)
    .maybeSingle();
  if (!model) {
    const { data: d } = await admin.from("ai_models").select("*").eq("is_default", true).eq("is_active", true).maybeSingle();
    model = d;
  }
  if (!model) return NextResponse.json({ mood });

  const unlimited = await hasAiUnlimited(user.id);
  if (!unlimited) {
    const { data: ok } = await admin.rpc("consume_ai_quota", { p_user_id: user.id, p_amount: 1 });
    if (ok === false) return NextResponse.json({ mood });
  }

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !sysKey.enabled) return NextResponse.json({ mood });
  const apiKey = decryptKey(sysKey.api_key_encrypted);

  const { data: profile } = await admin
    .from("profiles")
    .select("username, display_name, level, xp, streak_days")
    .eq("id", user.id)
    .single();
  const species = getSpecies(pet.species);
  const userName = profile?.display_name || profile?.username || "你";

  const systemPrompt = `你是「${pet.name}」、${userName} 的 ${species.name} 寵物。
語氣：${species.voiceHint}

主動找 ${userName} 聊一句、跟寵物本性一致。
- 用 Traditional Chinese
- 一句話、20 字內、有寵物個性
- 內容方向（擇一、不要全堆上去）：關心、撒嬌、給打氣、提一下他現在在 ${path ?? "/"} 這個頁面、或他的 Lv ${profile?.level ?? 1} XP ${profile?.xp ?? 0} streak ${profile?.streak_days ?? 0}
- ❌ 絕對不要說「閒置」「離開很久」「N 分鐘」這類時間描述
- 不要超過一句、不要 emoji 太多

只輸出寵物說的話、不要任何前綴解釋。`;

  try {
    let text = "";
    let u = { tin: 0, tout: 0, cw: 0, cr: 0 };
    for await (const chunk of streamAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: "（main loop tick）" },
      ],
      maxTokens: 60,
    })) {
      const ch = chunk as any;
      if (ch.type === "text") text += ch.text;
      else if (ch.type === "done") u = { tin: ch.tokensInput ?? 0, tout: ch.tokensOutput ?? 0, cw: ch.cacheWriteTokens ?? 0, cr: ch.cacheReadTokens ?? 0 };
    }
    // 成本記帳（背景 tick 量可能大、streamAI 不自動記）
    if (u.tin || u.tout) {
      const { logAiUsage } = await import("@/lib/ai-usage-log");
      logAiUsage(model.provider, model.model_name, u.tin, u.tout, { write: u.cw, read: u.cr }).catch(() => {});
    }
    text = text.trim().slice(0, 80);
    if (!text) return NextResponse.json({ mood });

    await admin.from("pet_messages").insert({
      user_id: user.id,
      role: "pet",
      content: text,
      context: { kind: "auto", path },
    });

    return NextResponse.json({ mood, autoMessage: text });
  } catch (e) {
    return NextResponse.json({ mood });
  }
}
