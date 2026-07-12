import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/tasks/[id] — 任務詳情 + 所有步驟（回放用）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data: task } = await admin.from("agent_tasks").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: steps } = await admin.from("agent_steps").select("*").eq("task_id", id).order("idx");
  const { data: approvals } = await admin.from("agent_approvals").select("*").eq("task_id", id).order("step_idx");
  return NextResponse.json({ task, steps: steps ?? [], approvals: approvals ?? [] });
}

// POST /api/agent/tasks/[id] { action:"cancel" } — 取消任務
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  if (body.action !== "cancel") return NextResponse.json({ error: "unknown action" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("agent_tasks")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id).in("status", ["planning", "running", "awaiting_approval", "awaiting_device"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
