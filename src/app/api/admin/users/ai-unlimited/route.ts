import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-guard";

// POST /api/admin/users/ai-unlimited { userId, enabled: boolean }
// 總後台開關「指定帳號」AI 無限額度特權
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { userId, enabled } = await req.json();
  if (!userId || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 確認目標存在
  const { data: target } = await admin
    .from("profiles")
    .select("username, ai_unlimited")
    .eq("id", userId)
    .single();
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const patch = enabled
    ? { ai_unlimited: true, ai_unlimited_at: new Date().toISOString(), ai_unlimited_by: gate.userId }
    : { ai_unlimited: false, ai_unlimited_at: null, ai_unlimited_by: null };

  const { error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: enabled ? "user.ai_unlimited_enable" : "user.ai_unlimited_disable",
    target_type: "user",
    target_id: userId,
    changes: { before: { ai_unlimited: target.ai_unlimited }, after: { ai_unlimited: enabled } },
    ip: req.headers.get("x-forwarded-for") || null,
    user_agent: req.headers.get("user-agent") || null,
  });

  return NextResponse.json({ ok: true, userId, ai_unlimited: enabled });
}
