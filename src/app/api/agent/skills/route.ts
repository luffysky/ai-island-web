import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { TOOLS } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_TOOLS = new Set(TOOLS.map((t) => t.name));

// GET /api/agent/skills — 內建 + 我自建的技能，附 installed 旗標（安裝包模式）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_skills")
    .select("id, name, description, emoji, category, goal_template, allowed_tools, max_steps, is_builtin, user_id")
    .or(`is_builtin.eq.true,user_id.eq.${user.id}`)
    .order("is_builtin", { ascending: false }).order("category", { ascending: true }).order("created_at", { ascending: true });
  const { data: installs } = await admin.from("agent_skill_installs").select("skill_id").eq("user_id", user.id);
  const installed = new Set((installs ?? []).map((i) => i.skill_id));

  // 技能成效統計：這位使用者用每個技能跑過幾次任務、成功幾次
  const { data: usageRows } = await admin.from("agent_tasks")
    .select("skill_id, status").eq("user_id", user.id).not("skill_id", "is", null).limit(2000);
  const usage = new Map<string, { used: number; succeeded: number }>();
  for (const r of usageRows ?? []) {
    if (!r.skill_id) continue;
    const u = usage.get(r.skill_id) ?? { used: 0, succeeded: 0 };
    u.used += 1;
    if (r.status === "succeeded") u.succeeded += 1;
    usage.set(r.skill_id, u);
  }

  // 自建技能永遠算已安裝；內建看有沒有裝
  const skills = (data ?? []).map((s) => ({
    ...s,
    installed: s.is_builtin ? installed.has(s.id) : true,
    usage: usage.get(s.id) ?? { used: 0, succeeded: 0 },
  }));
  return NextResponse.json({ skills });
}

// PUT /api/agent/skills { skillId, install } — 安裝/移除內建技能
export async function PUT(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const skillId = String(b.skillId ?? "");
  if (!skillId) return NextResponse.json({ error: "缺 skillId" }, { status: 400 });
  const admin = createSupabaseAdmin();
  if (b.install === false) {
    await admin.from("agent_skill_installs").delete().eq("user_id", user.id).eq("skill_id", skillId);
  } else {
    await admin.from("agent_skill_installs").upsert({ user_id: user.id, skill_id: skillId }, { onConflict: "user_id,skill_id" });
  }
  return NextResponse.json({ ok: true });
}

// POST /api/agent/skills — 自建技能
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const name = String(b.name ?? "").trim().slice(0, 40);
  if (!name) return NextResponse.json({ error: "缺員工名稱" }, { status: 400 });
  const allowed = Array.isArray(b.allowed_tools) ? b.allowed_tools.filter((t: string) => VALID_TOOLS.has(t)).slice(0, 20) : [];
  const CATS = new Set(["employee", "research", "write", "code", "dev", "learn", "other"]);
  const category = CATS.has(b.category) ? b.category : "employee";  // 預設「員工」
  const admin = createSupabaseAdmin();

  // 每人自建員工上限 20 位（6 位內建預設不算）
  const { count } = await admin.from("agent_skills").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= 20) return NextResponse.json({ error: "自建 AI 員工已達上限（20 位）" }, { status: 400 });

  const { data, error } = await admin.from("agent_skills").insert({
    user_id: user.id,
    name,
    description: String(b.description ?? "").slice(0, 200),      // 職務/職位
    emoji: String(b.emoji ?? "🧑‍💼").slice(0, 8),
    category,
    goal_template: String(b.goal_template ?? "").slice(0, 1000), // 職能/指令
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
