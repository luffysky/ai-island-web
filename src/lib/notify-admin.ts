/**
 * 多通道 admin 即時通知
 *
 * 通道：
 *   ADMIN_LINE_CHANNEL_TOKEN + ADMIN_LINE_USER_ID — LINE Messaging API (200/月)
 *   ADMIN_TELEGRAM_BOT_TOKEN + ADMIN_TELEGRAM_CHAT_ID — Telegram (無限免費)
 *   ADMIN_DISCORD_WEBHOOK_URL — Discord Webhook (無限免費)
 *
 * Routing 規則 (由上而下、第一個 match 為準):
 *   1. opts.routing = "line"/"telegram" → 強制
 *   2. user 在 NOTIFY_DUAL_USERNAMES / NOTIFY_DUAL_USER_IDS → ★ 雙通知 LINE + Telegram ★
 *   3. user 是 owner (is_owner=true) / 在 NOTIFY_LINE_VIP_USERNAMES / NOTIFY_LINE_VIP_USER_IDS → LINE
 *   4. kind 在 NOTIFY_LINE_PRIORITY_KINDS (預設 order,refund,breach,ticket,user_ticket,admin_login) → LINE
 *   5. 其他 → Telegram (沒設 TG → Discord → 最後才 LINE)
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

type Channel = "line" | "telegram" | "discord";

/**
 * 決定一筆通知要送去哪些通道、可以多個 (例如 DUAL = LINE + Telegram)
 *
 * routing 規則：
 *  1. opts.routing 顯式指定
 *  2. subjectUserId 對應 user.username ∈ NOTIFY_DUAL_USERNAMES (或 uuid ∈ NOTIFY_DUAL_USER_IDS)
 *     → LINE + Telegram 雙通知
 *  3. kind ∈ NOTIFY_LINE_PRIORITY_KINDS (預設 order/refund/breach/ticket/user_ticket/admin_login)
 *     → LINE only
 *  4. subjectUserId 對應 owner / VIP → LINE only
 *  5. 其他 → Telegram only (TG 沒設 → Discord → LINE fallback)
 */
async function pickChannels(opts: NotifyOptions): Promise<Channel[]> {
  // 1. 顯式指定
  if (opts.routing === "line") return ["line"];
  if (opts.routing === "telegram") return ["telegram"];

  const hasTg = !!(process.env.ADMIN_TELEGRAM_BOT_TOKEN && process.env.ADMIN_TELEGRAM_CHAT_ID);
  const hasDiscord = !!process.env.ADMIN_DISCORD_WEBHOOK_URL;
  const hasLine = !!process.env.ADMIN_LINE_CHANNEL_TOKEN;

  // 沒設 TG/Discord → 只剩 LINE (向後相容)
  if (!hasTg && !hasDiscord) return ["line"];

  // 2 & 4. user-based routing (DUAL / VIP / owner)
  let isDual = false;
  let isVipOrOwner = false;
  if (opts.subjectUserId) {
    const dualIds = parseEnvList("NOTIFY_DUAL_USER_IDS");
    const vipIds = parseEnvList("NOTIFY_LINE_VIP_USER_IDS");
    if (dualIds.has(opts.subjectUserId.toLowerCase())) isDual = true;
    else if (vipIds.has(opts.subjectUserId.toLowerCase())) isVipOrOwner = true;

    const dualNames = parseEnvList("NOTIFY_DUAL_USERNAMES");
    const vipNames = parseEnvList("NOTIFY_LINE_VIP_USERNAMES");
    if (!isDual && !isVipOrOwner && (dualNames.size > 0 || vipNames.size > 0)) {
      try {
        const { createSupabaseAdmin } = await import("./supabase-admin");
        const admin = createSupabaseAdmin();
        const { data } = await admin
          .from("profiles")
          .select("username, is_owner")
          .eq("id", opts.subjectUserId)
          .maybeSingle();
        const p = data as any;
        if (p) {
          const uname = String(p.username ?? "").toLowerCase();
          if (uname && dualNames.has(uname)) isDual = true;
          else if (p.is_owner === true) isVipOrOwner = true;
          else if (uname && vipNames.has(uname)) isVipOrOwner = true;
        }
      } catch {}
    }
  }

  if (isDual) {
    // 雙通知 — LINE + Telegram (LINE 沒設則只 TG、TG 沒設則只 LINE)
    const channels: Channel[] = [];
    if (hasLine) channels.push("line");
    if (hasTg) channels.push("telegram");
    if (channels.length === 0 && hasDiscord) channels.push("discord");
    return channels;
  }
  if (isVipOrOwner) return [hasLine ? "line" : (hasTg ? "telegram" : "discord")];

  // 3. 重要 kind
  const priorityKinds = parseEnvList("NOTIFY_LINE_PRIORITY_KINDS");
  const kindSet = priorityKinds.size > 0 ? priorityKinds : new Set(DEFAULT_LINE_PRIORITY_KINDS);
  if (kindSet.has(opts.kind.toLowerCase())) return [hasLine ? "line" : (hasTg ? "telegram" : "discord")];

  // 5. 預設一般事件 → TG (省 LINE 額度)、TG 沒設 → Discord → LINE
  if (hasTg) return ["telegram"];
  if (hasDiscord) return ["discord"];
  return ["line"];
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

  // 正常模式 — 用 routing 選一個或多個通道 (DUAL user = LINE + TG)
  const channels = await pickChannels(opts);
  const ps: Promise<unknown>[] = [];
  for (const channel of channels) {
    if (channel === "line") {
      const lineChannel = process.env.ADMIN_LINE_CHANNEL_TOKEN;
      if (!lineChannel) continue;
      const { getAdminLineUsers } = await import("./admin-line-users");
      const { shouldUserReceive } = await import("./admin-line-prefs");
      for (const u of getAdminLineUsers().filter((u) => u.id)) {
        if (await shouldUserReceive(u.id, opts.kind)) {
          ps.push(sendLineMessaging(lineChannel, u.id, text, opts.flex));
        }
      }
    } else if (channel === "telegram") {
      ps.push(sendTelegram(process.env.ADMIN_TELEGRAM_BOT_TOKEN!, process.env.ADMIN_TELEGRAM_CHAT_ID!, text, opts.kind));
    } else {
      ps.push(sendDiscord(process.env.ADMIN_DISCORD_WEBHOOK_URL!, text));
    }
  }
  await Promise.allSettled(ps);
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

// 根據 kind 推斷後台對應路徑、產生「打開後台」按鈕
function kindToAdminPath(kind: string): string | null {
  const map: Record<string, string> = {
    order: "/orders",
    refund: "/orders",
    breach: "/breach",
    ticket: "/tickets",
    user_ticket: "/crm",
    admin_login: "/audit",
    new_signup: "/users",
    new_user: "/users",
    error: "/errors",
    error_log: "/errors",
    ai_cost: "/ai/usage",
    chapter_view: "/analytics",
    lesson_complete: "/analytics",
    level_up: "/users",
    achievement: "/achievements",
  };
  return map[kind.toLowerCase()] ?? null;
}

// Telegram MarkdownV2 escape (保護重要字符)
function tgEscape(s: string): string {
  return s.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

async function sendTelegram(botToken: string, chatId: string, text: string, kind?: string) {
  try {
    // 解析 text: 第一行是 [kind] xxx、後面是內容
    const m = text.match(/^\[(\w+)\]\s*(.+?)\n?([\s\S]*)$/);
    let formatted: string;
    if (m) {
      const [, k, summary, rest] = m;
      formatted = `*🔔 [${tgEscape(k)}]*\n${tgEscape(summary)}`;
      if (rest.trim()) formatted += `\n\n${tgEscape(rest.trim())}`;
    } else {
      formatted = tgEscape(text);
    }

    const path = kind ? kindToAdminPath(kind) : null;
    const body: any = {
      chat_id: chatId,
      text: formatted.slice(0, 4000),
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    };

    if (path) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
      const slug = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";
      body.reply_markup = {
        inline_keyboard: [[
          { text: `📊 打開後台 ${path}`, url: `${site}/${slug}/admin${path}` },
        ]],
      };
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
