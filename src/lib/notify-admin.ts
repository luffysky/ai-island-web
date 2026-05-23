/**
 * 多通道 admin 即時通知（林董手機）
 *
 * env 任一有設定就推（依序 LINE → Telegram → Discord → 全送）：
 *   ADMIN_LINE_NOTIFY_TOKEN     — LINE Notify 第三方相容（如 LineNotify Plus、notify-bot.line.me 替代）
 *   ADMIN_LINE_CHANNEL_TOKEN + ADMIN_LINE_USER_ID — LINE Messaging API（官方）
 *   ADMIN_TELEGRAM_BOT_TOKEN + ADMIN_TELEGRAM_CHAT_ID — Telegram Bot
 *   ADMIN_DISCORD_WEBHOOK_URL   — Discord Webhook（最簡單）
 *   ADMIN_NOTIFY_ALL=1          — 同時送所有設定好的通道（debug 用）
 *
 * Rate limit：同一 kind+key 同 minute 內最多一次（in-memory、單實例）
 * 失敗 silent、不影響主流程
 */

const recent = new Map<string, number>();

function shouldPush(kind: string, dedupeKey: string): boolean {
  const k = `${kind}:${dedupeKey}`;
  const now = Date.now();
  const last = recent.get(k) ?? 0;
  if (now - last < 60_000) return false;
  recent.set(k, now);
  // 清舊（>1h）
  if (recent.size > 500) {
    for (const [kk, ts] of recent) {
      if (now - ts > 3600_000) recent.delete(kk);
    }
  }
  return true;
}

export type NotifyOptions = {
  kind: string;       // 'login' / 'chapter_view' / 'lesson_complete' / 'admin_login' / 'order' / etc
  dedupeKey?: string; // 防 spam、預設 = kind+text 第 80 字
  text: string;       // 訊息本文
  silent?: boolean;   // true = 不推送
};

export async function notifyAdmin(opts: NotifyOptions): Promise<void> {
  if (opts.silent) return;
  const dedupe = opts.dedupeKey ?? opts.text.slice(0, 80);
  if (!shouldPush(opts.kind, dedupe)) return;

  const text = `[${opts.kind}] ${opts.text}`;
  const all = process.env.ADMIN_NOTIFY_ALL === "1";

  const promises: Promise<unknown>[] = [];

  const lineNotifyToken = process.env.ADMIN_LINE_NOTIFY_TOKEN;
  if (lineNotifyToken) {
    promises.push(sendLineNotify(lineNotifyToken, text));
    if (!all) return await Promise.allSettled(promises).then(() => {});
  }

  const lineChannel = process.env.ADMIN_LINE_CHANNEL_TOKEN;
  if (lineChannel) {
    // 多 admin：從 admin-line-users helper 取所有設定的 admin、各推一份
    const { getAdminLineUsers } = await import("./admin-line-users");
    const users = getAdminLineUsers().filter((u) => u.id);
    if (users.length > 0) {
      for (const u of users) {
        promises.push(sendLineMessaging(lineChannel, u.id, text));
      }
      if (!all) return await Promise.allSettled(promises).then(() => {});
    }
  }

  const tgBot = process.env.ADMIN_TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (tgBot && tgChat) {
    promises.push(sendTelegram(tgBot, tgChat, text));
    if (!all) return await Promise.allSettled(promises).then(() => {});
  }

  const discordUrl = process.env.ADMIN_DISCORD_WEBHOOK_URL;
  if (discordUrl) {
    promises.push(sendDiscord(discordUrl, text));
    if (!all) return await Promise.allSettled(promises).then(() => {});
  }

  await Promise.allSettled(promises);
}

async function sendLineNotify(token: string, text: string) {
  try {
    await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `message=${encodeURIComponent(text)}`,
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.warn("[notify-admin] line-notify failed:", (e as any)?.message);
  }
}

async function sendLineMessaging(token: string, userId: string, text: string) {
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: userId, messages: [{ type: "text", text: text.slice(0, 5000) }] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.warn("[notify-admin] line-messaging failed:", (e as any)?.message);
  }
}

async function sendTelegram(botToken: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.warn("[notify-admin] telegram failed:", (e as any)?.message);
  }
}

async function sendDiscord(url: string, text: string) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.slice(0, 1900) }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.warn("[notify-admin] discord failed:", (e as any)?.message);
  }
}
