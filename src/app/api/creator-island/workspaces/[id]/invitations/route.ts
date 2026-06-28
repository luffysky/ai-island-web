import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireCreatorUser, requireWorkspaceRole } from "@/lib/creator-engine/api";
import { hashInviteCode, generateInviteCode } from "@/lib/creator-engine/invite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROLES = ["manager", "contributor", "viewer"] as const;

/** POST { role?, expiresInDays?, maxUses? } → { code } 建邀請碼（owner/manager）。明碼只回這一次。 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireCreatorUser();
  if (u instanceof NextResponse) return u;
  const { id } = await params;
  const gate = await requireWorkspaceRole(id, u.userId, "manager");
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => ({} as any));
  const role = ROLES.includes(body.role) ? body.role : "contributor";
  const maxUses = Math.max(1, Math.min(1000, Number(body.maxUses) || 1));
  const days = Number(body.expiresInDays);
  const expiresAt = Number.isFinite(days) && days > 0
    ? new Date(Date.now() + days * 86400_000).toISOString()
    : null;

  // 產生明碼（短、好分享），只存 hash
  const code = generateInviteCode();
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ci_workspace_invitations").insert({
    workspace_id: id,
    code_hash: hashInviteCode(code),
    role,
    created_by: u.userId,
    expires_at: expiresAt,
    max_uses: maxUses,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code, role, maxUses, expiresAt });
}
