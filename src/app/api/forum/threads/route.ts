import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { awardForumXp } from "@/lib/forum-xp";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";
import { parseBody } from "@/lib/validate";
import { sortByHnScore } from "@/lib/forum-rank";

const ThreadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  board_slug: z.string().min(1).max(100),
  content: z.string().max(50_000).optional().default(""),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
});

// GET /api/forum/threads?board=slug&sort=recent&offset=0&limit=20 — 主題串列表（分頁）
export async function GET(req: NextRequest) {
  const boardSlug = req.nextUrl.searchParams.get("board");
  const sort = req.nextUrl.searchParams.get("sort") ?? "recent"; // recent | new | hot | trending
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.max(1, Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20));
  const admin = createSupabaseAdmin();

  let boardId: string | null = null;
  if (boardSlug) {
    const { data: board } = await admin
      .from("forum_boards")
      .select("id")
      .eq("slug", boardSlug)
      .maybeSingle();
    if (!board) return NextResponse.json({ threads: [], hasMore: false });
    boardId = board.id;
  }

  let query = admin
    .from("forum_threads")
    .select(`
      id, board_id, user_id, title, tags, is_pinned, is_featured, is_locked,
      view_count, reply_count, like_count, last_reply_at, created_at,
      author:profiles!forum_threads_user_id_fkey(username, display_name, avatar_url, level),
      board:forum_boards!forum_threads_board_id_fkey(name, slug, emoji)
    `);

  if (boardId) query = query.eq("board_id", boardId);

  if (sort === "trending") {
    // Hacker News 排序：撈最近 7 天的 100~200 筆、在 server 端用 hnScore 排
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    query = query.gte("created_at", since).order("created_at", { ascending: false }).limit(200);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const ranked = sortByHnScore((data as any[]) ?? []);
    const slice = ranked.slice(offset, offset + limit + 1);
    const hasMore = slice.length > limit;
    const page = hasMore ? slice.slice(0, limit) : slice;
    const threads = offset === 0
      ? page.sort((a: any, b: any) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return 0;
        })
      : page;
    return NextResponse.json({ threads, hasMore });
  }

  // 一般排序：置頂永遠在前
  if (sort === "new") query = query.order("created_at", { ascending: false });
  else if (sort === "hot") query = query.order("reply_count", { ascending: false });
  else query = query.order("last_reply_at", { ascending: false });

  // 多抓一筆判斷 hasMore
  const { data, error } = await query.range(offset, offset + limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // 置頂排前面（只在第一頁）
  const threads = offset === 0
    ? page.sort((a: any, b: any) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return 0;
      })
    : page;

  return NextResponse.json({ threads, hasMore });
}

// POST /api/forum/threads — 發新主題串
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, ThreadSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const title = body.title.trim();
  const boardSlug = body.board_slug;

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
      content: sanitizeRichHtmlStrict(body.content),
      tags: body.tags,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 發表主題串 +15 XP（用 thread id 當 dedupe key）
  await awardForumXp(user.id, "thread_create", data.id);

  return NextResponse.json({ thread_id: data.id });
}
