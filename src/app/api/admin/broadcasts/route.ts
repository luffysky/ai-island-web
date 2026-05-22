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

export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    title,
    content,
    channel = "in_app",
    target = "all",
    status = "draft",
    scheduled_at,
  } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("broadcasts")
    .insert({
      title,
      content,
      channel,
      target,
      status,
      scheduled_at: scheduled_at || null,
      created_by: me.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id: me.id,
    actor_username: (me as any).username,
    action: "broadcast.created",
    target_type: "broadcast",
    target_id: String(data.id),
    changes: { title, channel, status },
    ip: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ ok: true, broadcast: data });
}
