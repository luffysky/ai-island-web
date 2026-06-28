/**
 * Creator Engine — 社群（貼文/動態牆/留言/讚/收藏）。對接 profiles；讚用 ci_likes。
 * 寫走 service-role；授權在 API 層（requireCreatorUser）。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const POST_COLS = "id, user_id, workspace_id, type, title, content, images, video_url, video_thumbnail_url, audio_url, tags, visibility, status, likes_count, comments_count, views_count, created_at";
const AUTHOR = "author:profiles!ci_posts_user_id_fkey(id, username, display_name, avatar_url)";

export type NewPost = {
  type?: "post" | "article" | "reel"; title?: string; content?: string;
  images?: { url: string; alt?: string }[]; videoUrl?: string; videoThumbnailUrl?: string; audioUrl?: string;
  tags?: string[]; visibility?: "public" | "followers" | "private"; workspaceId?: string;
};

export async function createPost(userId: string, p: NewPost) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_posts").insert({
    user_id: userId, workspace_id: p.workspaceId ?? null,
    type: p.type ?? "post", title: p.title ?? null, content: p.content ?? "",
    images: p.images ?? [], video_url: p.videoUrl ?? null, video_thumbnail_url: p.videoThumbnailUrl ?? null, audio_url: p.audioUrl ?? null,
    tags: (p.tags ?? []).slice(0, 10), visibility: p.visibility ?? "public", status: "published",
  }).select(POST_COLS).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listFeed(opts: { cursor?: string | null; limit?: number; type?: string | null; userId?: string | null } = {}) {
  const admin = createSupabaseAdmin();
  const limit = Math.max(1, Math.min(30, opts.limit ?? 15));
  let q = admin.from("ci_posts").select(`${POST_COLS}, ${AUTHOR}`).eq("status", "published")
    .order("created_at", { ascending: false }).limit(limit + 1);
  if (opts.type) q = q.eq("type", opts.type);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  else q = q.in("visibility", ["public", "followers"]);
  if (opts.cursor) q = q.lt("created_at", opts.cursor);
  const { data } = await q;
  const rows = (data as any[]) ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].created_at : null };
}

export async function getPost(id: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_posts").select(`${POST_COLS}, ${AUTHOR}`).eq("id", id).maybeSingle();
  return data;
}
export async function postOwner(id: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_posts").select("user_id").eq("id", id).maybeSingle();
  return (data as any)?.user_id ?? null;
}
export async function deletePost(id: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("ci_posts").delete().eq("id", id);
}

/** 讚（用 ci_likes，asset_id=post id）+ 維護 likes_count。回 { on }。 */
export async function togglePostLike(postId: string, userId: string): Promise<{ on: boolean }> {
  const admin = createSupabaseAdmin();
  const { data: ex } = await admin.from("ci_likes").select("id").eq("asset_id", postId).eq("user_id", userId).maybeSingle();
  if (ex) {
    await admin.from("ci_likes").delete().eq("id", (ex as any).id);
    await admin.rpc("ci_bump_post_count", { p_post: postId, p_col: "likes_count", p_delta: -1 }).then(() => {}, () => {});
    return { on: false };
  }
  await admin.from("ci_likes").insert({ asset_id: postId, user_id: userId });
  await admin.rpc("ci_bump_post_count", { p_post: postId, p_col: "likes_count", p_delta: 1 }).then(() => {}, () => {});
  return { on: true };
}

export async function toggleBookmark(postId: string, userId: string): Promise<{ on: boolean }> {
  const admin = createSupabaseAdmin();
  const { data: ex } = await admin.from("ci_bookmarks").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle();
  if (ex) { await admin.from("ci_bookmarks").delete().eq("id", (ex as any).id); return { on: false }; }
  await admin.from("ci_bookmarks").insert({ post_id: postId, user_id: userId });
  return { on: true };
}

export async function listPostComments(postId: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_post_comments")
    .select("id, user_id, parent_id, body, gif_url, likes_count, created_at, author:profiles!ci_post_comments_user_id_fkey(username, display_name, avatar_url)")
    .eq("post_id", postId).order("created_at", { ascending: true }).limit(200);
  return data ?? [];
}
export async function addPostComment(postId: string, userId: string, body: string, parentId?: number) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_post_comments")
    .insert({ post_id: postId, user_id: userId, body: body.slice(0, 2000), parent_id: parentId ?? null })
    .select("id, user_id, parent_id, body, created_at").single();
  if (error) throw new Error(error.message);
  await admin.rpc("ci_bump_post_count", { p_post: postId, p_col: "comments_count", p_delta: 1 }).then(() => {}, () => {});
  return data;
}
