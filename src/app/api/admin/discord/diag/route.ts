import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Discord token / app_id 一致性診斷
 *
 * 用 BOT_TOKEN 打 GET /users/@me（bot 自己看自己）
 * 拿到的 application 資訊跟 env 比對、看是不是同一個 app
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const token = process.env.DISCORD_BOT_TOKEN;
  const appIdEnv = process.env.DISCORD_APPLICATION_ID;
  const guildIdEnv = process.env.DISCORD_GUILD_ID;

  if (!token) {
    return NextResponse.json({
      ok: false,
      stage: "env",
      error: "DISCORD_BOT_TOKEN 沒設",
    });
  }

  // 1. bot 自己是誰
  let me: any = null;
  let meErr: string | null = null;
  try {
    const r = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      meErr = `${r.status} ${await r.text().catch(() => "")}`;
    } else {
      me = await r.json();
    }
  } catch (e: any) {
    meErr = e?.message ?? "fetch fail";
  }

  // 2. bot 的 application info
  let app: any = null;
  let appErr: string | null = null;
  try {
    const r = await fetch("https://discord.com/api/v10/oauth2/applications/@me", {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      appErr = `${r.status} ${await r.text().catch(() => "")}`;
    } else {
      app = await r.json();
    }
  } catch (e: any) {
    appErr = e?.message ?? "fetch fail";
  }

  // 3. 比對 app_id
  const appIdFromToken = app?.id ?? me?.id ?? null;
  const appIdMatch = appIdFromToken && appIdEnv && appIdFromToken === appIdEnv;

  return NextResponse.json({
    ok: !meErr && !appErr && appIdMatch,
    bot: me ? { id: me.id, username: me.username, bot: me.bot, discriminator: me.discriminator } : null,
    bot_error: meErr,
    application: app ? { id: app.id, name: app.name, owner: app?.owner?.username } : null,
    application_error: appErr,
    env: {
      DISCORD_APPLICATION_ID: appIdEnv ?? null,
      DISCORD_GUILD_ID: guildIdEnv ?? null,
      DISCORD_BOT_TOKEN: token ? `[${token.length} chars, ends ...${token.slice(-6)}]` : null,
    },
    diagnosis: {
      bot_token_valid: !meErr,
      app_id_from_token: appIdFromToken,
      app_id_from_env: appIdEnv,
      app_id_match: appIdMatch,
      verdict: !meErr && appIdMatch
        ? "✅ token 跟 app_id 對齊、應該能註冊 commands"
        : !meErr && !appIdMatch
        ? `❌ token 對應到 app ${appIdFromToken}、但 env DISCORD_APPLICATION_ID = ${appIdEnv}、改 env 對齊`
        : meErr
        ? "❌ bot token 無效、去 Developer Portal Reset Token"
        : "❌ 未知狀態、看 bot_error / application_error",
    },
  });
}
