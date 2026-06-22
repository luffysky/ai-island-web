import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 一鍵把 Telegram webhook URL 註冊到 LINE bot
 * Telegram 要主動呼叫 setWebhook 一次、之後訊息才會推到我們 endpoint
 *
 * 用法：直接 POST 這個 URL (要 owner 登入) 一次就好、之後不用再跑
 *  curl -X POST https://your-site/api/admin/telegram/setup
 */
/**
 * Telegram bot 主選單命令（user 打 / 會彈出）
 * 命名規則：lowercase + underscore、最長 32 字元、最多 100 個
 */
const BOT_COMMANDS = [
  // 入門
  { command: "help", description: "📖 看完整命令清單" },
  { command: "whoami", description: "👤 看我的綁定狀態" },
  { command: "clear", description: "🧹 清對話歷史" },
  { command: "model", description: "🔄 切換 AI 模型" },
  // 報表 / 數據
  { command: "today", description: "📊 今日 KPI" },
  { command: "kpi", description: "📈 N 天 KPI（例 /kpi 7）" },
  { command: "online", description: "👥 線上人數" },
  { command: "sub", description: "💎 訂閱概覽" },
  { command: "orders", description: "💰 最近訂單" },
  { command: "ai_cost", description: "💸 AI 用量 / 成本" },
  { command: "quiz", description: "🧠 今日測驗統計" },
  { command: "island", description: "🏝️ 島嶼總覽" },
  // 用戶
  { command: "users", description: "👥 最近註冊" },
  { command: "churn", description: "⚠️ 流失預警" },
  { command: "leetcode", description: "💻 leetcode 進度" },
  // 動作
  { command: "notify", description: "📢 全站廣播（/notify 訊息）" },
  { command: "maint", description: "🛠️ 維護模式 on/off" },
  { command: "feature", description: "🚩 feature flag" },
  { command: "email", description: "✉️ 發信給 user" },
  { command: "refund", description: "💸 退款（/refund order_id）" },
  { command: "grant", description: "🎁 給點數（雙重確認）" },
  // 系統
  { command: "errors", description: "🐛 系統錯誤" },
  { command: "prefs", description: "🔔 通知偏好" },
];

async function run() {
  const token = process.env.ADMIN_TELEGRAM_BOT_TOKEN;
  // ⚠️ 一定要去尾斜線：NEXT_PUBLIC_SITE_URL 結尾有 "/" 的話、`${site}/api/...` 會變成
  // 「//api/telegram-webhook」雙斜線 → Next.js 回 308 Redirect → Telegram 不跟 redirect →
  // 更新永遠送不到 webhook handler → bot 完全沒反應。（這就是之前 TG AI 不回的真因。）
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet").replace(/\/+$/, "");
  if (!token) return NextResponse.json({ error: "ADMIN_TELEGRAM_BOT_TOKEN 未設" }, { status: 503 });

  const webhookUrl = `${site}/api/telegram-webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  const webhookParams: any = {
    url: webhookUrl,
    drop_pending_updates: true,
    allowed_updates: ["message", "edited_message"],
  };
  if (secret) webhookParams.secret_token = secret;

  try {
    // 1. setWebhook
    const webhookRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookParams),
      signal: AbortSignal.timeout(8000),
    });
    const webhookJ = await webhookRes.json();

    // 2. setMyCommands — 註冊主選單命令、打「/」彈選單
    const cmdsRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: BOT_COMMANDS, language_code: "" }),
      signal: AbortSignal.timeout(8000),
    });
    const cmdsJ = await cmdsRes.json();

    return NextResponse.json({
      webhook_url: webhookUrl,
      has_secret: !!secret,
      commands_count: BOT_COMMANDS.length,
      telegram_set_webhook: webhookJ,
      telegram_set_commands: cmdsJ,
      next_steps: webhookJ?.ok && cmdsJ?.ok
        ? [
            "✅ webhook + 命令選單都設定成功",
            "在 Telegram 找你的 bot 打「/」應該彈出 23 個命令選單",
            `已註冊 ${BOT_COMMANDS.length} 個命令（要加新命令、改 BOT_COMMANDS 後重打這個 API）`,
          ]
        : [
            webhookJ?.ok ? "✅ webhook OK" : `❌ webhook fail: ${webhookJ?.description}`,
            cmdsJ?.ok ? "✅ commands OK" : `❌ commands fail: ${cmdsJ?.description}`,
          ],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "fetch failed" }, { status: 502 });
  }
}

async function ownerGate(_req: NextRequest) {
  const gate = await requireAdmin();
  return gate.ok ? null : gate.response;
}

export async function POST(req: NextRequest) {
  const block = await ownerGate(req);
  if (block) return block;
  return run();
}

export async function GET(req: NextRequest) {
  const block = await ownerGate(req);
  if (block) return block;
  return run();
}
