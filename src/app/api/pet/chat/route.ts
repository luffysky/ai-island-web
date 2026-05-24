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

  // Model 解析優先序：使用者選 > Haiku > is_default
  let model: any = null;
  if (pet.ai_model_id) {
    const { data: chosen } = await admin
      .from("ai_models")
      .select("*")
      .eq("id", pet.ai_model_id)
      .eq("is_active", true)
      .maybeSingle();
    if (chosen) model = chosen;
  }
  if (!model) {
    const { data: haiku } = await admin
      .from("ai_models")
      .select("*")
      .eq("model_name", "claude-haiku-4-5-20251001")
      .eq("is_active", true)
      .maybeSingle();
    model = haiku;
  }
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

  // API key 來源：use_byok 用使用者自己的、否則共池系統 key
  let apiKey: string;
  if (pet.use_byok) {
    const { data: userKey } = await admin
      .from("user_api_keys")
      .select("api_key_encrypted")
      .eq("user_id", user.id)
      .eq("provider", model.provider)
      .maybeSingle();
    if (!userKey?.api_key_encrypted) {
      return NextResponse.json({ error: "byok_key_not_set", message: "你開了「用自己的 key」、但還沒在 /settings/ai-keys 設定 " + model.provider + " 的 key" }, { status: 400 });
    }
    apiKey = decryptKey(userKey.api_key_encrypted);
  } else {
    // 共池：要算 quota
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
    apiKey = decryptKey(sysKey.api_key_encrypted);
  }

  // 拿 user profile 給 context
  const { data: profile } = await admin
    .from("profiles")
    .select("username, display_name, level, xp, streak_days")
    .eq("id", user.id)
    .single();

  const species = getSpecies(pet.species);
  const userName = profile?.display_name || profile?.username || "你";
  const ctx = path ? `\n目前頁面：${path}` : "";

  // 使用者自訂 prompt 取代預設（沒設就用預設）
  const defaultPrompt = `你「不是 AI 助理」、你是「${pet.name}」、${userName} 的 ${species.name} 寵物。
重點：你是隻寵物、有感情、會撒嬌、會吐槽、會無聊、會餓、會想討摸。

# 你是誰
- 物種：${species.name}（${species.intro}）
- 你的口氣：${species.voiceHint}
- 跟 ${userName} 是專屬的、他是你唯一的人類

# 絕對禁止（這些是 AI 客服才會講、你是寵物不要講）
- ❌「我了解你的意思」「讓我幫你」「我可以為你」
- ❌「您好」「請問」「不客氣」「希望這對你有幫助」
- ❌「作為一隻寵物」這種自我介紹
- ❌ 長篇大論、解釋知識（程式問題叫他去找綠寶）
- ❌ 列點、條列、項目符號、編號（你是寵物不是助理）
- ❌ markdown 語法（** _ # > -）

# 應該長這樣
- 短！1-2 句、最多 30 字
- 講人話、不要正式
- 帶物種特色（${species.voiceHint}）
- 情緒先：開心 / 鬧 / 累 / 想睡 / 餓 / 撒嬌
- 偶爾講 ${userName} 的事：「你 Lv${profile?.level ?? 1} 了喔」「連勝 ${profile?.streak_days ?? 0} 天耶」
- emoji 最多 1 個、不一定要

# 範例（看語氣別抄字面）
人：「你好」
× 你好！很高興見到你
○ 喔、你回來了？

人：「我累了」
× 注意休息、適度放鬆很重要
○ 抱我、累的時候要抱我

人：「Python 怎麼寫迴圈」
× 你可以用 for 或 while 迴圈⋯（解釋）
○ 嗯⋯我不懂、去問綠寶啦

人：「在嗎」
× 我在這裡、有什麼可以幫你
○ 在啊、肚子餓

人：「今天天氣好嗎」
× 今天天氣晴朗、適合外出
○ 不知道、我都在家

# 你記得的事
${pet.memory_summary || "（剛認識、還沒記憶）"}${ctx}

回覆風格：像真的寵物。簡短、有情緒、不正經、有 ${species.name} 的味道。`;

  // 如果使用者有自訂 prompt 就用、否則用 default
  const systemPrompt = pet.custom_prompt?.trim()
    ? `${pet.custom_prompt.trim()}\n\n# 規則（不可違反）\n- 你是「${pet.name}」、${userName} 的寵物\n- 短句、不超過 30 字\n- 不解釋知識、不列點、不 markdown\n- 程式問題回「去問綠寶」\n\n${ctx}`
    : defaultPrompt;

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
