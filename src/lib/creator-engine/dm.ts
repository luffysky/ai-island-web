/**
 * Creator Engine — 私訊 DM（ci_dm_threads / ci_dm_messages）。對接 profiles。
 * thread 以 user_lo<user_hi 去重。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const PROFILE = "id, username, display_name, avatar_url";
const pair = (a: string, b: string) => (a < b ? [a, b] : [b, a]);

export async function getOrCreateThread(me: string, other: string): Promise<string> {
  if (me === other) throw new Error("不能私訊自己");
  const [lo, hi] = pair(me, other);
  const admin = createSupabaseAdmin();
  const { data: ex } = await admin.from("ci_dm_threads").select("id").eq("user_lo", lo).eq("user_hi", hi).maybeSingle();
  if (ex) return (ex as any).id;
  const { data, error } = await admin.from("ci_dm_threads").insert({ user_lo: lo, user_hi: hi }).select("id").single();
  if (error) {
    const { data: again } = await admin.from("ci_dm_threads").select("id").eq("user_lo", lo).eq("user_hi", hi).maybeSingle();
    if (again) return (again as any).id;
    throw new Error(error.message);
  }
  return (data as any).id;
}

export async function listThreads(me: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_dm_threads").select("id, user_lo, user_hi, last_message_at")
    .or(`user_lo.eq.${me},user_hi.eq.${me}`).order("last_message_at", { ascending: false, nullsFirst: false }).limit(50);
  const threads = (data as any[]) ?? [];
  const others = threads.map((t) => (t.user_lo === me ? t.user_hi : t.user_lo));
  const map = new Map<string, any>();
  if (others.length) {
    const { data: profs } = await admin.from("profiles").select(PROFILE).in("id", others);
    for (const p of ((profs as any[]) ?? [])) map.set(p.id, p);
  }
  return threads.map((t) => ({ id: t.id, last_message_at: t.last_message_at, other: map.get(t.user_lo === me ? t.user_hi : t.user_lo) }));
}

/** 驗證 me 是 thread 成員 */
export async function isThreadMember(threadId: string, me: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_dm_threads").select("user_lo, user_hi").eq("id", threadId).maybeSingle();
  if (!data) return false;
  return (data as any).user_lo === me || (data as any).user_hi === me;
}

export async function listMessages(threadId: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_dm_messages").select("id, sender_id, body, media_url, media_type, created_at")
    .eq("thread_id", threadId).order("created_at", { ascending: true }).limit(200);
  return data ?? [];
}

export async function sendMessage(threadId: string, sender: string, body?: string, mediaUrl?: string, mediaType?: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("ci_dm_messages")
    .insert({ thread_id: threadId, sender_id: sender, body: body ?? null, media_url: mediaUrl ?? null, media_type: mediaType ?? null })
    .select("id, sender_id, body, media_url, media_type, created_at").single();
  if (error) throw new Error(error.message);
  await admin.from("ci_dm_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
  return data;
}
