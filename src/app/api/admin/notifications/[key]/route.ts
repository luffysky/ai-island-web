import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { clearNotificationSettingsCache } from "@/lib/notification-settings";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { key } = await params;
  const body = await req.json().catch(() => ({} as any));

  const patch: any = { updated_at: new Date().toISOString() };
  if (body.channels && typeof body.channels === "object") {
    const c = body.channels;
    patch.channels = {
      in_app: !!c.in_app,
      email: !!c.email,
      line: !!c.line,
      push: !!c.push,
    };
  }
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("notification_settings").update(patch).eq("event_key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  clearNotificationSettingsCache();

  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.notification_settings_update",
    target_type: "notification_setting",
    target_id: key,
    changes: patch,
  });

  return NextResponse.json({ ok: true });
}
