import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI } from "@/lib/ai-providers";
import { rateLimit } from "@/lib/rate-limit";
import { resolveIdeaModel, extractJson } from "@/lib/idea-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/idea-fragments/[id]/analyze
 *   AI 分析單一碎片 → 寫回 ai_summary / tags / mood / category / potential_uses
 *   回 { fragment }（已更新）
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(profile?.role === "admin" || (profile as any)?.is_owner === true)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`idea-analyze:${user.id}`, 60, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { data: frag } = await admin.from("idea_fragments").select("*").eq("id", id).maybeSingle();
  if (!frag) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const resolved = await resolveIdeaModel();
  if (!resolved.ok) return NextResponse.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });

  const system = `你是一個靈感碎片分析器。使用者把零散的想法 / 回憶 / 概念丟進來，你要看懂它的本質。
請「只」回傳一個 JSON 物件（不要任何解釋文字、不要 markdown），格式：
{
  "summary": "一句話摘要這個碎片的核心",
  "tags": ["3~6 個精準標籤"],
  "mood": "一個情緒詞（如 懷舊 / 興奮 / 焦慮 / 平靜 / 野心）",
  "category": "一個分類（如 人生回憶 / 產品概念 / 創作素材 / 商業點子 / 人物 / 觀察）",
  "potentialUses": ["2~4 個這個碎片未來可以長成什麼，如 小說素材 / 品牌故事 / 社群貼文 / 課程主題"]
}
全部用繁體中文。`;

  const userMsg = `碎片標題：${frag.title}\n\n碎片內容：\n${frag.content || "（無內容、只有標題）"}`;

  try {
    const r = await callAI({
      provider: resolved.model.provider,
      model: resolved.model.model,
      apiKey: resolved.model.apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: 0.6,
      maxTokens: 600,
    });

    const parsed = extractJson<{
      summary?: string; tags?: string[]; mood?: string; category?: string; potentialUses?: string[];
    }>(r.text);
    if (!parsed) return NextResponse.json({ error: "ai_bad_json", raw: r.text }, { status: 502 });

    const cleanArr = (a: any, n: number) =>
      Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean).slice(0, n) : [];

    const { data: updated, error } = await admin
      .from("idea_fragments")
      .update({
        ai_summary: parsed.summary ? String(parsed.summary).slice(0, 500) : null,
        tags: cleanArr(parsed.tags, 30),
        mood: parsed.mood ? String(parsed.mood).slice(0, 50) : frag.mood,
        category: parsed.category ? String(parsed.category).slice(0, 50) : frag.category,
        potential_uses: cleanArr(parsed.potentialUses, 10),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ fragment: updated });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_call_failed", message: e?.message }, { status: 500 });
  }
}
