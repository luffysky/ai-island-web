import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { sendPushToUser, isPushEnabled } from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/push/test
 * 送一則測試 push 給自己（確認訂閱有效）。
 */
export async function POST() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!isPushEnabled()) {
    return NextResponse.json({ ok: false, message: "推播尚未設定（VAPID 未設）" }, { status: 200 });
  }

  const sent = await sendPushToUser(user.id, {
    title: "AI 島 · 測試通知",
    body: "推播設定成功！以後有人讚你的作品、連勝快斷時都會通知你。",
    url: "/creator-island/community",
    tag: "push-test",
  });

  return NextResponse.json({ ok: true, sent });
}
