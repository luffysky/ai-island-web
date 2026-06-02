import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { invalidateAppSettings } from "@/lib/app-settings";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: "missing_key" }, { status: 400 });

  const admin = createSupabaseAdmin();

  const { data: before } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const { error } = await admin
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "setting.changed",
    target_type: "app_setting",
    target_id: key,
    changes: { before: before?.value ?? null, after: value },
    ip: req.headers.get("x-forwarded-for") || null,
  });

  invalidateAppSettings();

  return NextResponse.json({ ok: true });
}
