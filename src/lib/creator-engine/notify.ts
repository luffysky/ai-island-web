/** Creator Island 通知：寫進既有 notifications 表（鈴鐺 /api/me/notifications 自動顯示）。best-effort。 */
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function notify(userId: string, n: { kind: string; title: string; body?: string; link?: string }): Promise<void> {
  if (!userId) return;
  const admin = createSupabaseAdmin();
  await admin.from("notifications").insert({
    user_id: userId, kind: n.kind, title: n.title, body: n.body ?? null, link: n.link ?? null,
  }).then(() => {}, () => {});
}

/** 取顯示名（通知文案用）。 */
export async function displayName(userId: string): Promise<string> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select("display_name, username").eq("id", userId).maybeSingle();
  return (data as any)?.display_name || (data as any)?.username || "有人";
}
