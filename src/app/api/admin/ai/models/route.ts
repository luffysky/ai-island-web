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

// 新增模型（供新供應商如 github / mistral / cerebras 加入可選模型）
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const provider = String(body.provider ?? "").trim();
  const model_name = String(body.model_name ?? "").trim();
  if (!provider || !model_name) return NextResponse.json({ error: "missing_provider_or_model_name" }, { status: 400 });

  const tier = ["low", "mid", "high"].includes(body.tier) ? body.tier : "mid";
  const row: any = {
    provider,
    model_name,
    display_name: String(body.display_name ?? model_name).trim().slice(0, 80),
    description: String(body.description ?? "").slice(0, 300),
    tier,
    is_active: body.is_active !== false,
    is_default: false,
    free_tier_daily_limit: Number.isFinite(Number(body.free_tier_daily_limit)) ? Number(body.free_tier_daily_limit) : 10,
    cost_input_per_1m: Number.isFinite(Number(body.cost_input_per_1m)) ? Number(body.cost_input_per_1m) : 0,
    cost_output_per_1m: Number.isFinite(Number(body.cost_output_per_1m)) ? Number(body.cost_output_per_1m) : 0,
  };

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ai_models").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, model: data });
}

// 刪除模型
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") ?? (await req.json().catch(() => ({} as any)))?.id;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ai_models").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
