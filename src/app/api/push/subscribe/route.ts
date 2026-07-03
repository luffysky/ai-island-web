import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/push/subscribe
 * body: { subscription: PushSubscriptionJSON }  (endpoint + keys.p256dh + keys.auth)
 * 存/更新登入 user 的 push 訂閱（以 endpoint 唯一）。
 */
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const sub = b?.subscription ?? b;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "validation", message: "缺 endpoint / keys" }, { status: 422 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        ua: req.headers.get("user-agent")?.slice(0, 400) ?? null,
      },
      { onConflict: "endpoint" },
    );
  if (error) return NextResponse.json({ error: "db", message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
