import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

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
    actor_id: user.id,
    actor_username: me.username,
    action: "setting.changed",
    target_type: "app_setting",
    target_id: key,
    changes: { before: before?.value ?? null, after: value },
    ip: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ ok: true });
}
