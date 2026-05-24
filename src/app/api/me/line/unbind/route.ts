import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/** POST /api/me/line/unbind — 解除目前 user 的 LINE 綁定 */
export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  await admin
    .from("profiles")
    .update({
      line_user_id: null,
      line_bound_at: null,
      line_bind_code: null,
      line_bind_code_expires_at: null,
      line_notify_enabled: false,
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
