import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { streamAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { getSpecies } from "@/lib/pet-species";
import { rateLimit } from "@/lib/rate-limit";
import { hasAiUnlimited } from "@/lib/ai-privilege";

export const maxDuration = 30;

// GET /api/pet/chat — 取最近 20 條歷史
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ messages: [] });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("pet_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // newest last
  const messages = (data ?? []).reverse().map((m: any) => ({
    role: m.role === "user" ? "user" : "pet",
    content: m.content,
  }));
  return NextResponse.json({ messages });
}

// POST /api/pet/chat — 送一則訊息、回 stream
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // rate limit per user
  const rl = rateLimit(`pet:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited", retryAfter: rl.retryAfter }, { status: 429 });
  }

  const { message, path } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 拿寵物
  const { data: pet } = await admin
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pet) return NextResponse.json({ error: "no_pet" }, { status: 400 });

  // 拿一張 Claude Haiku 4.5 模型（fallback default）
  let { data: model } = await admin
    .from("ai_models")
    .select("*")
    .eq("model_name", "claude-haiku-4-5-20251001")
    .eq("is_active", true)
    .maybeSingle();
  if (!model) {
    const { data: defaultModel } = await admin
      .from("ai_models")
      .select("*")
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle();
    model = defaultModel;
  }
  if (!model) {
    return NextResponse.json({ error: "no_model_available" }, { status: 503 });
  }

  // Key + quota（共池 ai_daily_quota）
  const unlimited = await hasAiUnlimited(user.id);
  if (!unlimited) {
    const { data: ok, error: quotaErr } = await admin.rpc("consume_ai_quota", { p_user_id: user.id, p_amount: 1 });
    if (quotaErr) {
      console.warn("[pet] quota rpc:", quotaErr.message);
    } else if (ok === false) {
      return NextResponse.json({ error: "quota_exceeded" }, { status: 429 });
    }
  }

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !sysKey.enabled) {
    return NextResponse.json({ error: "system_key_unavailable" }, { status: 503 });
  }
  const apiKey = decryptKey(sysKey.api_key_encrypted);

  // 拿 user profile 給 context
  const { data: profile } = await admin
    .from("profiles")
    .select("username, display_name, level, xp, streak_days")
    .eq("id", user.id)
    .single();

  const species = getSpecies(pet.species);
  const userName = profile?.display_name || profile?.username || "你";
  const ctx = path ? `\n目前頁面：${path}` : "";

  const systemPrompt = `你是「${pet.name}」、是 ${userName} 的 ${species.name} 寵物。
（不是 AI 導師、不是知識教學、不要長篇解釋。）

# 你的個性
- 物種：${species.name}（${species.intro}）
- 語氣風格：${species.voiceHint}
- 你陪 ${userName} 學程式、會關心他的進度、會撒嬌、會吐槽

# 對話規則
1. 用 Traditional Chinese
2. **每次最多 2-3 句話、不超過 50 字**
3. 不要解釋知識、那是 AI 導師「綠寶/肥仔/菇寶」的工作
4. 你可以提到：${userName} 是 Lv ${profile?.level ?? 1}、${profile?.xp ?? 0} XP、連勝 ${profile?.streak_days ?? 0} 天
5. 如果他問程式問題、要他「去問綠寶」「綠寶比較會」「我是寵物不是 AI 導師喵」這種短回應
6. 偶爾撒嬌、求摸摸、求餵食、求關注
7. 不要 emoji 用太多、最多 1 個

# 你記得的事
${pet.memory_summary || "（剛認識、還沒記憶）"}${ctx}

# 開始
${userName} 跟你說話、依以上規則回。簡短、有個性、像寵物。`;

  // 拿最近 10 條歷史
  const { data: history } = await admin
    .from("pet_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const historyAsc = (history ?? []).reverse();
  const conversation = [
    { role: "system" as const, content: systemPrompt },
    ...historyAsc.map((m: any) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // 寫 user message
  await admin.from("pet_messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
    context: { path },
  });

  // Stream AI
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let petReply = "";
      try {
        for await (const chunk of streamAI({
          provider: model.provider,
          model: model.model_name,
          apiKey,
          messages: conversation,
          maxTokens: 200,
        })) {
          if ((chunk as any).type === "text") {
            const text = (chunk as any).text;
            petReply += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (e: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: e.message })}\n\n`));
      }
      // 寫 pet reply + 更新 last_interacted_at
      if (petReply) {
        await admin.from("pet_messages").insert({
          user_id: user.id,
          role: "pet",
          content: petReply,
        });
        await admin
          .from("pets")
          .update({
            last_interacted_at: new Date().toISOString(),
            affinity: Math.min(1000, (pet.affinity ?? 0) + 1),
          })
          .eq("user_id", user.id);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
