import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

// POST /api/blog/comment-like — 切換留言讚（body: { comment_id }）
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { comment_id } = await req.json();
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof comment_id !== "string" || !UUID.test(comment_id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  // 已按過？
  const { data: existing } = await supabase
    .from("blog_comment_likes")
    .select("id")
    .eq("comment_id", comment_id)
    .eq("user_id", user.id)
    .maybeSingle();

  let liked: boolean;
  if (existing) {
    await supabase.from("blog_comment_likes").delete().eq("id", existing.id);
    liked = false;
  } else {
    await supabase.from("blog_comment_likes").insert({
      comment_id,
      user_id: user.id,
    });
    liked = true;
  }

  // 回傳最新數量
  const { count } = await supabase
    .from("blog_comment_likes")
    .select("id", { count: "exact", head: true })
    .eq("comment_id", comment_id);

  return NextResponse.json({ ok: true, liked, count: count ?? 0 });
}
