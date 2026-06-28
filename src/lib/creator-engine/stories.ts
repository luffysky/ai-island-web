/**
 * Creator Engine — 限動 Stories（24h 過期）。對接 profiles。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const COLS = "id, user_id, media_url, media_type, caption, visibility, expires_at, view_count, created_at";
const AUTHOR = "author:profiles!ci_stories_user_id_fkey(id, username, display_name, avatar_url)";

export async function createStory(userId: string, input: { mediaUrl: string; mediaType: "image" | "video"; caption?: string }) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_stories")
    .insert({ user_id: userId, media_url: input.mediaUrl, media_type: input.mediaType, caption: input.caption ?? null })
    .select(COLS).single();
  if (error) throw new Error(error.message);
  return data;
}

/** 有效限動（未過期、is_active），附作者。前端依 user 分組。 */
export async function listActiveStories() {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_stories")
    .select(`${COLS}, ${AUTHOR}`)
    .eq("is_active", true).gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

export async function storyOwner(id: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_stories").select("user_id").eq("id", id).maybeSingle();
  return (data as any)?.user_id ?? null;
}
export async function deleteStory(id: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("ci_stories").update({ is_active: false }).eq("id", id);
}
export async function recordStoryView(storyId: string, viewerId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("ci_story_views").insert({ story_id: storyId, viewer_id: viewerId });
  if (!error) await admin.rpc("ci_bump_story_views", { p_story: storyId }).then(() => {}, () => {});
}
