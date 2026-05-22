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
  if (!id || !["approve", "reject", "delete"].includes(action)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (action === "delete") {
    const { error } = await admin.from("blog_comments").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin
      .from("blog_comments")
      .update({ is_approved: action === "approve" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_username: me.username,
    action: `moderation.blog_comment_${action}`,
    target_type: "blog_comment",
    target_id: String(id),
    ip: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ ok: true });
}
