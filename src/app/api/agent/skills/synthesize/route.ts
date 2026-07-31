import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { distillSkillFromTask } from "@/lib/agent/skill-synth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// L4 技能合成：把「已完成的任務」蒸餾成可重用技能草稿（不直接建立、回草稿讓使用者確認/微調）。
// 若任務成功時已自動預算好建議（agent_tasks.suggested_skill，見 2.1.3），優先回那份、省一次 AI 呼叫。
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const taskId = String(b.taskId ?? "");
  if (!taskId) return NextResponse.json({ error: "缺 taskId" }, { status: 400 });

  const admin = createSupabaseAdmin();
  // 先看有沒有自動預算好的建議（擁有者驗證）
  const { data: task } = await admin.from("agent_tasks").select("user_id, suggested_skill").eq("id", taskId).maybeSingle();
  if (!task || task.user_id !== user.id) return NextResponse.json({ error: "找不到任務" }, { status: 404 });
  if (task.suggested_skill && (task.suggested_skill as any).name) {
    return NextResponse.json({ draft: task.suggested_skill });
  }

  const draft = await distillSkillFromTask(admin, taskId, user.id);
  if (!draft) return NextResponse.json({ error: "找不到任務" }, { status: 404 });
  return NextResponse.json({ draft });
}
