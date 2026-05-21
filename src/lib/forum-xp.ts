import { createSupabaseAdmin } from "@/lib/supabase";

/**
 * 討論區 XP 規則（server 端發放）
 * 用 xp_events 的 reason + meta 防止重複發放
 */
export const FORUM_XP = {
  thread_create: 15,     // 發表主題串
  reply_create: 5,       // 回覆
  answer_accepted: 30,   // 回覆被採納為解答
  thread_featured: 50,   // 主題串被設為精華
} as const;

type ForumXpReason = keyof typeof FORUM_XP;

/**
 * 發 XP 給使用者。dedupeKey 用來防重複——
 * 同一個 (reason, dedupeKey) 只會發一次。
 */
export async function awardForumXp(
  userId: string,
  reason: ForumXpReason,
  dedupeKey: string
) {
  const admin = createSupabaseAdmin();
  const amount = FORUM_XP[reason];

  // 防重複：查這個 reason + dedupeKey 是否已發過
  const { data: existing } = await admin
    .from("xp_events")
    .select("id")
    .eq("user_id", userId)
    .eq("reason", reason)
    .contains("meta", { key: dedupeKey })
    .maybeSingle();

  if (existing) return { awarded: false, amount: 0 };

  // 寫 xp_events
  await admin.from("xp_events").insert({
    user_id: userId,
    amount,
    reason,
    meta: { key: dedupeKey },
  });

  // 更新 profiles.xp
  const { data: profile } = await admin
    .from("profiles")
    .select("xp")
    .eq("id", userId)
    .single();

  await admin
    .from("profiles")
    .update({ xp: (profile?.xp ?? 0) + amount })
    .eq("id", userId);

  return { awarded: true, amount };
}

/**
 * 收回 XP（取消採納解答 / 取消精華時用）
 */
export async function revokeForumXp(
  userId: string,
  reason: ForumXpReason,
  dedupeKey: string
) {
  const admin = createSupabaseAdmin();

  const { data: event } = await admin
    .from("xp_events")
    .select("id, amount")
    .eq("user_id", userId)
    .eq("reason", reason)
    .contains("meta", { key: dedupeKey })
    .maybeSingle();

  if (!event) return { revoked: false };

  await admin.from("xp_events").delete().eq("id", event.id);

  const { data: profile } = await admin
    .from("profiles")
    .select("xp")
    .eq("id", userId)
    .single();

  await admin
    .from("profiles")
    .update({ xp: Math.max(0, (profile?.xp ?? 0) - event.amount) })
    .eq("id", userId);

  return { revoked: true };
}
