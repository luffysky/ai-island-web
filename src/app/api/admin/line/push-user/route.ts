import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/line/push-user
 *   { userId, text }   或   { lineUserId, text }
 *
 * 推單則訊息給特定 user 的 LINE（bypass user opt-out、admin 強制推）。
 * 用 USER_LINE_CHANNEL_TOKEN（fallback ADMIN_LINE_CHANNEL_TOKEN）。
 * 寫 audit_logs 留紀錄。
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({} as any));
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });

  let lineUserId: string | null = body.lineUserId ?? null;
  let targetUsername: string | null = null;

  if (!lineUserId && body.userId) {
    const admin = createSupabaseAdmin();
    const { data: target } = await admin
      .from("profiles")
      .select("line_user_id, username")
      .eq("id", body.userId)
      .maybeSingle();
    if (!target?.line_user_id) {
      return NextResponse.json({ error: "user_not_bound" }, { status: 400 });
    }
    lineUserId = target.line_user_id as string;
    targetUsername = target.username;
  }

  if (!lineUserId) return NextResponse.json({ error: "no_target" }, { status: 400 });

  const token = process.env.USER_LINE_CHANNEL_TOKEN || process.env.ADMIN_LINE_CHANNEL_TOKEN;
  if (!token) return NextResponse.json({ error: "no_channel_token" }, { status: 503 });

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text: text.slice(0, 4900) }],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return NextResponse.json({ error: `line_${res.status}`, message: err.slice(0, 200) }, { status: 500 });
    }

    // audit
    const admin = createSupabaseAdmin();
    await admin.from("audit_logs").insert({
      actor_id: gate.userId,
      actor_username: gate.username,
      action: "admin.line_push_user",
      target_type: "user",
      target_id: body.userId ?? null,
      changes: { line_user_id: lineUserId, target_username: targetUsername, text_preview: text.slice(0, 100) },
      ip: req.headers.get("x-forwarded-for") || null,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "push_failed", message: e?.message }, { status: 500 });
  }
}
