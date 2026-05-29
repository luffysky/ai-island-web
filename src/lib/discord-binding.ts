/**
 * Discord OAuth 綁定 + role / DM helpers
 *
 * 流程：
 *   1. user 在 /me/settings 按「綁 Discord」→ redirect 到 Discord OAuth authorize
 *   2. Discord 回 callback /api/auth/discord/callback?code=xxx
 *   3. callback exchange code → access_token + refresh_token
 *   4. 拿 user info → user_discord_bind 寫入
 *   5. 自動加 guild + DM 歡迎（onboarding）
 *   6. 如果有 active subscription → 立刻 assign VIP role
 */

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey, encryptKey } from "@/lib/ai-crypto";

const DC = "https://discord.com/api/v10";

export function getDiscordOAuthURL(stateToken: string): string {
  const clientId = process.env.DISCORD_APPLICATION_ID;
  const redirect = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet"}/api/auth/discord/callback`;
  const scopes = ["identify", "guilds.join"]; // guilds.join 讓我們可主動加 guild
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId ?? "");
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", stateToken);
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token: string } | null> {
  const clientId = process.env.DISCORD_APPLICATION_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const redirect = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet"}/api/auth/discord/callback`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
  });
  const r = await fetch(`${DC}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return { access_token: j.access_token, refresh_token: j.refresh_token };
}

export async function fetchDiscordUser(accessToken: string): Promise<{ id: string; username: string; avatar: string | null } | null> {
  const r = await fetch(`${DC}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return { id: j.id, username: j.username, avatar: j.avatar };
}

/** 把 user 加進 guild（主動 join、不用 invite link） */
export async function joinGuild(userId: string, accessToken: string): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return false;
  const r = await fetch(`${DC}/guilds/${guildId}/members/${userId}`, {
    method: "PUT",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
    signal: AbortSignal.timeout(8000),
  });
  return r.ok || r.status === 204; // 204 = already in guild
}

/** Premium role 自動分配（DC#4） */
export async function assignVipRole(discordUserId: string): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_VIP_ROLE_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !roleId || !botToken) return false;
  const r = await fetch(`${DC}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
    method: "PUT",
    headers: { Authorization: `Bot ${botToken}` },
    signal: AbortSignal.timeout(8000),
  });
  return r.ok || r.status === 204;
}

export async function revokeVipRole(discordUserId: string): Promise<boolean> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_VIP_ROLE_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !roleId || !botToken) return false;
  const r = await fetch(`${DC}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bot ${botToken}` },
    signal: AbortSignal.timeout(8000),
  });
  return r.ok || r.status === 204;
}

/** DM 一段訊息（DC#5 onboarding 用） */
export async function sendDM(discordUserId: string, content: string, embeds?: any[]): Promise<boolean> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;
  try {
    // 1. 開 DM channel
    const cr = await fetch(`${DC}/users/@me/channels`, {
      method: "POST",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: discordUserId }),
      signal: AbortSignal.timeout(8000),
    });
    if (!cr.ok) return false;
    const channel = await cr.json();
    // 2. send message
    const mr = await fetch(`${DC}/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900), embeds: embeds ?? [] }),
      signal: AbortSignal.timeout(8000),
    });
    return mr.ok;
  } catch {
    return false;
  }
}

/** 寫入 bind 紀錄 + 觸發後續流程（DM、role） */
export async function recordBinding(userId: string, discord: { id: string; username: string; avatar: string | null }, refreshToken: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("user_discord_bind").upsert({
    user_id: userId,
    discord_user_id: discord.id,
    discord_username: discord.username,
    discord_avatar: discord.avatar,
    oauth_token_encrypted: encryptKey(refreshToken),
    bound_at: new Date().toISOString(),
  });

  // 檢查是否有 active subscription、有就 assign role（DC#4 自動觸發）
  const { data: sub } = await admin.from("subscriptions").select("status").eq("user_id", userId).eq("status", "active").maybeSingle();
  if (sub) {
    await assignVipRole(discord.id).catch(() => false);
    await admin.from("user_discord_bind").update({ last_role_sync_at: new Date().toISOString() }).eq("user_id", userId);
  }

  // DC#5: DM 歡迎一次
  const { data: onb } = await admin.from("user_discord_onboarding").select("dm_welcome_sent_at").eq("user_id", userId).maybeSingle();
  if (!onb?.dm_welcome_sent_at) {
    await sendDM(discord.id,
      "歡迎來到 AI 島 🏝️",
      [{
        title: "🎉 已成功綁定 Discord！",
        description: [
          "我是雪鑰、AI 島的小幫手~",
          "",
          "**你可以這樣用 Discord：**",
          "• `/quote` 抽今日金句",
          "• `/recommend` 推下一課",
          "• `/vision` 上傳圖片問 AI",
          "",
          "**已解鎖權限：**",
          "• 每日金句頻道自動 push",
          "• 學習里程碑成就播報",
          "• 訂閱 Premium → 自動拿 VIP 紫色名牌",
        ].join("\n"),
        color: 0xbd93f9,
        footer: { text: "AI 島 · 學員 Discord 流" },
      }],
    );
    await admin.from("user_discord_onboarding").upsert({
      user_id: userId,
      dm_welcome_sent_at: new Date().toISOString(),
    });
  }
}

/** 從 user_id 取 discord_user_id（給 payment webhook 等用） */
export async function getDiscordIdForUser(userId: string): Promise<string | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("user_discord_bind").select("discord_user_id").eq("user_id", userId).maybeSingle();
  return (data as any)?.discord_user_id ?? null;
}
