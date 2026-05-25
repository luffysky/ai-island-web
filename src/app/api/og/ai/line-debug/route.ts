import { NextResponse } from "next/server";

/**
 * LINE channel token / secret 公開健檢
 *
 * 不需要登入、跟 /api/og/ai/debug 一樣
 * 不顯示 token / secret 本身、只顯示「有沒設 / 長度 / prefix」
 * 實際對 LINE API ping、看 token 是否還活
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

function envInfo(name: string) {
  const v = process.env[name];
  if (!v) return { set: false };
  return {
    set: true,
    length: v.length,
    prefix: v.slice(0, 8) + "***",
    suffix: "***" + v.slice(-4),
  };
}

async function pingLine(token: string) {
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.text().catch(() => "");
    return {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - t0,
      body: body.slice(0, 400),
    };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, error: e?.message ?? String(e) };
  }
}

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      ADMIN_LINE_CHANNEL_TOKEN: envInfo("ADMIN_LINE_CHANNEL_TOKEN"),
      ADMIN_LINE_CHANNEL_SECRET: envInfo("ADMIN_LINE_CHANNEL_SECRET"),
      ADMIN_LINE_USER_ID: envInfo("ADMIN_LINE_USER_ID"),
      USER_LINE_CHANNEL_TOKEN: envInfo("USER_LINE_CHANNEL_TOKEN"),
      USER_LINE_CHANNEL_SECRET: envInfo("USER_LINE_CHANNEL_SECRET"),
    },
    pings: {} as Record<string, any>,
    diagnosis: [] as string[],
  };

  // 對 LINE API /v2/bot/info ping、看 token 真實活不活
  if (process.env.ADMIN_LINE_CHANNEL_TOKEN) {
    result.pings.admin_bot = await pingLine(process.env.ADMIN_LINE_CHANNEL_TOKEN);
  }
  if (process.env.USER_LINE_CHANNEL_TOKEN) {
    result.pings.user_bot = await pingLine(process.env.USER_LINE_CHANNEL_TOKEN);
  }

  // Telegram bot 健檢 — getMe 驗 token、可選 sendMessage 試推一則
  result.env.ADMIN_TELEGRAM_BOT_TOKEN = envInfo("ADMIN_TELEGRAM_BOT_TOKEN");
  result.env.ADMIN_TELEGRAM_CHAT_ID = envInfo("ADMIN_TELEGRAM_CHAT_ID");
  if (process.env.ADMIN_TELEGRAM_BOT_TOKEN) {
    const t0 = Date.now();
    try {
      const me = await fetch(`https://api.telegram.org/bot${process.env.ADMIN_TELEGRAM_BOT_TOKEN}/getMe`, {
        signal: AbortSignal.timeout(5000),
      });
      const txt = await me.text();
      result.pings.telegram_bot = { ok: me.ok, status: me.status, ms: Date.now() - t0, body: txt.slice(0, 400) };
    } catch (e: any) {
      result.pings.telegram_bot = { ok: false, ms: Date.now() - t0, error: e?.message };
    }

    // 如果 chat_id 也設了、試推一則 (會吃 Telegram free unlimited、不傷)
    if (process.env.ADMIN_TELEGRAM_CHAT_ID) {
      const t1 = Date.now();
      try {
        const send = await fetch(`https://api.telegram.org/bot${process.env.ADMIN_TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.ADMIN_TELEGRAM_CHAT_ID,
            text: `🩺 AI 島 Telegram chat_id 驗證 @ ${new Date().toLocaleString("zh-TW")}`,
          }),
          signal: AbortSignal.timeout(5000),
        });
        const txt = await send.text();
        result.pings.telegram_push = { ok: send.ok, status: send.status, ms: Date.now() - t1, body: txt.slice(0, 400) };
      } catch (e: any) {
        result.pings.telegram_push = { ok: false, ms: Date.now() - t1, error: e?.message };
      }
    }
  }

  // diagnosis
  for (const [key, info] of Object.entries(result.env)) {
    const v = info as any;
    if (!v.set) {
      result.diagnosis.push(`❌ ${key} 未設`);
    } else {
      result.diagnosis.push(`✅ ${key} 已設、長度 ${v.length}、${v.prefix}...${v.suffix}`);
    }
  }

  result.diagnosis.push("");

  const adminPing = result.pings.admin_bot;
  if (!adminPing) {
    result.diagnosis.push("⚠️ ADMIN_LINE_CHANNEL_TOKEN 沒設、不檢查");
  } else if (adminPing.ok) {
    result.diagnosis.push(`✅ Admin bot token 有效 (${adminPing.status} / ${adminPing.ms}ms)`);
  } else if (adminPing.status === 401) {
    result.diagnosis.push(`❌ Admin bot token 401 — token 已失效、去 LINE Console → admin channel → Messaging API → Reissue channel access token`);
  } else {
    result.diagnosis.push(`⚠️ Admin bot ping 異常 ${adminPing.status ?? "(timeout)"}: ${adminPing.body ?? adminPing.error}`);
  }

  const userPing = result.pings.user_bot;
  if (!userPing) {
    result.diagnosis.push("⚠️ USER_LINE_CHANNEL_TOKEN 沒設、不檢查");
  } else if (userPing.ok) {
    result.diagnosis.push(`✅ User bot token 有效 (${userPing.status} / ${userPing.ms}ms)`);
  } else if (userPing.status === 401) {
    result.diagnosis.push(`❌ User bot token 401 — token 已失效、去 LINE Console → user channel → Messaging API → Reissue`);
  } else {
    result.diagnosis.push(`⚠️ User bot ping 異常 ${userPing.status ?? "(timeout)"}: ${userPing.body ?? userPing.error}`);
  }

  // Telegram diagnosis
  const tgBot = result.pings.telegram_bot;
  const tgPush = result.pings.telegram_push;
  if (tgBot) {
    if (tgBot.ok) {
      result.diagnosis.push(`✅ Telegram bot token 有效 (${tgBot.status} / ${tgBot.ms}ms)`);
      if (tgPush) {
        if (tgPush.ok) {
          result.diagnosis.push(`✅ Telegram chat_id 有效、push 成功 (你的 Telegram 應該已收到「🩺 驗證」訊息)`);
        } else if (tgPush.status === 400) {
          result.diagnosis.push(`❌ Telegram chat_id 錯：${tgPush.body} — 那串數字不是真實 chat_id、跟 @userinfobot 對話拿正確的`);
        } else if (tgPush.status === 403) {
          result.diagnosis.push(`❌ Telegram 403：你沒先跟這個 bot 對話、Telegram 不允許 bot 主動私訊。先 Telegram 找 bot 傳「hi」、再重試`);
        } else {
          result.diagnosis.push(`⚠️ Telegram push 異常 ${tgPush.status}: ${tgPush.body}`);
        }
      } else {
        result.diagnosis.push(`⚠️ ADMIN_TELEGRAM_CHAT_ID 沒設`);
      }
    } else {
      result.diagnosis.push(`❌ Telegram bot token 無效 ${tgBot.status}: ${tgBot.body}`);
    }
  } else if (process.env.ADMIN_TELEGRAM_BOT_TOKEN) {
    result.diagnosis.push("⚠️ Telegram bot token 設了但 ping 失敗");
  }

  result.diagnosis.push("");
  result.diagnosis.push("💡 註：webhook URL verify 綠燈 ≠ token 有效。LINE 那個按鈕只測 endpoint 收 200、不驗 token。");

  return NextResponse.json(result);
}
