import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { invalidateAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("app_settings").select("*").order("category").order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({} as any));
  const key = String(body.key ?? "").trim();
  if (!/^[a-z][a-z0-9_]*$/.test(key)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("app_settings").insert({
    key,
    value: body.value ?? null,
    description: body.description ?? null,
    category: body.category ?? "general",
    value_type: body.value_type ?? "json",
    is_secret: !!body.is_secret,
    updated_by: gate.userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateAppSettings();
  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.app_settings_create",
    target_type: "app_setting",
    target_id: key,
    changes: { key, value: body.value, category: body.category, value_type: body.value_type, is_secret: body.is_secret },
  });
  return NextResponse.json({ ok: true });
}
