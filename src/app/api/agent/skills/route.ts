import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { TOOLS } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_TOOLS = new Set(TOOLS.map((t) => t.name));

// GET /api/agent/skills — 內建 + 我自建的技能
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_skills")
    .select("id, name, description, emoji, goal_template, allowed_tools, max_steps, is_builtin, user_id")
    .or(`is_builtin.eq.true,user_id.eq.${user.id}`)
    .order("is_builtin", { ascending: false }).order("created_at", { ascending: true });
  return NextResponse.json({ skills: data ?? [] });
}

// POST /api/agent/skills — 自建技能
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const name = String(b.name ?? "").trim().slice(0, 40);
  if (!name) return NextResponse.json({ error: "缺技能名稱" }, { status: 400 });
  const allowed = Array.isArray(b.allowed_tools) ? b.allowed_tools.filter((t: string) => VALID_TOOLS.has(t)).slice(0, 20) : [];
  const admin = createSupabaseAdmin();

  // 每人自建上限，避免濫用
  const { count } = await admin.from("agent_skills").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= 30) return NextResponse.json({ error: "自建技能已達上限（30）" }, { status: 400 });

  const { data, error } = await admin.from("agent_skills").insert({
    user_id: user.id,
    name,
    description: String(b.description ?? "").slice(0, 200),
    emoji: String(b.emoji ?? "🤖").slice(0, 8),
    goal_template: String(b.goal_template ?? "").slice(0, 1000),
    allowed_tools: allowed,
    max_steps: Math.min(Math.max(Number(b.max_steps) || 12, 1), 30),
    is_builtin: false,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

// DELETE /api/agent/skills?id=<uuid> — 刪自己的自建技能
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("agent_skills").delete().eq("id", id).eq("user_id", user.id).eq("is_builtin", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
