import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

/**
 * MED-06 Impersonate：admin 端「以該使用者身份檢視」。
 *
 * 重要原則：
 *   - 不修改 cookie / session、不真的登入成對方
 *   - 只是 server 端 read-only：admin/impersonate/[id] 等頁面 select 對方資料用 service_role
 *   - 全程寫入 admin_impersonations 表、被 impersonate 者也能看自己被誰看了（透明度）
 *
 * 本 endpoint 純粹是「建立紀錄」、回傳 viewer URL。
 * 真正的「以對方視角」資料展示由 /admin/impersonate/[targetUserId] 頁面負責。
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const supabase = await createSupabaseServer();

  const body = await req.json().catch(() => ({} as any));
  const targetUserId = String(body.targetUserId ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  if (!targetUserId || !reason || reason.length < 5) {
    return NextResponse.json({ error: "target_and_reason_required", message: "reason 至少 5 字" }, { status: 400 });
  }
  if (targetUserId === gate.userId) {
    return NextResponse.json({ error: "cannot_impersonate_self" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: target } = await admin.from("profiles").select("id, username").eq("id", targetUserId).maybeSingle();
  if (!target) return NextResponse.json({ error: "target_not_found" }, { status: 404 });

  // 簡單 IP hash
  const xfwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = xfwd ? xfwd.split(",")[0].trim() : "";
  let ipHash = "";
  if (ip) {
    let h = 0;
    for (let i = 0; i < ip.length; i++) {
      h = (h << 5) - h + ip.charCodeAt(i);
      h |= 0;
    }
    ipHash = "ip_" + Math.abs(h).toString(36);
  }

  const { data: row, error } = await admin
    .from("admin_impersonations")
    .insert({ admin_id: gate.userId, target_user_id: targetUserId, reason: reason.slice(0, 500), ip_hash: ipHash || null })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 同時寫 admin_events
  await supabase.from("admin_events").insert({
    event_type: "impersonate_start",
    user_id: gate.userId,
    meta: { target_user_id: targetUserId, reason, impersonation_id: row.id },
  });

  return NextResponse.json({ ok: true, impersonation_id: row.id });
}

export async function PATCH(req: NextRequest) {
  // 結束 impersonate session
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({} as any));
  const id = String(body.impersonation_id ?? "");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  await admin.from("admin_impersonations").update({ ended_at: new Date().toISOString() }).eq("id", id).eq("admin_id", gate.userId);
  return NextResponse.json({ ok: true });
}
