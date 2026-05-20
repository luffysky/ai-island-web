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

// POST { provider, apiKey }
export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { provider, apiKey } = await req.json();
  if (!provider || !apiKey) return NextResponse.json({ error: "missing" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const { error } = await admin.from("ai_api_keys").upsert({
    provider,
    api_key_encrypted: encryptKey(apiKey),
    enabled: true,
    reset_at: nextMonth.toISOString().slice(0, 10),
    updated_by: me.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: me.id,
    actor_username: (me as any).username,
    action: "ai_key.saved",
    target_type: "provider",
    target_id: provider,
  });

  return NextResponse.json({ ok: true });
}

// PATCH { provider, monthly_budget_usd?, enabled? }
export async function PATCH(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { provider, monthly_budget_usd, enabled } = await req.json();
  if (!provider) return NextResponse.json({ error: "missing" }, { status: 400 });

  const update: any = { updated_at: new Date().toISOString() };
  if (monthly_budget_usd !== undefined) update.monthly_budget_usd = monthly_budget_usd;
  if (enabled !== undefined) update.enabled = enabled;

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ai_api_keys").update(update).eq("provider", provider);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
