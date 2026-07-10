import { NextRequest } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { streamAI, estimateCost, billableInputTokens } from "@/lib/ai-providers";
import { pickFallbackModel, pickFallbackModelExcluding, isQuotaOrTransientError, providerFromModel } from "@/lib/resolve-usage-ai";
import { buildTutorSystemPrompt } from "@/lib/ai-tutor-prompt";
import { getUserLearningState, formatLearningStateForPrompt } from "@/lib/user-learning-state";
import { decryptKey } from "@/lib/ai-crypto";
import { rateLimit } from "@/lib/rate-limit";
import { hasAiUnlimited } from "@/lib/ai-privilege";
import { lookupCache, lookupSemanticCache, writeCache, bumpHit } from "@/lib/ai-cache";
import { scanContent, flagContent } from "@/lib/moderation";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (e: any) {
    // outer guard：之前 route 內部分支沒包 try、出問題會回 Next.js 預設 500（無訊息）
    // 包一層後、500 至少帶簡短訊息給 widget 顯示、stack 進 server log 給我查
    console.error("[AI chat] uncaught:", e?.stack || e?.message || e);
    const hint = (e?.message ?? "").toString().slice(0, 120);
    return errorResponse(
      "internal_error",
      500,
      hint ? `AI 內部錯誤：${hint}` : "AI 內部錯誤、已記錄、請稍後再試",
    );
  }
}

async function handlePost(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("unauthorized", 401);

  // Rate limit: 每用戶 60 次/分鐘（聊天會稍頻繁）
  const rl = rateLimit(`ai:${user.id}`, 60, 60_000);
  if (!rl.ok) {
    return errorResponse("rate_limited", 429, `太頻繁、${rl.retryAfter} 秒後再試`);
  }

  const body = await req.json();
  const { conversationId, modelId, message, tone, contextChapterId, contextLessonId, useBYOK, personaId, spendZcoin } = body;
  // 上傳的圖片（base64 + mediaType）— 跟 message 一起送、AI 看圖回答
  const images: Array<{ base64: string; mediaType: string }> = Array.isArray(body.images)
    ? body.images.slice(0, 5).map((img: any) => ({
        base64: String(img?.base64 ?? "").slice(0, 8_000_000),
        mediaType: String(img?.mediaType ?? "image/png"),
      })).filter((img: any) => img.base64)
    : [];

  if ((!message && images.length === 0) || !modelId) return errorResponse("missing_params", 400);

  const admin = createSupabaseAdmin();

  // 權限（一次算，給「模型分層」與「額度」共用）：特權(ai_unlimited/owner)視為 pro。
  const unlimited = await hasAiUnlimited(user.id);
  const { getUserSubTier } = await import("@/lib/payments/orders");
  const subTier = unlimited ? "pro" : (useBYOK ? null : await getUserSubTier(user.id)); // "plus" | "pro" | null
  const canHigh = unlimited || subTier === "pro" || !!useBYOK;   // 可用高階模型（Claude/GPT/Gemini 等）
  const canPickModel = canHigh || subTier === "plus";            // 可自選模型（免費不行、一律 auto）

  // 1. 取模型：免費強制 auto；auto 依難度分級（特權→最高階、免費/Plus→排除 high）；自選則檢查分層授權
  let model: any;
  if (modelId === "auto" || !canPickModel) {
    const { data: actives } = await admin.from("ai_models").select("*").eq("is_active", true);
    const { classifyDifficulty, pickModelByTier } = await import("@/lib/ai-difficulty");
    let tier = classifyDifficulty(message ?? "", { hasImages: images.length > 0 });
    let pool = actives ?? [];
    if (unlimited) {
      tier = "high";                                       // 特權 auto 直接跑最高階
    } else if (!canHigh) {
      pool = (pool as any[]).filter((m) => m.tier !== "high"); // 免費 / Plus 不給高階
      if (tier === "high") tier = "mid";
    }
    model = pickModelByTier(pool, tier);
    if (!model) return errorResponse("model_unavailable", 400, "目前沒有可用模型");
  } else {
    // Plus / Pro / 特權 / BYOK 可自選模型
    const { data, error: modelError } = await admin.from("ai_models").select("*").eq("id", modelId).single();
    if (modelError) return errorResponse("model_lookup_failed", 500, modelError.message);
    if (!data || !data.is_active) return errorResponse("model_unavailable", 400);
    model = data;
    // Plus 選了高階 → 降級（高階僅 Pro / 特權 / BYOK）
    if (model.tier === "high" && !canHigh) {
      const { data: actives } = await admin.from("ai_models").select("*").eq("is_active", true);
      const { pickModelByTier } = await import("@/lib/ai-difficulty");
      const pool = ((actives ?? []) as any[]).filter((m) => m.tier !== "high");
      const safe = pickModelByTier(pool, "mid") ?? pickModelByTier(pool, "low");
      if (safe) model = safe;
    }
  }
  const effectiveModelId = model.id;

  // 2. 取 API key
  let apiKey = "";
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
    // 模型分層授權已在步驟 1 處理。此處管每日額度（v2）：
    //   免費用戶：免費/中階模型每日 AI_FREE_DAILY 次；超過 → 每次扣 Z幣續用。
    //   Plus/Pro：免費/中階無限；高階模型每日有限(highDailyFor)；超過 → 每次扣 Z幣加購。
    //   特權(unlimited)：全部不限。
    if (!unlimited) {
      const isHigh = model.tier === "high";
      const skipQuota = !isHigh && !!subTier; // 訂閱者的免費/中階模型：無限
      if (!skipQuota) {
        const { AI_FREE_DAILY, AI_ZCOIN_FREE_OVERFLOW, AI_ZCOIN_HIGH_OVERFLOW, highDailyFor } = await import("@/lib/ai-quota-config");
        const kind = isHigh ? "high" : "free";
        const limit = isHigh ? highDailyFor(subTier) : AI_FREE_DAILY;
        const price = isHigh ? AI_ZCOIN_HIGH_OVERFLOW : AI_ZCOIN_FREE_OVERFLOW;
        const { data: q, error: qErr } = await admin.rpc("consume_ai_quota_v2", {
          p_user_id: user.id, p_kind: kind, p_daily_limit: limit, p_zcoin_price: price, p_allow_zcoin: !!spendZcoin,
        });
        if (qErr) {
          console.error("[AI chat] consume_ai_quota_v2 failed:", qErr);
          return errorResponse("quota_rpc_failed", 500, "AI 額度系統尚未設定完成，請執行 ai_quota_v2_migration.sql");
        }
        if (!(q as any)?.ok) {
          const reason = (q as any)?.reason;
          if (reason === "need_zcoin") {
            return errorResponse("need_zcoin", 402, `今天的${isHigh ? "高階模型" : "免費"}額度用完了，花 ${price} Z幣續用一次？`, { price, kind });
          }
          if (reason === "insufficient_zcoin") {
            return errorResponse("insufficient_zcoin", 402, `Z幣不足（需 ${(q as any).price}、你有 ${(q as any).balance}）`, { price: (q as any).price, balance: (q as any).balance });
          }
          return errorResponse("quota_exceeded", 429, "額度用完了、明天再來或升級方案");
        }
      }
    }
    // 選的 provider 若沒 key/停用/超系統月預算 → 靜默換一家可用的 active 模型（就算使用者選了 Claude 也照切、不跟使用者說額度不足）。
    // 只有「所有模型都沒得用」才回報（訊息通用）。per-user 免費 quota（上面）仍照舊，屬使用者自己的額度、不在此。
    const triedKey = new Set<string>();
    let gotKey = false;
    for (let i = 0; i < 6 && !gotKey; i++) {
      triedKey.add(model.provider);
      const { data: sysKey } = await admin
        .from("ai_api_keys")
        .select("api_key_encrypted, enabled, monthly_budget_usd, used_this_month_usd")
        .eq("provider", model.provider)
        .maybeSingle();
      const budget = Number(sysKey?.monthly_budget_usd ?? 0);
      const used = Number(sysKey?.used_this_month_usd ?? 0);
      // 有預算設定就檢查是否超支；沒設預算(=0)當作不限制（別因為沒設定就擋死）
      const usable = !!sysKey && sysKey.enabled && (budget <= 0 || used < budget);
      if (usable) {
        try { apiKey = decryptKey(sysKey!.api_key_encrypted); gotKey = true; break; } catch { /* 解密失敗 → 換一家 */ }
      }
      // 換一家還沒試過、有 key 的 active 模型
      const fb = await pickFallbackModelExcluding(triedKey).catch(() => null);
      if (!fb) break;
      const { data: fbRow } = await admin.from("ai_models").select("*").eq("model_name", fb.model).eq("is_active", true).maybeSingle();
      if (!fbRow) { triedKey.add(fb.provider); continue; }
      model = fbRow; apiKey = fb.apiKey; gotKey = true; break; // fb.apiKey 已解密、可直接用
    }
    if (!gotKey) {
      return errorResponse("ai_busy", 503, "AI 現在有點忙，請稍後再試 🙏");
    }
  }

  // 3. 取 / 建 conversation — 新建時扣 tutor_thread 月 quota（特權 / Premium 跳過）
  let convId = conversationId;
  if (!convId) {
    // 開新對話串、扣 tutor_thread 月配額（free 10/月、達上限拒）
    const { requireAiAction } = await import("@/lib/ai-gate");
    const tutorGate = await requireAiAction(user.id, "tutor_thread");
    if (!tutorGate.ok) {
      return errorResponse(tutorGate.error ?? "tutor_quota_exceeded", 429,
        tutorGate.reason ?? "本月 AI 導師對話串已用完");
    }
    const { data: newConv, error: convError } = await admin
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        title: (message?.trim() ? message : "🖼️ 圖片").slice(0, 60),
        model_id: effectiveModelId,
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

  // 5. 組 messages — 注入學員學習狀態 (AI 導師知道在跟誰對話、能個人化)
  const learningState = await getUserLearningState(user.id);
  let userContext = learningState ? formatLearningStateForPrompt(learningState) : undefined;

  // 5.1 #4 RAG：語意檢索「跟這個問題最相關的章節」、注入 context（殺幻覺、引用更準）。
  //     閒聊 / 太短不檢索（省 embedding call + 延遲）；pgvector 失敗自動略過、不影響回答。
  try {
    if (message && message.trim().length >= 8) {
      const { vectorSearchLessons } = await import("@/lib/ai-embeddings");
      const hits = await vectorSearchLessons(message, 4);
      if (hits.length) {
        const block = "## 與此問題語意最相關的 AI 島章節（優先引用、不確定就以這裡為準）\n" +
          hits.map((h) => `- Ch${h.chapter_id}「${h.title}」：${String(h.summary ?? "").replace(/\s+/g, " ").slice(0, 160)}`).join("\n");
        userContext = userContext ? `${userContext}\n\n${block}` : block;
      }
    }
  } catch (e: any) {
    console.warn("[ai chat] RAG retrieve failed:", e?.message);
  }

  // 拿 user role + username + email 給 AI 認得董事長 (多 signal 識別)
  const { data: profileForRole } = await admin
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();
  const userRole = (profileForRole as any)?.role ?? null;
  const userUsername = (profileForRole as any)?.username ?? null;
  const userEmail = user.email ?? null;

  const systemPrompt = await buildTutorSystemPrompt({
    tone: tone ?? "friendly",
    contextChapterId,
    contextLessonId,
    personaId,
    userContext,
    userId: user.id,
    userUsername,
    userRole,
    userEmail,
    modelProvider: model.provider,
    modelName: model.model_name,
    currentMessage: message,
    historyCount: history?.length ?? 0,
  });

  // user message：有圖片時用 multimodal content array、純文字保持 string。
  // 只傳圖、沒打字 → 不塞 placeholder 文字 block、直接傳圖（模型仍會看圖回答）。
  const userContent: any = images.length > 0
    ? [
        ...(message && message.trim() ? [{ type: "text", text: message }] : []),
        ...images.map((img) => ({ type: "image", mediaType: img.mediaType, data: img.base64 })),
      ]
    : message;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(history || []).map((m: any) => ({ role: m.role as any, content: m.content })),
    { role: "user" as const, content: userContent },
  ];

  // 5.5 快取查詢（只在「對話第一則訊息」時查）
  const isFirstMessage = !history || history.length === 0;
  const cacheKey = {
    tone: tone ?? null,
    personaId: personaId ?? null,
    contextChapterId: contextChapterId ?? null,
    contextLessonId: contextLessonId ?? null,
  };
  // 精確快取(question_hash)先查；沒中且無圖片 → 再用語意快取找相似問題（省 LLM 呼叫）
  const cached = isFirstMessage
    ? (await lookupCache(message, cacheKey)) ||
      (images.length === 0 && message ? await lookupSemanticCache(message, cacheKey) : null)
    : null;

  // 6. 存 user message
  const { error: userMessageError } = await admin.from("ai_messages").insert({
    conversation_id: convId,
    role: "user",
    content: message,
  });

  // 6.1 L1 keyword 審核（user 訊息、fail-soft、不阻斷）
  scanContent(message).then((hit) => {
    if (hit) flagContent({
      userId: user.id,
      role: "user",
      content: message,
      conversationId: convId,
      hit,
    });
  }).catch(() => {});
  if (userMessageError) {
    console.error("[AI chat] user message insert failed:", userMessageError);
    return errorResponse("message_create_failed", 500, userMessageError.message);
  }

  // 6.5 快取命中 → SSE 回放、不呼叫 AI、不扣 quota
  if (cached) {
    const encoder = new TextEncoder();
    const cachedStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "init", conversationId: convId })}\n\n`));
        const chunkSize = 24;
        for (let i = 0; i < cached.answer.length; i += chunkSize) {
          const piece = cached.answer.slice(i, i + chunkSize);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: piece })}\n\n`));
          await new Promise((r) => setTimeout(r, 30));
        }
        try {
          await admin.from("ai_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: cached.answer,
            model_used: "cache",
            tokens_input: 0,
            tokens_output: 0,
            cost_usd: 0,
            latency_ms: 0,
          });
          await admin.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
          await bumpHit(cached.id);
        } catch (e) {
          console.warn("[ai chat] cache flow followup failed:", e);
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "done", tokensInput: 0, tokensOutput: 0, cost: 0, fromCache: true,
        })}\n\n`));
        controller.close();
      },
    });
    return new Response(cachedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
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
      let cacheWriteTokens = 0;
      let cacheReadTokens = 0;
      let streamError = "";
      // 實際回答的模型（可能因主模型額度滿/限流被自動換成備援）
      let usedProvider = model.provider;
      let usedModel = model.model_name;

      try {
        // 串流；主模型「還沒吐字就 error」（額度用完/限流/掛掉）→ 自動換備援模型「一路退到底」、使用者無感。
        // 就算使用者選了 Claude、額度沒了也照樣切模型；只有「所有模型都沒得用」才回報（且訊息通用、不提額度）。
        const tried = new Set<string>([model.provider]);
        const attempts: Array<{ provider: string; model: string; apiKey: string }> = [
          { provider: model.provider, model: model.model_name, apiKey },
        ];
        for (let i = 0; i < attempts.length; i++) {
          const a = attempts[i];
          let gotError = "";
          // 放寬回覆長度：8192 是各家模型都支援的輸出上限、實務上等於不限制一般問答。
          for await (const chunk of streamAI({ provider: a.provider, model: a.model, apiKey: a.apiKey, messages, maxTokens: 8192 })) {
            if (chunk.type === "text" && chunk.text) {
              fullText += chunk.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`));
            } else if (chunk.type === "done") {
              tokensInput = chunk.tokensInput ?? 0;
              tokensOutput = chunk.tokensOutput ?? 0;
              cacheWriteTokens = chunk.cacheWriteTokens ?? 0;
              cacheReadTokens = chunk.cacheReadTokens ?? 0;
            } else if (chunk.type === "error") {
              gotError = chunk.error || "AI provider error";
            }
          }
          if (!gotError) { usedProvider = a.provider; usedModel = a.model; break; }
          // 還沒吐任何字 + 額度/限流類錯誤 → 換下一個「還沒試過」的備援模型，一路退到底
          if (!fullText && isQuotaOrTransientError(gotError)) {
            const fb = await pickFallbackModelExcluding(tried).catch(() => null);
            if (fb) { tried.add(fb.provider); attempts.push({ provider: fb.provider, model: fb.model, apiKey: fb.apiKey }); continue; }
          }
          // 全部模型都試過/失敗 or 已吐字一半才壞 → 回報（訊息通用、不跟使用者提「額度不足」）
          streamError = gotError; // server 端仍記真實錯誤
          usedProvider = a.provider; usedModel = a.model;
          const clientMsg = fullText
            ? "回應中途中斷了，請再送一次 🙏"
            : "AI 現在有點忙（暫時沒有可用的模型），請稍後再試 🙏";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: clientMsg })}\n\n`));
          break;
        }

        if (streamError) {
          await admin.from("ai_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: "",
            model_used: `${usedProvider}/${usedModel}`,
            error: streamError,
            latency_ms: Date.now() - t0,
          });
          return;
        }

        // 含 Anthropic prompt-cache 的等效 input（否則快取後 input_tokens 幾乎為 0、成本會被嚴重低估）
        const billIn = billableInputTokens(tokensInput, cacheWriteTokens, cacheReadTokens);
        const cost = estimateCost(
          billIn,
          tokensOutput,
          Number(model.cost_input_per_1m),
          Number(model.cost_output_per_1m)
        );
        // tokens_input 記實際處理量（含 cache）
        tokensInput = tokensInput + cacheWriteTokens + cacheReadTokens;

        // 存 assistant message
        await admin.from("ai_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: fullText,
          model_used: `${usedProvider}/${usedModel}`,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          cost_usd: cost,
          latency_ms: Date.now() - t0,
        });

        // 寫快取：只在「第一則訊息 + 有內容」時
        if (isFirstMessage && fullText) {
          writeCache(message, fullText, `${usedProvider}/${usedModel}`, cacheKey);
        }

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
            p_model_id: effectiveModelId,
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
          // per-model 月聚合（ai_model_usage）——全站最大宗的主聊天用量以前漏記進 per-model 儀表板。
          // 用實際回答的模型（Auto/退備援時可能非原選）；tokensInput 此處已含 cache。不重複計 inc_system_key_usage。
          try {
            await admin.rpc("inc_model_usage", {
              p_month: new Date().toISOString().slice(0, 7),
              p_provider: usedProvider || model.provider,
              p_model: usedModel || model.model_name,
              p_tin: tokensInput,
              p_tout: tokensOutput,
              p_cost: cost,
            });
          } catch {}
        }

        // 送結尾
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "done",
          tokensInput,
          tokensOutput,
          cost: Number(cost.toFixed(6)),
          // 顯示實際回答的模型（Auto 模式 / 自動退備援時都讓前端看到真正用的那個）
          modelUsed: usedModel !== model.model_name ? usedModel : (model.display_name || model.model_name),
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

function errorResponse(error: string, status: number, message?: string, extra?: Record<string, any>) {
  return new Response(JSON.stringify({ error, message, ...(extra ?? {}) }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
