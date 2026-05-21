import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { callAI } from "@/lib/ai-providers";
import { decryptKey } from "@/lib/ai-crypto";
import { rateLimit } from "@/lib/rate-limit";
import { hasAiUnlimited } from "@/lib/ai-privilege";

export const maxDuration = 60;

// 四種寫作模式的 prompt
const MODE_PROMPTS: Record<string, string> = {
  outline:
    "你是部落格寫作助手。根據使用者給的主題、產生一份條理清楚的文章大綱（用 markdown 標題與重點列出）。只回大綱、不要多餘說明。",
  expand:
    "你是部落格寫作助手。把使用者給的片段或重點、擴寫成完整、流暢、有溫度的段落。保持原意、用繁體中文、口語但專業。",
  polish:
    "你是部落格寫作助手。潤飾使用者給的文字：修正語病、讓句子更通順自然、保留原本語氣與意思。只回潤飾後的文字。",
  rewrite:
    "你是部落格寫作助手。用不同的說法改寫使用者給的文字、保持原意但換個風格表達。只回改寫後的文字。",
  summary:
    "你是部落格寫作助手。把使用者給的文章內容、濃縮成一段 2-3 句的摘要、適合放在文章列表。只回摘要。",
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 限流：每人每分鐘 20 次
  const rl = rateLimit(`blog-ai:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited", message: `太頻繁、${rl.retryAfter} 秒後再試` }, { status: 429 });
  }

  const body = await req.json();
  const mode = body.mode as string;
  const text = (body.text ?? "").trim();

  if (!MODE_PROMPTS[mode]) {
    return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "empty_text" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 取預設模型
  const { data: model } = await admin
    .from("ai_models")
    .select("*")
    .eq("is_active", true)
    .eq("is_default", true)
    .maybeSingle();

  if (!model) {
    return NextResponse.json(
      { error: "no_model", message: "尚未設定 AI 模型、請聯絡管理員" },
      { status: 503 }
    );
  }

  // 取系統 key
  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled, monthly_budget_usd, used_this_month_usd")
    .eq("provider", model.provider)
    .maybeSingle();

  if (!sysKey || !sysKey.enabled) {
    return NextResponse.json(
      { error: "key_unavailable", message: `${model.provider} 暫時無法使用` },
      { status: 503 }
    );
  }
  const unlimited = await hasAiUnlimited(user.id);
  if (!unlimited && sysKey.used_this_month_usd >= sysKey.monthly_budget_usd) {
    return NextResponse.json(
      { error: "budget_exceeded", message: "本月 AI 額度已用完" },
      { status: 429 }
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptKey(sysKey.api_key_encrypted);
  } catch {
    return NextResponse.json({ error: "key_decrypt_failed" }, { status: 500 });
  }

  // 呼叫 AI
  try {
    const result = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: MODE_PROMPTS[mode] },
        { role: "user", content: text },
      ],
      maxTokens: 1500,
      temperature: 0.7,
    });

    return NextResponse.json({ ok: true, result: result.text });
  } catch (e: any) {
    return NextResponse.json(
      { error: "ai_failed", message: e.message ?? "AI 生成失敗" },
      { status: 500 }
    );
  }
}
