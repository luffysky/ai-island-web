import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/marketing/copy/generate
 *   { topic, audience?, tone, cta?, platforms: string[] }
 *   → { ok, contents: { facebook: '...', instagram: '...', ... } }
 *
 * 用 marketing_copy_gen 的 model 設定、配 brand_voice 表的語氣守則
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "owner"].includes((profile as any).role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`mkt-copy:${user.id}`, 30, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const topic = String(body.topic ?? "").slice(0, 1500);
  const audience = String(body.audience ?? "").slice(0, 300);
  const cta = String(body.cta ?? "").slice(0, 300);
  const tone = ["casual", "professional", "playful", "urgent"].includes(body.tone) ? body.tone : "casual";
  const platforms: string[] = Array.isArray(body.platforms) ? body.platforms.slice(0, 12) : [];
  if (!topic || platforms.length === 0) return NextResponse.json({ error: "missing_params" }, { status: 400 });

  const admin = createSupabaseAdmin();

  // 1. 拿可用 model
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true);
  if (!models || models.length === 0) return NextResponse.json({ error: "no_model" }, { status: 503 });

  // 2. 用 marketing_copy_gen 或 fallback anthropic
  const model = (await pickModelForUsage("nami_help" as any, models as any[]))
    ?? (models as any[]).find((m) => m.provider === "anthropic")
    ?? (models as any[])[0];

  const { data: sysKey } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled")
    .eq("provider", model.provider)
    .maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  let apiKey: string;
  try { apiKey = decryptKey((sysKey as any).api_key_encrypted); } catch {
    return NextResponse.json({ error: "decrypt_failed" }, { status: 500 });
  }

  // 3. 拿 brand voice
  const { data: brand } = await admin.from("brand_voice").select("*").eq("id", 1).maybeSingle();
  const brandBlock = brand
    ? `
# 品牌風格守則 (必遵守)
- 品牌：${(brand as any).brand_name}
- Tagline：${(brand as any).tagline ?? "(無)"}
- 語氣：${(brand as any).voice_tone ?? "親切活潑"}
- 鼓勵用詞：${((brand as any).do_words ?? []).join(", ") || "(無設定)"}
- 避免用詞：${((brand as any).dont_words ?? []).join(", ") || "(無設定)"}
${(brand as any).signature ? `- 結尾：${(brand as any).signature}` : ""}
${((brand as any).hashtag_pool ?? []).length > 0 ? `- 預設 hashtag 池：${((brand as any).hashtag_pool ?? []).join(" ")}` : ""}`
    : "";

  const platformGuides: Record<string, string> = {
    facebook: "Facebook：300-500 字、講故事 / 痛點 / 解法、配 1-3 hashtag、結尾 CTA + 連結",
    instagram: "Instagram：100-250 字 + 5-15 hashtag、emoji 適中、視覺先行、第一行就要鉤住",
    x: "X (Twitter)：限 280 字、有梗、結尾 1-2 hashtag、可分串 (1/3 (2/3 ...)",
    threads: "Threads：200-400 字、對話感、自然 emoji、不要看起來像廣告、結尾邀請討論",
    line: "LINE OA：100-300 字、親切像朋友、適度 emoji、可帶 button CTA",
    email_subject: "Email 標題：30-60 字、好奇 / 急迫 / 明確、不放 emoji、不放 hashtag",
    blog_title: "Blog 標題：60-80 字、SEO 友善、含主要關鍵字、列表型 / 數字型 / Why-How 型表現好",
  };

  const toneMap: Record<string, string> = {
    casual: "親切口語、繁中台灣味、像學長學姊聊天",
    professional: "專業可信、含數據 / 證據、避免過度口語",
    playful: "活潑搞笑、emoji 適度、互動感強",
    urgent: "急迫、限時、不要太誇張但要明顯促動",
  };

  const systemPrompt = `你是 AI 島 (ai-island-web.snowrealm.pet) 的行銷文案 AI。任務：給一個主題、生 ${platforms.length} 個平台不同 copy。

${brandBlock}

# 語氣
${toneMap[tone]}

# 平台守則 (每平台不同、不要寫成一樣)
${platforms.map((p) => `- ${p}: ${platformGuides[p] ?? "(自由)"}`).join("\n")}

# 規則
1. 每平台 copy **必須不同**、不能一字不改改貼
2. **絕不**在 copy 內寫「請點擊」「歡迎了解更多」這種空話、要具體
3. 受眾語言要對 (年輕用 emoji、professional 不用)
4. 含 CTA 但不要太多 (一條 max 1 CTA)
5. **只回一個 JSON object、不要 markdown、不要任何文字解釋**
   格式：{ "facebook": "...", "instagram": "...", ... }
   key 名為平台 key、value 是 copy 全文

# 不要：
- \`\`\`json 包
- 在 JSON 外加解說
- 把平台名稱寫進 copy 內 (例：「在 Facebook 上...」)
- 寫「[請填入...]」這種佔位字
`;

  const userMsg = `主題：${topic}
${audience ? `受眾：${audience}` : ""}
${cta ? `CTA：${cta}` : ""}

生 ${platforms.length} 個平台 copy、回 JSON。`;

  try {
    const r = await callAI({
      provider: model.provider,
      model: model.model_name,
      apiKey,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
      temperature: 0.85,
      maxTokens: 3500,
    });
    let text = r.text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let parsed: any;
    try { parsed = JSON.parse(text); }
    catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try { parsed = JSON.parse(text.substring(start, end + 1)); } catch {}
      }
    }
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "parse_failed", raw: text.slice(0, 500) }, { status: 500 });
    }
    // 只保留要求的 platforms
    const contents: Record<string, string> = {};
    for (const p of platforms) if (typeof parsed[p] === "string") contents[p] = parsed[p];

    return NextResponse.json({ ok: true, contents, tokens: r.tokensInput + r.tokensOutput });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_failed", message: e?.message }, { status: 500 });
  }
}
