import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAdminLineUsers } from "@/lib/admin-line-users";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 主動 push 一則測試訊息到 LINE
 *
 * 用途：webhook 驗證已綠但 user 看不到回覆時、確認 channel token + LINE 通道沒問題。
 *
 * POST body:
 *   { bot: "user" | "admin", to: "Uxxxxx" (選、預設用 ADMIN_LINE_USER_ID), text: "..." }
 *
 * 邏輯：
 *   - bot=admin 用 ADMIN_LINE_CHANNEL_TOKEN
 *   - bot=user  用 USER_LINE_CHANNEL_TOKEN
 *   - to 沒帶 → 從 ADMIN_LINE_USERS / ADMIN_LINE_USER_ID 取第一個
 *   - LINE 回什麼直接 pass-through、可看到真實 HTTP code + body
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({} as any));
  const bot = body.bot === "user" ? "user" : "admin";
  const text = String(body.text ?? `🩺 AI 島測試 push @ ${new Date().toLocaleTimeString("zh-TW")}`);

  const token = bot === "user"
    ? process.env.USER_LINE_CHANNEL_TOKEN
    : process.env.ADMIN_LINE_CHANNEL_TOKEN;

  if (!token) {
    return NextResponse.json({
      ok: false,
      step: "env",
      error: `${bot === "user" ? "USER" : "ADMIN"}_LINE_CHANNEL_TOKEN 未設`,
    }, { status: 503 });
  }

  let to = String(body.to ?? "").trim();
  if (!to) {
    const admins = getAdminLineUsers();
    to = admins[0]?.id ?? "";
  }
  if (!to || !to.startsWith("U")) {
    return NextResponse.json({
      ok: false,
      step: "target",
      error: "缺收訊息的 LINE userId、body.to 帶 Uxxx 或先設 ADMIN_LINE_USER_ID",
    }, { status: 400 });
  }

  // 對 LINE API push
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text: text.slice(0, 4900) }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const respText = await res.text();
    let respJson: any = null;
    try { respJson = JSON.parse(respText); } catch {}

    if (!res.ok) {
      const hint = res.status === 400 ? "to 可能不是這個 bot 的好友、或 LINE userId 錯"
        : res.status === 401 ? "Token 無效、重新拿"
        : res.status === 403 ? "Token 沒 push 權限、或 channel 設定有問題"
        : res.status === 429 ? "月度 push 額度用完 (免費 OA=200 則/月、Premium $88/月=500 則) 或瞬時限速。去 manager.line.biz → Insights → Messages 查用量、等 10 分鐘可重試"
        : "看 line_body";
      return NextResponse.json({
        ok: false,
        step: "line_api",
        bot,
        to,
        line_status: res.status,
        line_body: respJson ?? respText.slice(0, 600),
        hint,
      });
    }

    return NextResponse.json({
      ok: true,
      bot,
      to,
      sent_text: text,
      hint: "✅ LINE 回 200、訊息應該已送達。沒收到代表這個 LINE userId 沒加這個 bot 好友",
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      step: "fetch_throw",
      bot,
      error: e?.message ?? "unknown",
      hint: "fetch 連不到 LINE、可能 server 沒網 / DNS / firewall",
    }, { status: 502 });
  }
}
