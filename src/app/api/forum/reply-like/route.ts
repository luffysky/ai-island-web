import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

// POST /api/forum/reply-like — 切換回覆讚（body: { reply_id }）
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { reply_id } = await req.json();
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof reply_id !== "string" || !UUID.test(reply_id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("forum_reply_likes")
    .select("id")
    .eq("reply_id", reply_id)
    .eq("user_id", user.id)
    .maybeSingle();

  let liked: boolean;
  if (existing) {
    await supabase.from("forum_reply_likes").delete().eq("id", existing.id);
    liked = false;
  } else {
    await supabase.from("forum_reply_likes").insert({
      reply_id,
      user_id: user.id,
    });
    liked = true;
  }

  const { count } = await supabase
    .from("forum_reply_likes")
    .select("id", { count: "exact", head: true })
    .eq("reply_id", reply_id);

  return NextResponse.json({ ok: true, liked, count: count ?? 0 });
}
