import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 一鍵把 Telegram webhook URL 註冊到 LINE bot
 * Telegram 要主動呼叫 setWebhook 一次、之後訊息才會推到我們 endpoint
 *
 * 用法：直接 POST 這個 URL (要 owner 登入) 一次就好、之後不用再跑
 *  curl -X POST https://your-site/api/admin/telegram/setup
 */
async function run() {
  const token = process.env.ADMIN_TELEGRAM_BOT_TOKEN;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
  if (!token) return NextResponse.json({ error: "ADMIN_TELEGRAM_BOT_TOKEN 未設" }, { status: 503 });

  const webhookUrl = `${site}/api/telegram-webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  const params: any = {
    url: webhookUrl,
    drop_pending_updates: true,
    allowed_updates: ["message", "edited_message"],
  };
  if (secret) params.secret_token = secret;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(8000),
    });
    const j = await res.json();
    return NextResponse.json({
      webhook_url: webhookUrl,
      has_secret: !!secret,
      telegram_response: j,
      next_steps: j?.ok
        ? [
            "✅ webhook 設定成功",
            "在 Telegram 找你的 bot 傳「hi」測試、bot 應該秒回 AI 回應",
            "傳 /help 看指令清單",
            "首次需 owner 白名單、設 TELEGRAM_OWNER_USER_IDS 或 TELEGRAM_OWNER_USERNAMES",
          ]
        : [
            "❌ Telegram 拒絕設 webhook、看 telegram_response.description",
            "可能 token 錯、或 site URL 不是 https",
          ],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "fetch failed" }, { status: 502 });
  }
}

async function ownerGate(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized、先到網站登入 owner 再來" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["admin", "owner"].includes((profile as any)?.role ?? "")) {
    return NextResponse.json({ error: "forbidden、要 owner / admin 才能設" }, { status: 403 });
  }
  return null;
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
