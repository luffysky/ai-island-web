/**
 * Admin notify 通道測試 — POST /api/admin/notify/test { channel }
 *
 * channel: "line_admin" | "telegram" | "discord" | "all"
 *
 * 直接呼叫 notifyAdmin 發一條測試訊息、檢查 3 個通道哪個壞了。
 * 林董問「通知沒出現」時、按一下就知道哪邊斷了 + error_logs 看具體原因。
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";
import { notifyAdmin } from "@/lib/notify-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { requireAdmin as adminGate } from "@/lib/admin-guard";

async function requireAdmin() {
  const gate = await adminGate();
  if (!gate.ok) return null;
  return { id: gate.userId, role: gate.role, username: gate.username };
}

export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { channel } = await req.json().catch(() => ({}));

  // env 檢查
  const env = {
    line_admin: !!(process.env.ADMIN_LINE_CHANNEL_TOKEN && process.env.ADMIN_LINE_USERS),
    telegram: !!(process.env.ADMIN_TELEGRAM_BOT_TOKEN && process.env.ADMIN_TELEGRAM_CHAT_ID),
    discord: !!process.env.ADMIN_DISCORD_WEBHOOK_URL,
  };

  const ts = new Date().toLocaleTimeString("zh-TW", { hour12: false, timeZone: "Asia/Taipei" });
  const text = `🧪 測試通知 — ${ts}（由 /admin 觸發、3 通道同時測）`;

  // 跑 notifyAdmin、它會根據 env 自動選通道
  try {
    await notifyAdmin({
      kind: "system",
      text,
      dedupeKey: `test:${Date.now()}`,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      env,
      error: e?.message ?? "unknown",
      hint: "通知 throw 了、看 stack",
    });
  }

  return NextResponse.json({
    ok: true,
    env,
    hint:
      "已觸發 notifyAdmin、各通道是否真送出去看 /admin/errors（notify-admin/* 失敗會記在那）。" +
      "1 分鐘內沒看到通知 + error_logs 也乾淨、可能 ADMIN_DISCORD_WEBHOOK_URL / TELEGRAM 等 env 沒設。",
    channel_requested: channel ?? "all",
  });
}
