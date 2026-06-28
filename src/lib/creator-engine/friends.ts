/**
 * Creator Engine — 好友系統（ci_friendships：邀請/接受/封鎖）。對接 profiles。
 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const PROFILE = "id, username, display_name, avatar_url";

export async function searchUsers(q: string, excludeId: string) {
  if (!q.trim()) return [];
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select(PROFILE)
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).neq("id", excludeId).limit(20);
  return data ?? [];
}

export async function sendRequest(me: string, otherId: string) {
  if (me === otherId) throw new Error("不能加自己");
  const admin = createSupabaseAdmin();
  const { data: ex } = await admin.from("ci_friendships").select("id, status")
    .or(`and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`).maybeSingle();
  if (ex) return { id: (ex as any).id, status: (ex as any).status, existed: true };
  const { data, error } = await admin.from("ci_friendships").insert({ requester_id: me, addressee_id: otherId, status: "pending" }).select("id, status").single();
  if (error) throw new Error(error.message);
  return { ...(data as any), existed: false };
}

export async function respondRequest(friendshipId: string, me: string, accept: boolean) {
  const admin = createSupabaseAdmin();
  const { data: f } = await admin.from("ci_friendships").select("id, addressee_id, status").eq("id", friendshipId).maybeSingle();
  if (!f || (f as any).addressee_id !== me || (f as any).status !== "pending") throw new Error("無效的邀請");
  if (accept) await admin.from("ci_friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", friendshipId);
  else await admin.from("ci_friendships").delete().eq("id", friendshipId);
  return { ok: true };
}

export async function removeFriend(me: string, otherId: string) {
  const admin = createSupabaseAdmin();
  await admin.from("ci_friendships").delete()
    .or(`and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`);
}

export async function listFriends(me: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_friendships").select("requester_id, addressee_id")
    .eq("status", "accepted").or(`requester_id.eq.${me},addressee_id.eq.${me}`);
  const ids = ((data as any[]) ?? []).map((r) => (r.requester_id === me ? r.addressee_id : r.requester_id));
  if (!ids.length) return [];
  const { data: profs } = await admin.from("profiles").select(PROFILE).in("id", ids);
  return profs ?? [];
}

export async function listPending(me: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ci_friendships")
    .select(`id, requester_id, created_at, requester:profiles!ci_friendships_requester_id_fkey(${PROFILE})`)
    .eq("addressee_id", me).eq("status", "pending").order("created_at", { ascending: false });
  return data ?? [];
}
