import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import type { ForumReply } from "@/lib/forum-types";
import { awardForumXp, revokeForumXp } from "@/lib/forum-xp";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";
import { parseBody } from "@/lib/validate";

const ThreadPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(50_000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  is_pinned: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_locked: z.boolean().optional(),
});

// GET /api/forum/threads/[id] — 取單串 + 巢狀回覆
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: thread, error } = await admin
    .from("forum_threads")
    .select(`
      *,
      author:profiles!forum_threads_user_id_fkey(username, display_name, avatar_url, level),
      board:forum_boards!forum_threads_board_id_fkey(name, slug, emoji)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !thread) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // 取回覆
  const { data: replyRows } = await admin
    .from("forum_replies")
    .select(`
      *,
      author:profiles!forum_replies_user_id_fkey(username, display_name, avatar_url, level)
    `)
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  // 組巢狀
  const all = (replyRows ?? []) as ForumReply[];
  const byId: Record<string, ForumReply> = {};
  const topLevel: ForumReply[] = [];
  all.forEach((r) => { byId[r.id] = { ...r, replies: [] }; });
  all.forEach((r) => {
    if (r.parent_id && byId[r.parent_id]) byId[r.parent_id].replies!.push(byId[r.id]);
    else topLevel.push(byId[r.id]);
  });

  return NextResponse.json({ thread, replies: topLevel });
}

// PATCH /api/forum/threads/[id] — 編輯主題串（本人）或管理動作（置頂/精華/鎖定）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, ThreadPatchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, any>;
  const admin = createSupabaseAdmin();

  // 確認身分
  const { data: thread } = await admin
    .from("forum_threads")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const isOwner = thread.user_id === user.id;

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };

  // 本人可改內容
  if (isOwner) {
    for (const f of ["title", "content", "tags"]) {
      if (f in body) patch[f] = f === "content" ? sanitizeRichHtmlStrict(body[f]) : body[f];
    }
  }
  // 管理員可置頂/精華/鎖定
  if (isAdmin) {
    for (const f of ["is_pinned", "is_featured", "is_locked"]) {
      if (f in body) patch[f] = body[f];
    }
  }

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("forum_threads")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 精華狀態變動 → 給/收回 串主 XP
  if (isAdmin && "is_featured" in body) {
    if (body.is_featured) {
      await awardForumXp(thread.user_id, "thread_featured", id);
    } else {
      await revokeForumXp(thread.user_id, "thread_featured", id);
    }
  }

  return NextResponse.json({ thread: data });
}

// DELETE /api/forum/threads/[id] — 刪串（本人或管理員）
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: thread } = await admin
    .from("forum_threads")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (thread.user_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("forum_threads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
