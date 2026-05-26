import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI, type AIContentBlock } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Nami Playground AI 助教
 *   POST { code, error, question, lang?, context?, images?: [{base64, mediaType}] }
 *   → { text: "AI 建議..." }
 *
 * 用法：寫完 code → 點「💡 問 AI」→ AI 看 code + 錯誤 + 截圖、給提示 / 修法
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // rate limit：30/h/user
  const rl = rateLimit(`nami-ai:${user.id}`, 30, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const code = String(body.code ?? "").slice(0, 4000);
  const errorText = String(body.error ?? "").slice(0, 2000);
  const question = String(body.question ?? "").slice(0, 500);
  const lang = String(body.lang ?? "python");
  const context = String(body.context ?? "").slice(0, 200);
  // 上傳的圖片（base64 不含 data: prefix、mediaType 如 'image/png'）
  const images: Array<{ base64: string; mediaType: string }> = Array.isArray(body.images)
    ? body.images.slice(0, 5).map((img: any) => ({
        base64: String(img?.base64 ?? "").slice(0, 8_000_000),  // 單張上限 ~6MB base64（4MB 原檔）
        mediaType: String(img?.mediaType ?? "image/png"),
      })).filter((img: any) => img.base64)
    : [];

  if (!code && !question && images.length === 0) {
    return NextResponse.json({ error: "no_input", message: "至少要給 code / question / 圖片" }, { status: 400 });
  }

  // 找一個 Anthropic / OpenAI 可用 model（有圖片時必須 vision 支援）
  const admin = createSupabaseAdmin();
  const { data: models } = await admin
    .from("ai_models")
    .select("id, provider, model_name, is_active")
    .eq("is_active", true);
  const visionProviders = ["anthropic", "openai", "google"];  // 這 3 家有 vision
  const allModels = (models as any[]) ?? [];
  const model = images.length > 0
    ? allModels.find((m) => visionProviders.includes(m.provider) && (m.provider === "anthropic" || m.provider === "openai" || m.provider === "google"))
    : (allModels.find((m) => m.provider === "anthropic") ?? allModels.find((m) => m.provider === "openai") ?? allModels[0]);
  if (!model) {
    if (images.length > 0) {
      return NextResponse.json({
        error: "no_vision_model",
        message: "沒有支援圖片的 AI model（要 Anthropic / OpenAI / Gemini）、到 /admin/ai/models 啟用",
      }, { status: 503 });
    }
    return NextResponse.json({ error: "no_model" }, { status: 503 });
  }

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) {
    return NextResponse.json({ error: "no_api_key", message: `${model.provider} 沒設 API key (到 /admin/ai/models)` }, { status: 503 });
  }
  let apiKey: string;
  try {
    apiKey = decryptKey((sysKey as any).api_key_encrypted);
  } catch {
    return NextResponse.json({ error: "decrypt_failed" }, { status: 500 });
  }

  const system = `你是 Nami 的 Python / Web 學習助教。她在 AI 島後台 Playground 練習${context ? `（${context}）` : ""}。

回答原則：
1. **極簡** — 最多 5-7 句、直接給答案
2. **針對她的 code / 截圖** — 不要泛談、指出她哪行有問題
3. 若有 error：先用一句白話解釋 error 意思、再給修法
4. 寫程式碼用 markdown code block、標語言
5. **不誇大、不鼓動式語氣**（避免「太棒了！」「很簡單！」）
6. 用繁體中文、語氣像學長給建議
7. 若 code 看起來正確、就稱讚並建議下一步可試什麼
8. **有附圖時**：直接看圖回答她的問題（截圖通常是錯誤畫面、UI bug、或想參考的設計）

絕對不要：
- 大段重複她的 code
- 從基礎開始講「什麼是 Python」、她已經在練習
- 寫 emoji 連發或表情包風格`;

  const userMsg = `語言：${lang}

${code ? `我的 code：\n\`\`\`${lang}\n${code}\n\`\`\`\n` : ""}${errorText ? `錯誤訊息：\n\`\`\`\n${errorText}\n\`\`\`\n` : ""}${images.length > 0 ? `（含 ${images.length} 張截圖、請一起看）\n` : ""}${question ? `我的問題：${question}` : "請看一下、給我提示或建議。"}`;

  // multimodal user content：text + 圖片 block
  const userContent: AIContentBlock[] = [
    { type: "text", text: userMsg },
    ...images.map((img) => ({ type: "image" as const, mediaType: img.mediaType, data: img.base64 })),
  ];

  try {
    const r = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: images.length > 0 ? userContent : userMsg },
      ],
      temperature: 0.5,
      maxTokens: 800,
    });
    return NextResponse.json({ ok: true, text: r.text, tokens: r.tokensInput + r.tokensOutput });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_call_failed", message: e?.message }, { status: 500 });
  }
}
