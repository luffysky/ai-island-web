import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MULTICAST_BATCH = 500;

/**
 * POST /api/admin/line/broadcast
 *   { text, respect_optout: boolean }
 *
 * 群發 LINE 訊息給綁定用戶、自動分批 500/次。
 * respect_optout=true（建議）：line_notify_enabled=true 的才推
 * respect_optout=false：所有綁定都推（強制、重要公告用）
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({} as any));
  const text = String(body.text ?? "").trim();
  const respectOptout = body.respect_optout !== false;
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });

  const token = process.env.USER_LINE_CHANNEL_TOKEN || process.env.ADMIN_LINE_CHANNEL_TOKEN;
  if (!token) return NextResponse.json({ error: "no_channel_token" }, { status: 503 });

  const admin = createSupabaseAdmin();
  let query = admin
    .from("profiles")
    .select("line_user_id")
    .not("line_user_id", "is", null);
  if (respectOptout) query = query.eq("line_notify_enabled", true);
  const { data: rows } = await query;

  const lineUserIds = (rows as any[] ?? []).map((r) => r.line_user_id).filter(Boolean);
  if (lineUserIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, total: 0, message: "no_target" });
  }

  // multicast 分批
  let sent = 0;
  const errors: any[] = [];
  for (let i = 0; i < lineUserIds.length; i += MULTICAST_BATCH) {
    const batch = lineUserIds.slice(i, i + MULTICAST_BATCH);
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: batch,
          messages: [{ type: "text", text: text.slice(0, 4900) }],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        sent += batch.length;
      } else {
        const err = await res.text().catch(() => "");
        errors.push({ batch_start: i, status: res.status, error: err.slice(0, 200) });
      }
    } catch (e: any) {
      errors.push({ batch_start: i, error: e?.message });
    }
  }

  // audit
  await admin.from("audit_logs").insert({
    actor_id: gate.userId,
    actor_username: gate.username,
    action: "admin.line_broadcast",
    target_type: "broadcast",
    changes: {
      respect_optout: respectOptout,
      target_count: lineUserIds.length,
      sent,
      text_preview: text.slice(0, 200),
      errors_count: errors.length,
    },
  });

  return NextResponse.json({
    ok: errors.length === 0,
    sent,
    total: lineUserIds.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
