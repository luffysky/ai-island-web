import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { runAgentTask } from "@/lib/agent/orchestrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// GET /api/agent/tasks — 我的任務清單（最近 30 筆）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_tasks")
    .select("id, goal, status, step_count, result, error, created_at, finished_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
  return NextResponse.json({ tasks: data ?? [] });
}

// POST /api/agent/tasks { goal } — 建任務並用 SSE 串回執行過程
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const goal = String(body.goal ?? "").trim().slice(0, 500);
  if (!goal) return NextResponse.json({ error: "缺 goal" }, { status: 400 });
  const maxSteps = Math.min(Math.max(Number(body.maxSteps) || 20, 1), 30);

  const admin = createSupabaseAdmin();
  const { data: task, error } = await admin.from("agent_tasks")
    .insert({ user_id: user.id, goal, max_steps: maxSteps, status: "planning" })
    .select("id").single();
  if (error || !task) return NextResponse.json({ error: error?.message ?? "建任務失敗" }, { status: 500 });

  const encoder = new TextEncoder();
  const send = (obj: unknown) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(send({ type: "task", taskId: task.id, goal }));
      try {
        for await (const ev of runAgentTask(task.id, user.id, goal, maxSteps)) {
          controller.enqueue(send(ev));
        }
      } catch (e: any) {
        controller.enqueue(send({ type: "error", error: e?.message ?? "stream 例外" }));
      } finally {
        controller.enqueue(send({ type: "end" }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
