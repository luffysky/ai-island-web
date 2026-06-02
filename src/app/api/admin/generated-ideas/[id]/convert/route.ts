import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI } from "@/lib/ai-providers";
import { resolveIdeaModel } from "@/lib/idea-ai";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * POST /api/admin/generated-ideas/[id]/convert  { target: "task" | "article" | "product_plan" }
 *   - task         → 在 todos 開一張任務（標題=點子名稱、notes=摘要+下一步）
 *   - article      → 在 user_blog_articles 開一篇草稿（is_public=false）
 *   - product_plan → AI 把點子展開成完整產品企劃、存成 blog 草稿（is_public=false）
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const target = String(body.target ?? "");

  const admin = createSupabaseAdmin();
  const { data: idea } = await admin.from("generated_ideas").select("*").eq("id", id).maybeSingle();
  if (!idea) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const nextSteps: string[] = Array.isArray(idea.next_steps) ? idea.next_steps : [];

  if (target === "task") {
    const notes = [
      idea.summary,
      idea.why_it_works ? `\n💡 為什麼成立：${idea.why_it_works}` : "",
      nextSteps.length ? `\n📋 下一步：\n${nextSteps.map((s) => `- ${s}`).join("\n")}` : "",
      `\n（來自「給我一個點子」）`,
    ].filter(Boolean).join("\n");

    const { data, error } = await admin
      .from("todos")
      .insert({ user_id: gate.userId, title: String(idea.title).slice(0, 200), notes })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, target: "task", todoId: data.id });
  }

  if (target === "article") {
    const html = [
      idea.summary ? `<p>${escapeHtml(idea.summary)}</p>` : "",
      idea.why_it_works ? `<h2>為什麼這個點子成立</h2><p>${escapeHtml(idea.why_it_works)}</p>` : "",
      nextSteps.length ? `<h2>下一步</h2><ul>${nextSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : "",
    ].filter(Boolean).join("\n");

    const slug = `idea-${id.slice(0, 8)}-${Date.now().toString(36)}`;
    const { data, error } = await admin
      .from("user_blog_articles")
      .insert({
        user_id: gate.userId,
        title: String(idea.title).slice(0, 200),
        slug,
        summary: idea.summary ? String(idea.summary).slice(0, 300) : null,
        content: html,
        is_public: false, // 草稿
      })
      .select("id, slug")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, target: "article", articleId: data.id, slug: data.slug });
  }

  if (target === "product_plan") {
    const resolved = await resolveIdeaModel();
    if (!resolved.ok) return NextResponse.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });

    // 撈來源碎片當 context（讓企劃更貼近原始靈感）
    let fragContext = "";
    const srcIds: string[] = Array.isArray(idea.source_fragment_ids) ? idea.source_fragment_ids : [];
    if (srcIds.length > 0) {
      const { data: frags } = await admin.from("idea_fragments").select("title, content").in("id", srcIds);
      fragContext = (frags as any[] ?? []).map((f) => `- ${f.title}：${(f.content || "").slice(0, 300)}`).join("\n");
    }

    const system = `你是一位資深產品經理。把一個初步點子展開成可執行的「產品企劃書」。
請「只」回傳 HTML（用 <h2>/<h3>/<p>/<ul>/<li>/<table> 等標籤，不要 markdown、不要 code fence、不要 <html>/<body> 外層），
依序包含這些段落：
<h2>一、產品概述</h2>、<h2>二、要解決的問題</h2>、<h2>三、目標用戶 / 使用情境</h2>、
<h2>四、核心功能（MVP 範圍）</h2>、<h2>五、商業模式 / 變現</h2>、<h2>六、競爭與差異化</h2>、
<h2>七、開發里程碑（階段）</h2>、<h2>八、風險與假設</h2>、<h2>九、成功指標（KPI）</h2>。
內容具體、可執行，避免空泛。全部用繁體中文。`;

    const userMsg = `點子名稱：${idea.title}
類型：${idea.idea_type ?? "未定"}
摘要：${idea.summary ?? ""}
為什麼成立：${idea.why_it_works ?? ""}
初步下一步：${nextSteps.join("；") || "（無）"}
${fragContext ? `\n靈感來源碎片：\n${fragContext}` : ""}`;

    let html: string;
    try {
      const r = await callAI({
        provider: resolved.model.provider,
        model: resolved.model.model,
        apiKey: resolved.model.apiKey,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        temperature: 0.7,
        maxTokens: 3500,
      });
      html = r.text.replace(/```html?\s*/gi, "").replace(/```/g, "").trim();
    } catch (e: any) {
      return NextResponse.json({ error: "ai_call_failed", message: e?.message }, { status: 500 });
    }

    const slug = `plan-${id.slice(0, 8)}-${Date.now().toString(36)}`;
    const { data, error } = await admin
      .from("user_blog_articles")
      .insert({
        user_id: gate.userId,
        title: `【產品企劃】${String(idea.title).slice(0, 180)}`,
        slug,
        summary: idea.summary ? String(idea.summary).slice(0, 300) : null,
        content: html,
        tags: ["產品企劃"],
        is_public: false, // 草稿
      })
      .select("id, slug")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, target: "product_plan", articleId: data.id, slug: data.slug });
  }

  return NextResponse.json({ error: "bad_target", message: "target 要是 task / article / product_plan" }, { status: 400 });
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
