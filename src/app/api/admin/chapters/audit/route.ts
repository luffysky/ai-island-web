import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";
import { callAI } from "@/lib/ai-providers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function providerFromModel(model: string): "anthropic" | "openai" | "google" | "groq" {
  if (/^claude/i.test(model)) return "anthropic";
  if (/^gemini/i.test(model)) return "google";
  if (/^(llama|mixtral)/i.test(model)) return "groq";
  return "openai";
}

/**
 * 雪鑰掃章節品質
 * POST { chapter_id?: number, scope?: "all"|"weak" }
 *   chapter_id: 指定章節
 *   scope=weak: 掃所有 lesson、找 content 短於 500 字 / 缺 analogy / 缺 tip 的章
 *   scope=all 或預設: 跑單一指定章
 *
 * 回 { chapters: [{ id, title, issues: [{type, severity, lesson, note}] }] }
 */
export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e: any) {
    console.error("[chapters/audit] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message?.slice(0, 200) ?? "internal_error" }, { status: 500 });
  }
}

async function handle(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(p as any)?.is_owner && !["admin", "owner"].includes((p as any)?.role ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const chapterId = body.chapter_id ? Number(body.chapter_id) : null;
  const scope = ["weak", "all"].includes(body.scope) ? body.scope : "weak";

  const admin = createSupabaseAdmin();

  // 撈 chapters + lessons（限制範圍）
  let chQuery = admin.from("chapters").select("id, title, subtitle, stage").eq("status", "published");
  if (chapterId) chQuery = chQuery.eq("id", chapterId);
  const { data: chapters } = await chQuery.order("id", { ascending: true }).limit(scope === "weak" ? 80 : 5);

  if (!chapters || chapters.length === 0) return NextResponse.json({ ok: true, chapters: [] });

  const results: any[] = [];

  for (const ch of chapters as any[]) {
    // 撈 lessons
    const { data: lessons } = await admin
      .from("lessons")
      .select("id, number, title, one_line_summary, analogy, content, tip")
      .eq("chapter_id", ch.id)
      .order("sort_order", { ascending: true });
    const lessonList = (lessons ?? []) as any[];

    // 規則層面快速掃（不打 AI、零成本）
    const issues: any[] = [];
    for (const l of lessonList) {
      const cLen = (l.content ?? "").length;
      if (cLen < 500) issues.push({ type: "too_short", severity: "high", lesson: l.number, note: `content 只 ${cLen} 字、< 500` });
      if (!l.analogy || (l.analogy ?? "").length < 30) issues.push({ type: "missing_analogy", severity: "med", lesson: l.number, note: "analogy 缺或太短" });
      if (!l.one_line_summary || (l.one_line_summary ?? "").length < 10) issues.push({ type: "missing_summary", severity: "med", lesson: l.number, note: "one_line_summary 缺" });
      if (!l.tip) issues.push({ type: "missing_tip", severity: "low", lesson: l.number, note: "沒 tip 區塊" });
    }

    results.push({ id: ch.id, title: ch.title, lesson_count: lessonList.length, issues });
  }

  // 若 scope === "weak"、且有指定 chapter_id、跑 AI 深度檢查
  if (chapterId && results.length === 1) {
    const ch = results[0];
    const { data: lessons } = await admin.from("lessons")
      .select("id, number, title, one_line_summary, analogy, content")
      .eq("chapter_id", ch.id).order("sort_order", { ascending: true }).limit(20);

    const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");
    const provider = providerFromModel(modelName);
    const apiKey = await getProviderKey(provider);
    if (apiKey) {
      try {
        const prompt = `你是雪鑰、AI 島內容品控。林董要你 audit Ch${ch.id} ${ch.title}、找品質問題。

# Lessons (${(lessons ?? []).length})
${((lessons ?? []) as any[]).slice(0, 10).map((l) => `## ${l.number} ${l.title}\nanalogy: ${(l.analogy ?? "").slice(0, 150)}\ncontent (前 800 字): ${(l.content ?? "").slice(0, 800)}`).join("\n\n")}

# 任務
找 5 個最大的問題、給具體改進建議。

# 輸出（嚴格 JSON、無 markdown）
{
  "ai_issues": [
    { "lesson_number": "Ch.L", "issue": "30 字內具體問題", "suggestion": "60 字內改進建議", "severity": "high/med/low" }
  ],
  "overall": "1-2 句總評（80 字內）"
}`;
        const r = await callAI({ provider, model: modelName, apiKey, messages: [{ role: "user", content: prompt }], temperature: 0.3, maxTokens: 1200 });
        const text = r.text.trim();
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          ch.ai_issues = parsed.ai_issues ?? [];
          ch.overall = parsed.overall ?? "";
        }
      } catch (e: any) {
        ch.ai_error = e?.message;
      }
    }
  }

  return NextResponse.json({ ok: true, chapters: results, scope });
}
