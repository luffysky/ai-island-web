/**
 * 多通道 admin 即時通知（林董手機）
 *
 * 通道：
 *   ADMIN_LINE_CHANNEL_TOKEN + ADMIN_LINE_USER_ID — LINE Messaging API (200/月、留給 VIP)
 *   ADMIN_TELEGRAM_BOT_TOKEN + ADMIN_TELEGRAM_CHAT_ID — Telegram (無限免費、預設一般事件走這)
 *   ADMIN_DISCORD_WEBHOOK_URL — Discord Webhook (無限免費)
 *
 * Routing (省 LINE push 額度)：
 *   1. opts.routing = "line"/"telegram" → 強制
 *   2. kind 在 NOTIFY_LINE_PRIORITY_KINDS (預設 order,refund,breach,ticket) → LINE
 *   3. subjectUserId 對應的 user.username 在 NOTIFY_LINE_VIP_USERNAMES → LINE
 *   4. subjectUserId 在 NOTIFY_LINE_VIP_USER_IDS → LINE
 *   5. owner 自己的活動 → LINE
 *   6. 其他 → Telegram (沒設 TG → Discord → 最後才 LINE)
 *
 *   ADMIN_NOTIFY_ALL=1 → 全部通道都送 (debug)
 *
 * Rate limit：同一 kind+key 同 minute 內最多一次
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
  text: string;       // 訊息本文 (純文字 fallback)
  flex?: any;         // LINE Flex Message (有設就用 flex 替代 text)
  silent?: boolean;   // true = 不推送
  subjectUserId?: string; // 關於哪個 user 的活動 (用來查 opt-out + 判 VIP)
  routing?: "line" | "telegram" | "auto"; // 強制通道、預設 auto
};

// 重要事件 kind (一律 LINE)
const DEFAULT_LINE_PRIORITY_KINDS = ["order", "refund", "breach", "ticket", "user_ticket", "admin_login"];

function parseEnvList(name: string): Set<string> {
  const v = process.env[name];
  if (!v) return new Set();
  return new Set(v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
}

async function pickChannel(opts: NotifyOptions): Promise<"line" | "telegram" | "discord"> {
  // 1. 顯式指定
  if (opts.routing === "line") return "line";
  if (opts.routing === "telegram") return "telegram";

  const hasTg = !!(process.env.ADMIN_TELEGRAM_BOT_TOKEN && process.env.ADMIN_TELEGRAM_CHAT_ID);
  const hasDiscord = !!process.env.ADMIN_DISCORD_WEBHOOK_URL;
  const hasLine = !!process.env.ADMIN_LINE_CHANNEL_TOKEN;

  // 沒設 TG/Discord → 只剩 LINE (向後相容)
  if (!hasTg && !hasDiscord) return "line";

  // 2. 重要 kind
  const priorityKinds = parseEnvList("NOTIFY_LINE_PRIORITY_KINDS");
  const kindSet = priorityKinds.size > 0 ? priorityKinds : new Set(DEFAULT_LINE_PRIORITY_KINDS);
  if (kindSet.has(opts.kind.toLowerCase())) return hasLine ? "line" : (hasTg ? "telegram" : "discord");

  // 3. VIP user (uuid 或 username) — 不查 DB 也算（純 env 比對）
  if (opts.subjectUserId) {
    const vipIds = parseEnvList("NOTIFY_LINE_VIP_USER_IDS");
    if (vipIds.has(opts.subjectUserId.toLowerCase())) return hasLine ? "line" : "telegram";

    const vipNames = parseEnvList("NOTIFY_LINE_VIP_USERNAMES");
    if (vipNames.size > 0) {
      try {
        const { createSupabaseAdmin } = await import("./supabase-admin");
        const admin = createSupabaseAdmin();
        const { data } = await admin
          .from("profiles")
          .select("username, is_owner, role")
          .eq("id", opts.subjectUserId)
          .maybeSingle();
        const p = data as any;
        if (p) {
          // owner 自己永遠走 LINE
          if (p.is_owner === true) return hasLine ? "line" : "telegram";
          if (p.username && vipNames.has(String(p.username).toLowerCase())) return hasLine ? "line" : "telegram";
        }
      } catch {}
    }
  }

  // 4. 預設一般事件 → TG (省 LINE 額度)、TG 沒設 → Discord → LINE
  if (hasTg) return "telegram";
  if (hasDiscord) return "discord";
  return "line";
}

export async function notifyAdmin(opts: NotifyOptions): Promise<void> {
  if (opts.silent) return;

  // user 即時通知 opt-out 檢查：DB 仍照常寫入（統計不受影響）、只是不推 LINE
  if (opts.subjectUserId) {
    try {
      const { createSupabaseAdmin } = await import("./supabase-admin");
      const admin = createSupabaseAdmin();
      const { data } = await admin
        .from("profiles")
        .select("notify_admin_optout")
        .eq("id", opts.subjectUserId)
        .maybeSingle();
      if (data && (data as any).notify_admin_optout === true) return;
    } catch {
      // 查不到當沒設 opt-out、繼續推
    }
  }

  const dedupe = opts.dedupeKey ?? opts.text.slice(0, 80);
  if (!shouldPush(opts.kind, dedupe)) return;

  const text = `[${opts.kind}] ${opts.text}`;
  const all = process.env.ADMIN_NOTIFY_ALL === "1";

  // ADMIN_NOTIFY_ALL=1 → 全送 (debug)
  if (all) {
    const ps: Promise<unknown>[] = [];
    if (process.env.ADMIN_LINE_CHANNEL_TOKEN) {
      const { getAdminLineUsers } = await import("./admin-line-users");
      const { shouldUserReceive } = await import("./admin-line-prefs");
      for (const u of getAdminLineUsers()) {
        if (await shouldUserReceive(u.id, opts.kind)) {
          ps.push(sendLineMessaging(process.env.ADMIN_LINE_CHANNEL_TOKEN, u.id, text, opts.flex));
        }
      }
    }
    if (process.env.ADMIN_TELEGRAM_BOT_TOKEN && process.env.ADMIN_TELEGRAM_CHAT_ID) {
      ps.push(sendTelegram(process.env.ADMIN_TELEGRAM_BOT_TOKEN, process.env.ADMIN_TELEGRAM_CHAT_ID, text));
    }
    if (process.env.ADMIN_DISCORD_WEBHOOK_URL) {
      ps.push(sendDiscord(process.env.ADMIN_DISCORD_WEBHOOK_URL, text));
    }
    await Promise.allSettled(ps);
    return;
  }

  // 正常模式 — 用 routing 選一個通道
  const channel = await pickChannel(opts);
  try {
    if (channel === "line") {
      const lineChannel = process.env.ADMIN_LINE_CHANNEL_TOKEN;
      if (!lineChannel) return;
      const { getAdminLineUsers } = await import("./admin-line-users");
      const { shouldUserReceive } = await import("./admin-line-prefs");
      const users = getAdminLineUsers().filter((u) => u.id);
      const ps: Promise<unknown>[] = [];
      for (const u of users) {
        if (await shouldUserReceive(u.id, opts.kind)) {
          ps.push(sendLineMessaging(lineChannel, u.id, text, opts.flex));
        }
      }
      await Promise.allSettled(ps);
    } else if (channel === "telegram") {
      await sendTelegram(process.env.ADMIN_TELEGRAM_BOT_TOKEN!, process.env.ADMIN_TELEGRAM_CHAT_ID!, text);
    } else {
      await sendDiscord(process.env.ADMIN_DISCORD_WEBHOOK_URL!, text);
    }
  } catch (e) {
    console.warn(`[notify-admin] ${channel} failed:`, (e as any)?.message);
  }
}

async function sendLineMessaging(token: string, userId: string, text: string, flex?: any) {
  try {
    const messages = flex
      ? [flex] // Flex Message bubble / carousel
      : [{ type: "text", text: text.slice(0, 5000) }];
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: userId, messages }),
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
