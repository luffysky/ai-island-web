import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

// POST /api/email/unsubscribe
// Body: { token, all?: boolean, prefs?: {...}, reason?: string }
//
// 用 token 驗證、不需登入
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: sub } = await admin
    .from("email_subscriptions")
    .select("id")
    .eq("unsubscribe_token", body.token)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const update: any = {
    updated_at: new Date().toISOString(),
  };

  if (body.all) {
    update.newsletter = false;
    update.product_updates = false;
    update.course_announcements = false;
    update.weekly_digest = false;
    update.unsubscribed_at = new Date().toISOString();
  } else if (body.prefs) {
    update.newsletter = !!body.prefs.newsletter;
    update.product_updates = !!body.prefs.product_updates;
    update.course_announcements = !!body.prefs.course_announcements;
    update.weekly_digest = !!body.prefs.weekly_digest;
  }

  if (body.reason) {
    update.unsubscribe_reason = body.reason;
  }

  const { error } = await admin
    .from("email_subscriptions")
    .update(update)
    .eq("id", sub.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
