import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/generated-ideas/[id]/convert  { target: "task" | "article" }
 *   - task    → 在 todos 開一張任務（標題=點子名稱、notes=摘要+下一步）
 *   - article → 在 user_blog_articles 開一篇草稿（is_public=false）
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(profile?.role === "admin" || (profile as any)?.is_owner === true)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

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
      .insert({ user_id: user.id, title: String(idea.title).slice(0, 200), notes })
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
        user_id: user.id,
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

  return NextResponse.json({ error: "bad_target", message: "target 要是 task 或 article" }, { status: 400 });
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
