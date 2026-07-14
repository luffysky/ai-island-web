import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { awardForumXp, revokeForumXp } from "@/lib/forum-xp";
import { notifyForumReply, notifyMention } from "@/lib/notify-helpers";

// 從內容抽出 @提及 token [[user:uuid|label]] 的 user id（去重）
function parseMentionIds(content: string): string[] {
  const ids = new Set<string>();
  const re = /\[\[user:([0-9a-fA-F-]{36})\|[^\]]*\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) ids.add(m[1]);
  return [...ids];
}

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

  // 通知主題作者 + admin LINE（fire-and-forget）
  try {
    const { data: thread } = await admin
      .from("forum_threads")
      .select("user_id, title")
      .eq("id", threadId)
      .maybeSingle();
    if (thread && (thread as any).user_id !== user.id) {
      const replierName = (data as any).author?.display_name || (data as any).author?.username || "某人";
      notifyForumReply({
        threadAuthorId: (thread as any).user_id,
        replierUsername: replierName,
        threadTitle: (thread as any).title ?? "",
        threadId,
      }).catch(() => {});
    }

    // @ 提及通知：通知被 tag 到的人（排除自己、以及已收到「回覆你的主題」通知的串主，避免重複）
    const threadAuthorId = (thread as any)?.user_id;
    const replierName = (data as any).author?.display_name || (data as any).author?.username || "某人";
    const mentioned = parseMentionIds(content).filter((uid) => uid !== user.id && uid !== threadAuthorId);
    const preview = content.replace(/\[\[user:[0-9a-fA-F-]{36}\|([^\]]*)\]\]/g, "@$1");
    for (const uid of mentioned.slice(0, 10)) {
      notifyMention({ userId: uid, mentionerName: replierName, where: "討論區", preview, link: `/forum/thread/${threadId}` }).catch(() => {});
    }
  } catch {}

  return NextResponse.json({ reply: { ...data, replies: [] } });
}

// PATCH /api/forum/threads/[id]/replies?reply=xxx
//   - body.content → 編輯回覆內文（限本人）
//   - body.is_answer → 採納/取消採納解答（限串主）
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
  const body = await req.json();

  // ── 編輯內文（限本人）───────────────────────────────
  if (typeof body.content === "string") {
    const content = body.content.trim();
    if (!content || content.length > 5000) {
      return NextResponse.json({ error: "invalid_content" }, { status: 400 });
    }
    const { data: reply } = await admin
      .from("forum_replies")
      .select("user_id")
      .eq("id", replyId)
      .eq("thread_id", threadId)
      .maybeSingle();
    if (!reply) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (reply.user_id !== user.id) {
      return NextResponse.json({ error: "forbidden", message: "只能編輯自己的回覆" }, { status: 403 });
    }
    const updated_at = new Date().toISOString();
    const { error } = await admin
      .from("forum_replies")
      .update({ content, updated_at })
      .eq("id", replyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, content, updated_at });
  }

  // ── 採納解答（限串主）───────────────────────────────
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

  if (reply.user_id !== user.id && profile?.role !== "admin" && profile?.role !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("forum_replies").delete().eq("id", replyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
