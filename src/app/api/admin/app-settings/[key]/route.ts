import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { invalidateAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

const RESERVED_SYSTEM_KEYS = new Set<string>([
  // 不可刪除（系統依賴）
  "maintenance_mode",
  "site_announcement",
  "signup_enabled",
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, username").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { key } = await params;
  const body = await req.json().catch(() => ({} as any));

  const patch: any = { updated_by: user.id };
  if ("value" in body) patch.value = body.value;
  if ("description" in body) patch.description = body.description;
  if ("category" in body) patch.category = body.category;
  if ("value_type" in body) patch.value_type = body.value_type;
  if ("is_secret" in body) patch.is_secret = !!body.is_secret;

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("app_settings").update(patch).eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateAppSettings();
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: profile.username,
    action: "admin.app_settings_update",
    target_type: "app_setting",
    target_id: key,
    changes: patch,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, username").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { key } = await params;
  if (RESERVED_SYSTEM_KEYS.has(key)) {
    return NextResponse.json({ error: "reserved_system_key" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("app_settings").delete().eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateAppSettings();
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: profile.username,
    action: "admin.app_settings_delete",
    target_type: "app_setting",
    target_id: key,
  });
  return NextResponse.json({ ok: true });
}
