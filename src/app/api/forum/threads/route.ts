import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { awardForumXp } from "@/lib/forum-xp";
import { sanitizeRichHtml } from "@/lib/rich-html";

// GET /api/forum/threads?board=slug&sort=recent — 主題串列表
export async function GET(req: NextRequest) {
  const boardSlug = req.nextUrl.searchParams.get("board");
  const sort = req.nextUrl.searchParams.get("sort") ?? "recent"; // recent | new | hot
  const admin = createSupabaseAdmin();

  let boardId: string | null = null;
  if (boardSlug) {
    const { data: board } = await admin
      .from("forum_boards")
      .select("id")
      .eq("slug", boardSlug)
      .maybeSingle();
    if (!board) return NextResponse.json({ threads: [] });
    boardId = board.id;
  }

  let query = admin
    .from("forum_threads")
    .select(`
      id, board_id, user_id, title, tags, is_pinned, is_featured, is_locked,
      view_count, reply_count, last_reply_at, created_at,
      author:profiles!forum_threads_user_id_fkey(username, display_name, avatar_url, level),
      board:forum_boards!forum_threads_board_id_fkey(name, slug, emoji)
    `);

  if (boardId) query = query.eq("board_id", boardId);

  // 排序：置頂永遠在前
  if (sort === "new") query = query.order("created_at", { ascending: false });
  else if (sort === "hot") query = query.order("reply_count", { ascending: false });
  else query = query.order("last_reply_at", { ascending: false });

  const { data, error } = await query.limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 置頂排前面
  const threads = (data ?? []).sort((a: any, b: any) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return 0;
  });

  return NextResponse.json({ threads });
}

// POST /api/forum/threads — 發新主題串
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = (body.title ?? "").trim();
  const boardSlug = body.board_slug;
  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
  if (!boardSlug) return NextResponse.json({ error: "board_required" }, { status: 400 });

  const admin = createSupabaseAdmin();

  // 取版塊、檢查發文權限
  const { data: board } = await admin
    .from("forum_boards")
    .select("id, post_role, is_active")
    .eq("slug", boardSlug)
    .maybeSingle();
  if (!board || !board.is_active) {
    return NextResponse.json({ error: "board_not_found" }, { status: 404 });
  }

  // 限管理員發文的版塊（如公告）
  if (board.post_role === "admin") {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "forbidden", message: "這個版塊只有管理員能發文" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("forum_threads")
    .insert({
      board_id: board.id,
      user_id: user.id,
      title,
      content: sanitizeRichHtml(body.content),
      tags: body.tags ?? [],
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 發表主題串 +15 XP（用 thread id 當 dedupe key）
  await awardForumXp(user.id, "thread_create", data.id);

  return NextResponse.json({ thread_id: data.id });
}
