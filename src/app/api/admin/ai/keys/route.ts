import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { encryptKey } from "@/lib/ai-crypto";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("role, id, username").eq("id", user.id).single();
  if (p?.role !== "admin") return null;
  return p;
}

function nextMonthResetDate() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return nextMonth.toISOString().slice(0, 10);
}

// POST { provider, apiKey }
export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { provider, apiKey } = await req.json();
  if (!provider || !apiKey) return NextResponse.json({ error: "missing" }, { status: 400 });

  // 防複製貼上多出空白 / newline / zero-width chars 弄壞 key
  const cleanKey = String(apiKey).trim().replace(/[\r\n​‌‍﻿]/g, "");
  if (cleanKey.length < 10) return NextResponse.json({ error: "api_key too short after cleaning" }, { status: 400 });

  const admin = createSupabaseAdmin();

  const { data, error } = await admin.from("ai_api_keys").upsert({
    provider,
    api_key_encrypted: encryptKey(cleanKey),
    enabled: true,
    metadata: { has_key: true },
    reset_at: nextMonthResetDate(),
    updated_by: me.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider" })
    .select("id, provider, enabled, monthly_budget_usd, used_this_month_usd, metadata, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: me.id,
    actor_username: (me as any).username,
    action: "ai_key.saved",
    target_type: "provider",
    target_id: provider,
  });

  return NextResponse.json({ ok: true, affected: data ? 1 : 0, key: data });
}

// PATCH { provider, monthly_budget_usd?, enabled? }
export async function PATCH(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { provider, monthly_budget_usd, enabled, alert_threshold_pct } = await req.json();
  if (!provider) return NextResponse.json({ error: "missing" }, { status: 400 });

  const update: any = { updated_at: new Date().toISOString() };
  if (monthly_budget_usd !== undefined) update.monthly_budget_usd = monthly_budget_usd;
  if (enabled !== undefined) update.enabled = enabled;
  if (alert_threshold_pct !== undefined) {
    const t = Number(alert_threshold_pct);
    if (Number.isFinite(t) && t >= 0 && t <= 100) update.alert_threshold_pct = Math.round(t);
  }
  update.updated_by = me.id;

  const admin = createSupabaseAdmin();
  const { data: existing, error: existingError } = await admin
    .from("ai_api_keys")
    .select("id, metadata")
    .eq("provider", provider)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existing) {
    if (monthly_budget_usd === undefined) {
      return NextResponse.json({ error: "key_not_found", affected: 0 }, { status: 404 });
    }

    const { data, error } = await admin.from("ai_api_keys").insert({
      provider,
      api_key_encrypted: encryptKey("__missing_api_key__"),
      metadata: { has_key: false },
      monthly_budget_usd,
      enabled: false,
      reset_at: nextMonthResetDate(),
      updated_by: me.id,
      updated_at: update.updated_at,
    })
      .select("id, provider, enabled, monthly_budget_usd, used_this_month_usd, metadata, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, affected: data ? 1 : 0, key: data });
  }

  if (enabled === true && (existing.metadata as any)?.has_key === false) {
    return NextResponse.json({ error: "key_not_configured", affected: 0 }, { status: 400 });
  }

  const { data, error } = await admin
    .from("ai_api_keys")
    .update(update)
    .eq("provider", provider)
    .select("id, provider, enabled, monthly_budget_usd, used_this_month_usd, metadata, updated_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "key_not_found", affected: 0 }, { status: 404 });
  return NextResponse.json({ ok: true, affected: data.length, key: data[0] });
}

// DELETE { provider }
export async function DELETE(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { provider } = await req.json();
  if (!provider) return NextResponse.json({ error: "missing" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("ai_api_keys")
    .delete()
    .eq("provider", provider)
    .select("provider");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "key_not_found", affected: 0 }, { status: 404 });

  await admin.from("audit_logs").insert({
    actor_id: me.id,
    actor_username: (me as any).username,
    action: "ai_key.deleted",
    target_type: "provider",
    target_id: provider,
  });

  return NextResponse.json({ ok: true, affected: data.length });
}
