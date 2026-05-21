import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { awardForumXp, revokeForumXp } from "@/lib/forum-xp";

// POST /api/forum/threads/[id]/replies — 回覆主題串
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const content = (body.content ?? "").trim();
  if (!content || content.length > 5000) {
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // 串存在 + 沒被鎖
  const { data: thread } = await admin
    .from("forum_threads")
    .select("is_locked")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
  if (thread.is_locked) {
    return NextResponse.json({ error: "locked", message: "這個主題已鎖定、無法回覆" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("forum_replies")
    .insert({
      thread_id: threadId,
      parent_id: body.parent_id ?? null,
      user_id: user.id,
      content,
    })
    .select(`
      *,
      author:profiles!forum_replies_user_id_fkey(username, display_name, avatar_url, level)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 回覆 +5 XP
  await awardForumXp(user.id, "reply_create", data.id);

  return NextResponse.json({ reply: { ...data, replies: [] } });
}

// PATCH /api/forum/threads/[id]/replies?reply=xxx — 採納/取消採納解答（限串主）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await params;
  const replyId = req.nextUrl.searchParams.get("reply");
  if (!replyId) return NextResponse.json({ error: "missing_reply_id" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();

  // 只有串主能採納解答
  const { data: thread } = await admin
    .from("forum_threads")
    .select("user_id")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
  if (thread.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden", message: "只有發問者能採納解答" }, { status: 403 });
  }

  const body = await req.json();
  const isAnswer = !!body.is_answer;

  // 一個串只能有一個解答 → 先清掉舊的
  if (isAnswer) {
    await admin
      .from("forum_replies")
      .update({ is_answer: false })
      .eq("thread_id", threadId);
  }

  const { error } = await admin
    .from("forum_replies")
    .update({ is_answer: isAnswer })
    .eq("id", replyId)
    .eq("thread_id", threadId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 採納/取消採納 → 給/收回 回覆作者的 XP
  const { data: replyAuthor } = await admin
    .from("forum_replies")
    .select("user_id")
    .eq("id", replyId)
    .single();
  if (replyAuthor) {
    if (isAnswer) {
      await awardForumXp(replyAuthor.user_id, "answer_accepted", replyId);
    } else {
      await revokeForumXp(replyAuthor.user_id, "answer_accepted", replyId);
    }
  }

  return NextResponse.json({ ok: true, is_answer: isAnswer });
}

// DELETE /api/forum/threads/[id]/replies?reply=xxx — 刪回覆
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const replyId = req.nextUrl.searchParams.get("reply");
  if (!replyId) return NextResponse.json({ error: "missing_reply_id" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: reply } = await admin
    .from("forum_replies")
    .select("user_id")
    .eq("id", replyId)
    .maybeSingle();
  if (!reply) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (reply.user_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("forum_replies").delete().eq("id", replyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
