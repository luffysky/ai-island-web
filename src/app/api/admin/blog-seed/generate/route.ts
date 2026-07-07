import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { topic?, count?, angle? } → 生 N 篇部落格草稿（新手角度、HTML 內文）。 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const rl = rateLimit(`blog-seed:${gate.userId}`, 40, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const count = Math.max(1, Math.min(6, Number(body.count) || 3));
  const topic = String(body.topic ?? "").slice(0, 200);
  const angle = String(body.angle ?? "beginner").slice(0, 40);

  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true);
  if (!models || models.length === 0) return NextResponse.json({ error: "no_model" }, { status: 503 });
  const model = (await pickModelForUsage("nami_help" as any, models as any[])) ?? (models as any[]).find((m) => m.provider === "anthropic") ?? (models as any[])[0];
  const { data: sysKey } = await admin.from("ai_api_keys").select("api_key_encrypted, enabled").eq("provider", model.provider).maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  let apiKey: string;
  try { apiKey = decryptKey((sysKey as any).api_key_encrypted); } catch { return NextResponse.json({ error: "decrypt_failed" }, { status: 500 }); }

  const angleText = angle === "beginner" ? "完全新手 / 國中生也看得懂（生活比喻、術語先講中文、程式碼從最簡單開始）"
    : angle === "dev_diary" ? "開發日記 / 心得（第一人稱、真實踩雷、口語）"
    : "實用教學 / 速查";

  const system = `你是 AI 島（繁體中文程式自學平台）的部落格內容產生器。生一批看起來像真人寫、對新手友善的部落格文章草稿。
角度：${angleText}
${topic ? `主題方向：${topic}` : "主題自由（程式學習、Python、前端、後端、工具、心態）"}

規則：
1. 生 ${count} 篇**不同**主題的草稿。
2. title 口語、具體、吸引人（可帶 emoji，別每篇都放）。
3. summary 一句話摘要（20~40 字）。
4. content 是 HTML：用 <h2> 小標、<p> 段落、程式碼用 <pre><code>（把 < > 轉成 &lt; &gt;）、可用 <ul><li>。約 400~800 字、2~4 個小標、至少一個程式碼或例子。不要 <h1>。
5. 2~4 個 tags（繁中短詞）。
6. 不誇大、不掛保證、不灌雞湯。
只回 JSON（不要 markdown fence）：{"drafts":[{"title":"","summary":"","content":"<p>…</p>","tags":["",""]}]}`;

  try {
    const r = await callAI({
      provider: model.provider, model: model.model_name, apiKey,
      messages: [{ role: "system", content: system }, { role: "user", content: `請生 ${count} 篇草稿，回 JSON。` }],
      temperature: 0.9, maxTokens: 4000,
    });
    const text = r.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      if (s >= 0 && e > s) { try { parsed = JSON.parse(text.slice(s, e + 1)); } catch { /* noop */ } }
    }
    const drafts = Array.isArray(parsed?.drafts) ? parsed.drafts.filter((d: any) => d?.title && d?.content).slice(0, count) : [];
    if (!drafts.length) return NextResponse.json({ error: "parse_failed", raw: text.slice(0, 400) }, { status: 500 });
    return NextResponse.json({ ok: true, drafts });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_failed", message: e?.message }, { status: 500 });
  }
}
