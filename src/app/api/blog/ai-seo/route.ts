import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { completeForUsage } from "@/lib/resolve-usage-ai";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// content(HTML) → 純文字（給 AI 讀、去標籤 + 收斂空白 + 截斷）
function htmlToPlain(html: string, max = 6000): string {
  const text = (html || "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max) : text;
}

// 防禦式解析：從模型回覆抓第一段 {...} 當 JSON
function extractJson(raw: string): any | null {
  if (!raw) return null;
  // 先去掉 ```json fence
  const fenced = raw.replace(/```(?:json)?/gi, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const slice = fenced.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `你是繁體中文的 SEO 與 GEO（Generative Engine Optimization，為 AI 回答引擎最佳化）專家。
根據使用者提供的文章標題與內文，產出 SEO 與 GEO 建議。
**只回傳一個嚴格 JSON 物件、不要任何額外說明、不要 markdown code fence。**
JSON 結構如下：
{
  "seoTitle": "不超過 60 字、包含主要關鍵字、吸引點擊的標題",
  "seoDesc": "不超過 155 字、有吸引力、能促使點擊的 meta description",
  "keywords": ["5 到 8 個繁中或英文關鍵字"],
  "geoSummary": "2 到 3 句、用白話回答式寫法、針對 AI／LLM 回答引擎最佳化的摘要（讓 AI 能直接引用回答讀者問題）",
  "faqs": [ { "q": "讀者或 AI 可能會問的問題", "a": "精簡的回答" } ]
}
規則：seoTitle ≤ 60 字、seoDesc ≤ 155 字、keywords 5-8 個、faqs 2-3 題。內容需忠於原文、不要杜撰事實。`;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 限流：每人每分鐘 10 次
  const rl = rateLimit(`blog-ai-seo:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: `太頻繁、${rl.retryAfter} 秒後再試` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const title = String(body.title ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  const content = htmlToPlain(String(body.content ?? ""));

  if (!title && !content) {
    return NextResponse.json(
      { error: "empty", message: "請先填標題或內文" },
      { status: 422 },
    );
  }

  const userPrompt = [
    `文章標題：${title || "（未填）"}`,
    summary ? `現有摘要：${summary}` : "",
    `文章內文（純文字、可能已截斷）：\n${content || "（無內文）"}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { text } = await completeForUsage("seo_meta_gen", {
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 1200,
      temperature: 0.6,
    });

    const parsed = extractJson(text);
    if (!parsed) {
      return NextResponse.json(
        { error: "parse_failed", message: "AI 回覆格式無法解析、請再試一次" },
        { status: 502 },
      );
    }

    // 正規化輸出（防呆：型別/長度）
    const clamp = (s: any, n: number) => String(s ?? "").trim().slice(0, n);
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k: any) => String(k).trim()).filter(Boolean).slice(0, 8)
      : [];
    const faqs = Array.isArray(parsed.faqs)
      ? parsed.faqs
          .map((f: any) => ({ q: clamp(f?.q, 200), a: clamp(f?.a, 500) }))
          .filter((f: any) => f.q && f.a)
          .slice(0, 3)
      : [];

    return NextResponse.json({
      ok: true,
      seoTitle: clamp(parsed.seoTitle, 60),
      seoDesc: clamp(parsed.seoDesc, 155),
      keywords,
      geoSummary: clamp(parsed.geoSummary, 600),
      faqs,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "ai_failed", message: e?.message ?? "AI 生成失敗" },
      { status: 500 },
    );
  }
}
