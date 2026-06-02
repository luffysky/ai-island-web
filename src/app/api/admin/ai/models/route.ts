import { NextRequest, NextResponse } from "next/server";
import { requireAdmin as adminGate } from "@/lib/admin-guard";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const gate = await adminGate();
  if (!gate.ok) return null;
  return { id: gate.userId, role: gate.role, username: gate.username };
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id, is_active, is_default, free_tier_daily_limit, premium_tier_daily_limit } = await req.json();
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const admin = createSupabaseAdmin();

  if (is_default === true) {
    // 先清掉所有 default
    await admin.from("ai_models").update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const update: any = { updated_at: new Date().toISOString() };
  if (is_active !== undefined) update.is_active = is_active;
  if (is_default !== undefined) update.is_default = is_default;
  if (free_tier_daily_limit !== undefined) update.free_tier_daily_limit = free_tier_daily_limit;
  if (premium_tier_daily_limit !== undefined) update.premium_tier_daily_limit = premium_tier_daily_limit;

  const { error } = await admin.from("ai_models").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
