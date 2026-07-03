import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/push/unsubscribe
 * body: { endpoint }  移除本裝置的訂閱（限本人）。
 */
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const endpoint = b?.endpoint ?? b?.subscription?.endpoint;
  if (!endpoint) return NextResponse.json({ error: "validation" }, { status: 422 });

  const admin = createSupabaseAdmin();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)
    .then(() => {}, () => {});

  return NextResponse.json({ ok: true });
}
