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
  // 200 = token 活 + 能取 bot info
  // 401 = token 死 / 無效
  // 其他 = 看 body
  if (process.env.ADMIN_LINE_CHANNEL_TOKEN) {
    result.pings.admin_bot = await pingLine(process.env.ADMIN_LINE_CHANNEL_TOKEN);
  }
  if (process.env.USER_LINE_CHANNEL_TOKEN) {
    result.pings.user_bot = await pingLine(process.env.USER_LINE_CHANNEL_TOKEN);
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

  result.diagnosis.push("");
  result.diagnosis.push("💡 註：webhook URL verify 綠燈 ≠ token 有效。LINE 那個按鈕只測 endpoint 收 200、不驗 token。");

  return NextResponse.json(result);
}
