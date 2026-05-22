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

  const { id, action } = await req.json();
  if (!id || !["hide", "show", "pin", "unpin", "lock", "unlock", "feature", "unfeature", "delete"].includes(action)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (action === "delete") {
    const { error } = await admin.from("forum_threads").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const patch: any = {
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
    };
    if (action === "hide") patch.is_hidden = true;
    if (action === "show") patch.is_hidden = false;
    if (action === "pin") patch.is_pinned = true;
    if (action === "unpin") patch.is_pinned = false;
    if (action === "lock") patch.is_locked = true;
    if (action === "unlock") patch.is_locked = false;
    if (action === "feature") patch.is_featured = true;
    if (action === "unfeature") patch.is_featured = false;
    const { error } = await admin.from("forum_threads").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: `moderation.forum_thread_${action}`,
    target_type: "forum_thread",
    target_id: String(id),
    ip: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ ok: true });
}
