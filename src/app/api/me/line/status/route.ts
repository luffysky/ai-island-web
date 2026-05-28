import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * 回傳當前 user 的 LINE 綁定狀態。
 * 為什麼要 server-side：client 直接 select profiles.line_user_id 在某些 RLS 設定下
 * 會被遮蔽、結果 banner 永遠以為「沒綁」一直跳出來。
 */
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ bound: false, authed: false });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("line_user_id, line_notify_enabled, line_bound_at")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    authed: true,
    bound: !!data?.line_user_id,
    notifyEnabled: data?.line_notify_enabled ?? null,
    boundAt: data?.line_bound_at ?? null,
  });
}
