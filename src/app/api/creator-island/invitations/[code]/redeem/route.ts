import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireCreatorUser } from "@/lib/creator-engine/api";
import { hashInviteCode } from "@/lib/creator-engine/invite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST → 兌換邀請碼加入 workspace。任何登入者可用。 */
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { code } = await params;

  const admin = createSupabaseAdmin();
  const { data: inv } = await admin
    .from("ci_workspace_invitations")
    .select("id, workspace_id, role, expires_at, max_uses, used_count, revoked_at")
    .eq("code_hash", hashInviteCode(code))
    .maybeSingle();

  if (!inv) return NextResponse.json({ error: "not_found", message: "邀請碼無效" }, { status: 404 });
  const i = inv as any;
  if (i.revoked_at) return NextResponse.json({ error: "revoked", message: "邀請碼已撤銷" }, { status: 409 });
  if (i.expires_at && new Date(i.expires_at) < new Date()) {
    return NextResponse.json({ error: "expired", message: "邀請碼已過期" }, { status: 409 });
  }
  if (i.used_count >= i.max_uses) {
    return NextResponse.json({ error: "exhausted", message: "邀請碼已達使用上限" }, { status: 409 });
  }

  // 已是成員 → 直接回 workspace（idempotent）
  const { data: existing } = await admin
    .from("ci_workspace_members").select("user_id").eq("workspace_id", i.workspace_id).eq("user_id", u.userId).maybeSingle();

  if (!existing) {
    const { error: mErr } = await admin.from("ci_workspace_members")
      .insert({ workspace_id: i.workspace_id, user_id: u.userId, role: i.role, invited_by: i.created_by ?? null });
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    await admin.from("ci_workspace_invitations").update({ used_count: i.used_count + 1 }).eq("id", i.id);
  }

  const { data: ws } = await admin
    .from("ci_workspaces").select("id, name, type, visibility, owner_id, created_at").eq("id", i.workspace_id).maybeSingle();
  return NextResponse.json({ ok: true, workspace: ws });
}
