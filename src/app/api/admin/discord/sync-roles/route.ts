import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { assignVipRole, revokeVipRole } from "@/lib/discord-binding";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 一鍵 sync Discord VIP role
 *   - active subscription + 已綁 Discord → assign role
 *   - subscription 過期 + 已綁 + 有 role → revoke role
 *
 * GET /api/admin/discord/sync-roles
 * 也可用 cron 每天跑一次
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const admin = createSupabaseAdmin();
  const { data: binds } = await admin.from("user_discord_bind").select("user_id, discord_user_id");
  const { data: activeSubs } = await admin.from("subscriptions").select("user_id").eq("status", "active");
  const activeSet = new Set(((activeSubs ?? []) as any[]).map((s) => s.user_id));

  let assigned = 0, revoked = 0, failed = 0;
  for (const b of (binds ?? []) as any[]) {
    try {
      if (activeSet.has(b.user_id)) {
        const ok = await assignVipRole(b.discord_user_id);
        if (ok) assigned++; else failed++;
      } else {
        const ok = await revokeVipRole(b.discord_user_id);
        if (ok) revoked++; else failed++;
      }
      await admin.from("user_discord_bind").update({ last_role_sync_at: new Date().toISOString() }).eq("user_id", b.user_id);
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    total: (binds ?? []).length,
    assigned,
    revoked,
    failed,
    note: "active 用戶 assign VIP role / 非 active 用戶 revoke role",
  });
}
