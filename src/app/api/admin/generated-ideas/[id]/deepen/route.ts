import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { callAI } from "@/lib/ai-providers";
import { rateLimit } from "@/lib/rate-limit";
import { resolveIdeaModel } from "@/lib/idea-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/generated-ideas/[id]/deepen  { question, history? }
 *   把點子當對話對象、追問 / 深化（不持久化、回 { text }）
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(profile?.role === "admin" || (profile as any)?.is_owner === true)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`idea-deepen:${user.id}`, 60, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const question = String(body.question ?? "").trim().slice(0, 1000);
  if (!question) return NextResponse.json({ error: "no_question" }, { status: 400 });
  const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(body.history)
    ? body.history.slice(-8).map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 2000) }))
    : [];

  const admin = createSupabaseAdmin();
  const { data: idea } = await admin.from("generated_ideas").select("*").eq("id", id).maybeSingle();
  if (!idea) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const resolved = await resolveIdeaModel();
  if (!resolved.ok) return NextResponse.json({ error: resolved.error, message: resolved.message }, { status: resolved.status });

  const system = `你是創意顧問，正在和使用者一起「把一個初步點子變得更具體可行」。
這是點子的原始資料：
- 名稱：${idea.title}
- 類型：${idea.idea_type ?? "未定"}
- 摘要：${idea.summary ?? ""}
- 為什麼成立：${idea.why_it_works ?? ""}
- 碎片連結：${(idea.connections ?? []).join("；") || "（無）"}
- 下一步：${(idea.next_steps ?? []).join("；") || "（無）"}

回答原則：針對使用者的追問、具體、可執行、不空泛；繁體中文；像顧問不像百科。`;

  try {
    const r = await callAI({
      provider: resolved.model.provider,
      model: resolved.model.model,
      apiKey: resolved.model.apiKey,
      messages: [
        { role: "system", content: system },
        ...history,
        { role: "user", content: question },
      ],
      temperature: 0.7,
      maxTokens: 1200,
    });
    return NextResponse.json({ text: r.text });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_call_failed", message: e?.message }, { status: 500 });
  }
}
