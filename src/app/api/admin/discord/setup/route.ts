import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 一鍵註冊 Discord slash commands 到指定 application
 *
 * env:
 *   DISCORD_BOT_TOKEN         - bot token (Developer Portal Bot tab)
 *   DISCORD_APPLICATION_ID    - application id (General Info tab)
 *   DISCORD_GUILD_ID          - 選填、設了就註冊到該 guild (< 1 秒生效、適合測試)
 *                                不設則 global 註冊 (~1 小時 propagation)
 *
 * 用法: 登入 owner 後瀏覽器打:
 *   https://your-site/api/admin/discord/setup
 */

const COMMANDS = [
  {
    name: "ai",
    description: "跟 AI 對話 (用當前 model)",
    options: [
      {
        name: "prompt",
        description: "你想問什麼",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "model",
    description: "看可用 model 清單 + 當前選擇",
  },
  {
    name: "model_set",
    description: "切換 AI model",
    options: [
      {
        name: "name",
        description: "model_name (傳 /model 看清單)",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "clear",
    description: "清空對話歷史",
  },
  {
    name: "whoami",
    description: "看你的 Discord user_id (給設 DISCORD_OWNER_USER_IDS 用)",
  },
  {
    name: "help",
    description: "看指令清單",
  },
  // === 學員 slash commands（DC#7 + DC#1）===
  {
    name: "quote",
    description: "🎯 抽今日金句（不分 owner/學員）",
  },
  {
    name: "recommend",
    description: "📚 雪鑰推薦下一課（依你的進度）",
  },
  {
    name: "vision",
    description: "👁️ 上傳圖片問 AI（自動偵測程式碼 / UI / 錯誤訊息）",
    options: [
      {
        name: "image",
        description: "要分析的圖片",
        type: 11, // ATTACHMENT
        required: true,
      },
      {
        name: "question",
        description: "想問什麼（可選、不填會給通用分析）",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "bind",
    description: "🔗 看你的綁定狀態 / 重新綁定 AI 島帳號",
  },
];

async function run() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const appId = process.env.DISCORD_APPLICATION_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !appId) {
    return NextResponse.json(
      { error: "缺 DISCORD_BOT_TOKEN 或 DISCORD_APPLICATION_ID env" },
      { status: 503 },
    );
  }

  const url = guildId
    ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${appId}/commands`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(COMMANDS),
      signal: AbortSignal.timeout(10_000),
    });
    const j = await res.json().catch(() => null);

    return NextResponse.json({
      mode: guildId ? `guild (${guildId}、立即生效)` : "global (~1 小時 propagation)",
      registered_commands: COMMANDS.map((c) => `/${c.name}`),
      discord_response_status: res.status,
      discord_response: j,
      next_steps: res.ok
        ? [
            "✅ slash commands 註冊成功",
            "回到 Discord、應該秒看到 /ai /model 等指令",
            "確認你的 Discord user_id 已加進 DISCORD_OWNER_USER_IDS env",
            "傳 /whoami 看自己 user_id (如還沒設 env)",
            "傳 /ai 你好 測試",
          ]
        : [
            "❌ Discord 拒絕、看 discord_response.message",
            "401: bot token 錯",
            "403: token 沒權限 / app_id 對不上",
            "404: app_id 不存在",
          ],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "fetch failed" }, { status: 502 });
  }
}

async function ownerGate() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized、先到網站登入 owner 再來" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["admin", "owner"].includes((profile as any)?.role ?? "")) {
    return NextResponse.json({ error: "forbidden、要 owner / admin 才能設" }, { status: 403 });
  }
  return null;
}

export async function POST(_req: NextRequest) {
  const block = await ownerGate();
  if (block) return block;
  return run();
}

export async function GET(_req: NextRequest) {
  const block = await ownerGate();
  if (block) return block;
  return run();
}
