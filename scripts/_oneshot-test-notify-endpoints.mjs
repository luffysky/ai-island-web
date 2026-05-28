/**
 * 直接打 LINE / Telegram / Discord 三個 endpoint、看 status & response。
 * 不印任何 token / webhook URL 值、只印「設了沒」+ HTTP 結果。
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);

const out = { env_presence: {}, results: {} };

function present(name) {
  out.env_presence[name] = env[name] ? `set (len ${env[name].length})` : "MISSING";
}

present("ADMIN_LINE_CHANNEL_TOKEN");
present("ADMIN_LINE_USER_ID");
present("ADMIN_LINE_USER_IDS");
present("ADMIN_TELEGRAM_BOT_TOKEN");
present("ADMIN_TELEGRAM_CHAT_ID");
present("ADMIN_DISCORD_WEBHOOK_URL");
present("CRON_SECRET");

// --- 1. LINE Messaging API 健康檢查（不送訊息、只驗 token + 列 quota）
if (env.ADMIN_LINE_CHANNEL_TOKEN) {
  try {
    const r = await fetch("https://api.line.me/v2/bot/message/quota", {
      headers: { Authorization: `Bearer ${env.ADMIN_LINE_CHANNEL_TOKEN}` },
      signal: AbortSignal.timeout(10_000),
    });
    const body = await r.text();
    out.results.line_quota = { status: r.status, body: body.slice(0, 300) };
  } catch (e) {
    out.results.line_quota = { error: e?.message, cause: e?.cause?.code ?? null };
  }
}

// --- 2. Telegram getMe（驗 token、不送訊息）
if (env.ADMIN_TELEGRAM_BOT_TOKEN) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.ADMIN_TELEGRAM_BOT_TOKEN}/getMe`, {
      signal: AbortSignal.timeout(10_000),
    });
    const body = await r.text();
    out.results.telegram_getme = { status: r.status, body: body.slice(0, 300) };
  } catch (e) {
    out.results.telegram_getme = { error: e?.message, cause: e?.cause?.code ?? null };
  }
}

// --- 3. Discord webhook GET（驗 webhook 還在、不送訊息）
if (env.ADMIN_DISCORD_WEBHOOK_URL) {
  try {
    const r = await fetch(env.ADMIN_DISCORD_WEBHOOK_URL, {
      signal: AbortSignal.timeout(10_000),
    });
    const body = await r.text();
    // 不印 url、只印 status + 是否能解析出 webhook id（不洩漏 token 段）
    out.results.discord_webhook = {
      status: r.status,
      has_id: /"id"/.test(body),
      has_channel: /"channel_id"/.test(body),
      body_first_120: body.slice(0, 120).replace(/"token"\s*:\s*"[^"]+"/, '"token":"***"'),
    };
  } catch (e) {
    out.results.discord_webhook = { error: e?.message, cause: e?.cause?.code ?? null };
  }
}

console.log(JSON.stringify(out, null, 2));
