/**
 * Admin bot 對話 DB 持久化 — LINE admin / Telegram / Discord 共用
 *
 * 設計：
 *  - 所有 admin channel 的 conversation 都掛在「林董本人 profile」下（ai_conversations.user_id 是 NOT NULL FK）
 *  - 不同 channel + 不同 channel_user_id → 各自一個 conversation row、title 區分
 *  - 找不到 owner profile → 回 null、caller 退回 in-memory
 *  - owner profile id cache 5 分鐘、不每次 query
 */
import { createSupabaseAdmin } from "./supabase-admin";
import { getOwnerConfig } from "./is-owner";

let cachedOwnerProfileId: string | null = null;
let cachedAt = 0;
const OWNER_CACHE_MS = 5 * 60_000;

/** 找林董本人 profile id（給 admin bot conversation 掛靠）*/
export async function getOwnerProfileId(): Promise<string | null> {
  if (cachedOwnerProfileId && Date.now() - cachedAt < OWNER_CACHE_MS) {
    return cachedOwnerProfileId;
  }
  const admin = createSupabaseAdmin();

  // 1. 優先 profiles.is_owner = true
  const { data: byFlag } = await admin
    .from("profiles")
    .select("id")
    .eq("is_owner", true)
    .limit(1)
    .maybeSingle();
  if (byFlag) {
    cachedOwnerProfileId = (byFlag as any).id as string;
    cachedAt = Date.now();
    return cachedOwnerProfileId;
  }

  // 2. fallback：username 在 OWNER_USERNAMES list（含 default luffysky00 / luffysky004）
  const cfg = getOwnerConfig();
  const allNames = Array.from(new Set([...cfg.usernames, ...cfg.defaultUsernames])).filter(Boolean);
  if (allNames.length === 0) return null;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .in("username", allNames)
    .limit(1)
    .maybeSingle();
  if (data) {
    cachedOwnerProfileId = (data as any).id as string;
    cachedAt = Date.now();
    return cachedOwnerProfileId;
  }
  return null;
}

export type AdminChannel = "line_admin" | "telegram_admin" | "discord_admin";

const TITLE_PREFIX: Record<AdminChannel, string> = {
  line_admin: "LINE-ADMIN",
  telegram_admin: "TG-ADMIN",
  discord_admin: "DC-ADMIN",
};

/**
 * 拿 / 開該 channel + channel_user_id 對應的 conversation。
 * 同一 channel 同一 user 永遠 reuse 同一 row（title eq）。
 */
export async function getOrCreateAdminConversation(opts: {
  channel: AdminChannel;
  channelUserId: string;
}): Promise<string | null> {
  const ownerId = await getOwnerProfileId();
  if (!ownerId) return null;
  const admin = createSupabaseAdmin();
  const title = `${TITLE_PREFIX[opts.channel]}: ${opts.channelUserId}`;

  const { data: existing } = await admin
    .from("ai_conversations")
    .select("id")
    .eq("user_id", ownerId)
    .eq("title", title)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return (existing as any).id as string;

  const { data: created, error } = await admin
    .from("ai_conversations")
    .insert({
      user_id: ownerId,
      title,
      tone: "casual_tw",
      use_byok: false,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.warn("[bot-admin-conversation] create failed:", error?.message);
    return null;
  }
  return (created as any).id as string;
}

export type AdminMsg = { role: "user" | "assistant"; content: string };

/** 從 DB 載最近 N 句（依時間升冪、最舊在前）*/
export async function loadAdminHistory(convId: string, limit = 20): Promise<AdminMsg[]> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data as any[] ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
}

/** 把一輪對話寫進 DB（user + assistant 一起）*/
export async function saveAdminTurn(
  convId: string,
  userText: string,
  assistantText: string,
  modelTag: string,
) {
  const admin = createSupabaseAdmin();
  await admin.from("ai_messages").insert([
    { conversation_id: convId, role: "user", content: userText },
    { conversation_id: convId, role: "assistant", content: assistantText, model_used: modelTag },
  ]);
  await admin
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convId);
}

/** /clear 指令用：刪這個 conversation 下所有 messages（保留 conversation row）*/
export async function clearAdminConversation(convId: string) {
  const admin = createSupabaseAdmin();
  await admin.from("ai_messages").delete().eq("conversation_id", convId);
  await admin
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convId);
}
