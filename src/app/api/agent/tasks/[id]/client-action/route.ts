import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/agent/tasks/[id]/client-action
// body: { actionId, phase: "acknowledged"|"completed"|"failed"|"cancelled", error? }
// 前端執行 client-action（導航/開頁）後回報結果。RPC 為單條原子 UPDATE、終態不覆寫（冪等）。
const PHASE_MAP: Record<string, { status: string; tsField: string | null }> = {
  acknowledged: { status: "acknowledged", tsField: "acknowledgedAt" },
  completed: { status: "completed", tsField: "completedAt" },
  failed: { status: "failed", tsField: "completedAt" },
  cancelled: { status: "cancelled", tsField: "completedAt" },
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const actionId = String(body?.actionId ?? "").trim();
  const phase = String(body?.phase ?? "").trim();
  const errorMsg = body?.error != null ? String(body.error).slice(0, 300) : null;
  if (!actionId) return NextResponse.json({ error: "缺 actionId" }, { status: 400 });
  const mapped = PHASE_MAP[phase];
  if (!mapped) return NextResponse.json({ error: "phase 不合法" }, { status: 400 });

  const admin = createSupabaseAdmin();
  // p_user_id 當守衛：RPC 只會動屬於此使用者的任務。終態不覆寫＝重試/重送不會重複轉移。
  const { data, error } = await admin.rpc("agent_client_action_update", {
    p_task_id: id,
    p_user_id: user.id,
    p_action_id: actionId,
    p_status: mapped.status,
    p_error: errorMsg,
    p_ts_field: mapped.tsField,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, client_actions: data ?? [] });
}
