import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("id, role, username")
    .eq("id", user.id)
    .single();
  if (p?.role !== "admin") return null;
  return p;
}

const ALLOWED = [
  "title",
  "content",
  "channel",
  "target",
  "status",
  "scheduled_at",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const patch: Record<string, any> = {};
  for (const k of ALLOWED) {
    if (k in body) patch[k] = body[k];
  }
  if (patch.scheduled_at === "") patch.scheduled_at = null;
  // status 從 draft → sent 時自動寫 sent_at
  if (patch.status === "sent" && !body.preserve_sent_at) {
    patch.sent_at = new Date().toISOString();
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("broadcasts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: me.id,
    actor_username: (me as any).username,
    action: "broadcast.updated",
    target_type: "broadcast",
    target_id: String(id),
    changes: patch,
    ip: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ ok: true, broadcast: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("broadcasts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: me.id,
    actor_username: (me as any).username,
    action: "broadcast.deleted",
    target_type: "broadcast",
    target_id: String(id),
    ip: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ ok: true });
}
