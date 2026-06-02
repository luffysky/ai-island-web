import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

// GET /api/forum/search?q=關鍵字 — 搜尋主題串
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const admin = createSupabaseAdmin();
  const tsQuery = q.split(/\s+/).filter(Boolean).join(" & ");

  const { data: queried, error } = await admin
    .from("forum_threads")
    .select(`
      id, title, tags, reply_count, view_count, last_reply_at,
      author:profiles!forum_threads_user_id_fkey(username, display_name, level),
      board:forum_boards!forum_threads_board_id_fkey(name, slug, emoji)
    `)
    .textSearch("search_vector", tsQuery, { config: "simple" })
    .order("last_reply_at", { ascending: false })
    .limit(30);
  let data = queried;

  // 失敗退回 ilike
  if (error) {
    const fallback = await admin
      .from("forum_threads")
      .select(`
        id, title, tags, reply_count, view_count, last_reply_at,
        author:profiles!forum_threads_user_id_fkey(username, display_name, level),
        board:forum_boards!forum_threads_board_id_fkey(name, slug, emoji)
      `)
      .ilike("title", `%${q}%`)
      .order("last_reply_at", { ascending: false })
      .limit(30);
    data = fallback.data;
  }

  return NextResponse.json({ results: data ?? [] });
}
