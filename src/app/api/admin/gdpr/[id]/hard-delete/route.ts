import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

/**
 * Admin 端執行硬刪：
 *  1. 透過 service_role 呼叫 delete_user_account RPC（既有）
 *  2. 更新 gdpr_requests.status = 'hard_deleted'
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const admin = createSupabaseAdmin();

  const { data: req, error: reqErr } = await admin
    .from("gdpr_requests")
    .select("user_id, request_type, status")
    .eq("id", id)
    .maybeSingle();
  if (reqErr || !req) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }
  if (req.request_type !== "delete") {
    return NextResponse.json({ error: "not_delete_request" }, { status: 400 });
  }
  if (req.status !== "pending") {
    return NextResponse.json({ error: "already_processed" }, { status: 400 });
  }

  // 真刪
  const { error: delErr } = await admin.rpc("delete_user_account_by_id" as any, { p_user_id: req.user_id });
  if (delErr) {
    // 沒有 by_id 版本就 fallback：直接 delete profile（會 CASCADE）
    const { error: fallbackErr } = await admin.from("profiles").delete().eq("id", req.user_id);
    if (fallbackErr) {
      return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
    }
  }

  await admin
    .from("gdpr_requests")
    .update({
      status: "hard_deleted",
      completed_at: new Date().toISOString(),
      processed_by: gate.userId,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
