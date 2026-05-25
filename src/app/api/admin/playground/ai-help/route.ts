import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Nami Playground AI 助教
 *   POST { code, error, question, lang?, context? }
 *   → { text: "AI 建議..." }
 *
 * 用法：寫完 code → 點「💡 問 AI」→ AI 看 code + 錯誤、給提示 / 修法
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

  if (!code && !question) {
    return NextResponse.json({ error: "no_input", message: "至少要給 code 或 question" }, { status: 400 });
  }

  // 找一個 Anthropic / OpenAI 可用 model
  const admin = createSupabaseAdmin();
  const { data: models } = await admin
    .from("ai_models")
    .select("id, provider, model_name, is_active")
    .eq("is_active", true);
  const model = (models as any[])?.find((m) => m.provider === "anthropic")
    ?? (models as any[])?.find((m) => m.provider === "openai")
    ?? (models as any[])?.[0];
  if (!model) return NextResponse.json({ error: "no_model" }, { status: 503 });

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

  const system = `你是 Nami 的 Python / Web 學習助教。她在 AI 島後台 Playground 練習${context ? "（${context}）" : ""}。

回答原則：
1. **極簡** — 最多 5-7 句、直接給答案
2. **針對她的 code** — 不要泛談、指出她 code 哪行有問題
3. 若有 error：先用一句白話解釋 error 意思、再給修法
4. 寫程式碼用 markdown code block、標語言
5. **不誇大、不鼓動式語氣**（避免「太棒了！」「很簡單！」）
6. 用繁體中文、語氣像學長給建議
7. 若 code 看起來正確、就稱讚並建議下一步可試什麼

絕對不要：
- 大段重複她的 code
- 從基礎開始講「什麼是 Python」、她已經在練習
- 寫 emoji 連發或表情包風格`;

  const userMsg = `語言：${lang}

我的 code：
\`\`\`${lang}
${code}
\`\`\`

${errorText ? `錯誤訊息：\n\`\`\`\n${errorText}\n\`\`\`\n` : ""}${question ? `我的問題：${question}` : "請看一下、給我提示或建議。"}`;

  try {
    const r = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: 0.5,
      maxTokens: 600,
    });
    return NextResponse.json({ ok: true, text: r.text, tokens: r.tokensInput + r.tokensOutput });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_call_failed", message: e?.message }, { status: 500 });
  }
}
