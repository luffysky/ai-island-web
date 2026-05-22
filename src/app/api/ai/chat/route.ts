import { NextRequest } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { streamAI, estimateCost } from "@/lib/ai-providers";
import { buildTutorSystemPrompt } from "@/lib/ai-tutor-prompt";
import { decryptKey } from "@/lib/ai-crypto";
import { rateLimit } from "@/lib/rate-limit";
import { hasAiUnlimited } from "@/lib/ai-privilege";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("unauthorized", 401);

  // Rate limit: 每用戶 60 次/分鐘（聊天會稍頻繁）
  const rl = rateLimit(`ai:${user.id}`, 60, 60_000);
  if (!rl.ok) {
    return errorResponse("rate_limited", 429, `太頻繁、${rl.retryAfter} 秒後再試`);
  }

  const body = await req.json();
  const { conversationId, modelId, message, tone, contextChapterId, contextLessonId, useBYOK, personaId } = body;

  if (!message || !modelId) return errorResponse("missing_params", 400);

  const admin = createSupabaseAdmin();

  // 1. 取模型
  const { data: model, error: modelError } = await admin.from("ai_models").select("*").eq("id", modelId).single();
  if (modelError) return errorResponse("model_lookup_failed", 500, modelError.message);
  if (!model || !model.is_active) return errorResponse("model_unavailable", 400);

  // 2. 取 API key
  let apiKey: string;
  if (useBYOK) {
    const { data: userKey } = await admin
      .from("user_api_keys")
      .select("api_key_encrypted, is_active")
      .eq("user_id", user.id)
      .eq("provider", model.provider)
      .single();
    if (!userKey || !userKey.is_active) {
      return errorResponse("no_user_key", 400, `請先到設定加 ${model.provider} 的 API key`);
    }
    try {
      apiKey = decryptKey(userKey.api_key_encrypted);
    } catch {
      return errorResponse("key_decrypt_failed", 500);
    }
  } else {
    // 特權帳號（ai_unlimited 或 admin）跳過扣免費 quota、直接用系統 key
    const unlimited = await hasAiUnlimited(user.id);
    if (!unlimited) {
      // 扣免費 quota
      const { data: quotaOk, error: quotaError } = await admin.rpc("consume_ai_quota", { p_user_id: user.id, p_amount: 1 });
      if (quotaError) {
        console.error("[AI chat] consume_ai_quota failed:", quotaError);
        return errorResponse("quota_rpc_failed", 500, "AI 額度系統尚未設定完成，請確認 ai_migration.sql 已執行");
      }
      if (quotaOk === false) {
        return errorResponse("quota_exceeded", 429, "今天的免費額度用完了、可升級 Premium 或自帶 API key（設定 → AI Key）");
      }
    }
    const { data: sysKey, error: sysKeyError } = await admin
      .from("ai_api_keys")
      .select("api_key_encrypted, enabled, monthly_budget_usd, used_this_month_usd")
      .eq("provider", model.provider)
      .maybeSingle();
    if (sysKeyError) {
      console.error("[AI chat] system key lookup failed:", sysKeyError);
      return errorResponse("system_key_lookup_failed", 500, "AI 系統 key 查詢失敗");
    }
    if (!sysKey || !sysKey.enabled) {
      return errorResponse("system_key_unavailable", 503, `${model.provider} 暫時無法使用`);
    }
    if (Number(sysKey.monthly_budget_usd ?? 0) <= 0) {
      return errorResponse("budget_not_configured", 503, `${model.provider} 月預算尚未設定`);
    }
    if (Number(sysKey.used_this_month_usd ?? 0) >= Number(sysKey.monthly_budget_usd ?? 0)) {
      return errorResponse("budget_exceeded", 429, "本月系統額度已用完、請自帶 API key");
    }
    try {
      apiKey = decryptKey(sysKey.api_key_encrypted);
    } catch {
      return errorResponse("key_decrypt_failed", 500);
    }
  }

  // 3. 取 / 建 conversation
  let convId = conversationId;
  if (!convId) {
    const { data: newConv, error: convError } = await admin
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        title: message.slice(0, 60),
        model_id: modelId,
        tone: tone ?? "friendly",
        context_chapter_id: contextChapterId,
        context_lesson_id: contextLessonId,
        use_byok: !!useBYOK,
      })
      .select("id")
      .single();
    if (convError) {
      console.error("[AI chat] conversation create failed:", convError);
      return errorResponse("conv_create_failed", 500, convError.message);
    }
    convId = newConv?.id;
  }

  if (!convId) return errorResponse("conv_create_failed", 500);

  // 4. 取歷史
  const { data: history } = await admin
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(20);

  // 5. 組 messages
  const systemPrompt = buildTutorSystemPrompt({
    tone: tone ?? "friendly",
    contextChapterId,
    contextLessonId,
    personaId,
  });

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(history || []).map((m: any) => ({ role: m.role as any, content: m.content })),
    { role: "user" as const, content: message },
  ];

  // 6. 存 user message
  const { error: userMessageError } = await admin.from("ai_messages").insert({
    conversation_id: convId,
    role: "user",
    content: message,
  });
  if (userMessageError) {
    console.error("[AI chat] user message insert failed:", userMessageError);
    return errorResponse("message_create_failed", 500, userMessageError.message);
  }

  // 7. Stream AI 回應
  const t0 = Date.now();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // 先送 conversation ID（前端要記下來繼續對話）
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "init", conversationId: convId })}\n\n`));

      let fullText = "";
      let tokensInput = 0;
      let tokensOutput = 0;
      let streamError = "";

      try {
        for await (const chunk of streamAI({
          provider: model.provider,
          model: model.model_name,
          apiKey,
          messages,
          maxTokens: 2000,
        })) {
          if (chunk.type === "text" && chunk.text) {
            fullText += chunk.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`));
          } else if (chunk.type === "done") {
            tokensInput = chunk.tokensInput ?? 0;
            tokensOutput = chunk.tokensOutput ?? 0;
          } else if (chunk.type === "error") {
            streamError = chunk.error || "AI provider error";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: streamError })}\n\n`));
          }
        }

        if (streamError) {
          await admin.from("ai_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: "",
            model_used: `${model.provider}/${model.model_name}`,
            error: streamError,
            latency_ms: Date.now() - t0,
          });
          return;
        }

        const cost = estimateCost(
          tokensInput,
          tokensOutput,
          Number(model.cost_input_per_1m),
          Number(model.cost_output_per_1m)
        );

        // 存 assistant message
        await admin.from("ai_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: fullText,
          model_used: `${model.provider}/${model.model_name}`,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          cost_usd: cost,
          latency_ms: Date.now() - t0,
        });

        // 更新對話時間
        await admin
          .from("ai_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);

        // Daily 使用量
        const today = new Date().toISOString().slice(0, 10);
        try {
          await admin.rpc("upsert_ai_usage", {
            p_date: today,
            p_user_id: user.id,
            p_model_id: modelId,
            p_provider: model.provider,
            p_tokens_in: tokensInput,
            p_tokens_out: tokensOutput,
            p_cost: cost,
          });
        } catch {}

        if (!useBYOK) {
          try {
            await admin.rpc("inc_system_key_usage", { p_provider: model.provider, p_cost: cost });
          } catch {}
        }

        // 送結尾
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "done",
          tokensInput,
          tokensOutput,
          cost: Number(cost.toFixed(6)),
        })}\n\n`));
      } catch (e: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: e.message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function errorResponse(error: string, status: number, message?: string) {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
