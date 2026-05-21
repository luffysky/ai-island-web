import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

// GET /api/forum/user/[userId] — 取某人的討論區活動
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const admin = createSupabaseAdmin();

  // 基本資料
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, xp")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  // 發過的主題串
  const { data: threads } = await admin
    .from("forum_threads")
    .select(`
      id, title, reply_count, view_count, is_featured, created_at,
      board:forum_boards!forum_threads_board_id_fkey(name, slug, emoji)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  // 回過的文（取回覆 + 所屬串標題）
  const { data: replies } = await admin
    .from("forum_replies")
    .select(`
      id, content, is_answer, created_at, thread_id,
      thread:forum_threads!forum_replies_thread_id_fkey(id, title)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  // 統計
  const { count: threadCount } = await admin
    .from("forum_threads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const { count: replyCount } = await admin
    .from("forum_replies")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const { count: answerCount } = await admin
    .from("forum_replies")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_answer", true);

  return NextResponse.json({
    profile,
    threads: threads ?? [],
    replies: replies ?? [],
    stats: {
      threads: threadCount ?? 0,
      replies: replyCount ?? 0,
      answers: answerCount ?? 0,
    },
  });
}
