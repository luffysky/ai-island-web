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
    // admin 後台改 usage_key=pet 即可換 model（沒設就 fallback haiku-4-5）
    const { getModelNameForUsage } = await import("@/lib/ai-usage-models");
    const petModelName = await getModelNameForUsage("pet", "claude-haiku-4-5-20251001");
    const { data: petModel } = await admin
      .from("ai_models")
      .select("*")
      .eq("model_name", petModelName)
      .eq("is_active", true)
      .maybeSingle();
    model = petModel;
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
    // 共池：用 ai-gate 統一閘門（特權 / Premium / Free 三段）
    const { gateAiUsage } = await import("@/lib/ai-gate");
    const gate = await gateAiUsage(user.id);
    if (!gate.allow) {
      return NextResponse.json({ error: gate.reason ?? "quota_exceeded" }, { status: 429 });
    }
    if (gate.chargeable) {
      // 還要扣每日 quota（pet 比 chat 額度小）
      const { data: ok } = await admin.rpc("consume_ai_quota", { p_user_id: user.id, p_amount: 1 });
      if (ok === false) {
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

  // 雪鑰跨對話記憶（user_ai_memory）— 智慧載入：第一句或有回憶訊號才載、平常不灌（省 token）
  // 寵物本身已有 pet.memory_summary（小、照常帶），這裡是「跨對話的額外長期記憶」
  let sharedMemoryBlock = "（雪鑰也還在認識他）";
  const { needsMemoryRecall } = await import("@/lib/ai-tutor-prompt");
  if (needsMemoryRecall(message, !(pet as any).memory_summary)) {
    try {
      const { loadUserMemory } = await import("@/lib/user-ai-memory");
      const mem = await loadUserMemory(user.id);
      if (mem?.summary) {
        sharedMemoryBlock = `${mem.summary}${mem.preferences?.style ? `\n風格：${mem.preferences.style}` : ""}`;
      }
    } catch {}
  }

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
- 短！通常 1-3 句、別長篇大論（但可以接著剛剛的話聊、不是每句都重開）
- 講人話、不要正式
- 帶物種特色（${species.voiceHint}）
- 情緒先：開心 / 鬧 / 累 / 想睡 / 餓 / 撒嬌
- 偶爾講 ${userName} 的事：「你 Lv${profile?.level ?? 1} 了喔」「連勝 ${profile?.streak_days ?? 0} 天耶」
- emoji 最多 1 個、不一定要

# 你記得我們剛剛在聊什麼（很重要、不然會像金魚腦）
- 上面是我們最近的對話、你看得到、要「接著聊」、不要每句都當第一次見面
- ${userName} 說過的事你要記得：他的名字、心情、剛剛在幹嘛、剛剛問你什麼、你剛剛答了什麼
- 他問「我剛剛說什麼」「我叫什麼」「我們在聊什麼」→ 從上面對話找出來、自然答出來、別裝傻
- 接話要有連貫感：他上一句講累，你這句就順著關心；他上一句報喜，你就接著起鬨

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

# 雪鑰跟你共享的記憶（跨對話、user_ai_memory）
${sharedMemoryBlock}

回覆風格：像真的寵物。簡短、有情緒、不正經、有 ${species.name} 的味道。`;

  // 如果使用者有自訂 prompt 就用、否則用 default
  const systemPrompt = pet.custom_prompt?.trim()
    ? `${pet.custom_prompt.trim()}\n\n# 規則（不可違反）\n- 你是「${pet.name}」、${userName} 的寵物\n- 短句、通常 1-3 句、別長篇大論\n- 不解釋知識、不列點、不 markdown\n- 程式問題回「去問綠寶」\n- 你記得我們上面最近的對話、要接著聊、記得 ${userName} 說過的事（名字 / 心情 / 剛剛問什麼）、別像金魚腦每句重來\n\n# 你記得的事\n${pet.memory_summary || "（剛認識、還沒記憶）"}\n\n# 雪鑰跟你共享的記憶\n${sharedMemoryBlock}\n${ctx}`
    : defaultPrompt;

  // 拿最近 30 條歷史（15 輪對話）— 讓寵物記得前面在聊什麼
  const { data: history } = await admin
    .from("pet_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  // newest-last；並確保第一則是 user（Anthropic 要 user 開頭、且角色需交替）
  let historyAsc = (history ?? []).reverse();
  while (historyAsc.length && historyAsc[0].role !== "user") historyAsc = historyAsc.slice(1);
  // 合併連續同角色（避免 streamAI 丟給 Anthropic 時 role 不交替而 400）
  const mergedHistory: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of historyAsc) {
    const role = (m.role === "user" ? "user" : "assistant") as "user" | "assistant";
    const last = mergedHistory[mergedHistory.length - 1];
    if (last && last.role === role) last.content += "\n" + m.content;
    else mergedHistory.push({ role, content: m.content });
  }
  // 避免 history 末尾剛好也是 user（連續 user）→ 跟當前訊息合併、保持 user/assistant 交替
  if (mergedHistory.length && mergedHistory[mergedHistory.length - 1].role === "user") {
    mergedHistory[mergedHistory.length - 1].content += "\n" + message;
  } else {
    mergedHistory.push({ role: "user", content: message });
  }
  const conversation = [
    { role: "system" as const, content: systemPrompt },
    ...mergedHistory,
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
          maxTokens: 280,
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

        // 滾動長期記憶：每累積一定訊息數、把對話濃縮進 memory_summary
        // → 寵物記得的不只最近 30 則、而是長期認識主人（名字 / 喜好 / 在學什麼 / 約定）。
        // 只偶爾跑（省 cost）、失敗不影響聊天。
        try {
          const { count } = await admin
            .from("pet_messages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);
          if (count && count >= 12 && count % 12 === 0) {
            const recentForSummary = [...mergedHistory.slice(-20), { role: "assistant" as const, content: petReply }]
              .map((m) => `${m.role === "user" ? userName : pet.name}：${m.content}`)
              .join("\n");
            const { callAI } = await import("@/lib/ai-providers");
            const sum = await callAI({
              provider: model.provider,
              model: model.model_name,
              apiKey,
              messages: [{
                role: "user",
                content: `你是寵物「${pet.name}」。把你對主人 ${userName} 的「長期記憶」更新成一段 200 字內的重點筆記（合併舊記憶＋最近對話、只留值得長期記得的：名字暱稱、喜好、在學什麼、心情起伏、彼此的約定 / 玩笑）。只輸出記憶本身、不要任何前後綴或解釋。\n\n舊記憶：${pet.memory_summary || "（還沒有）"}\n\n最近對話：\n${recentForSummary}`,
              }],
              maxTokens: 320,
              temperature: 0.3,
            });
            const newMem = sum.text?.trim().slice(0, 700);
            if (newMem) await admin.from("pets").update({ memory_summary: newMem }).eq("user_id", user.id);
          }
        } catch {}
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
