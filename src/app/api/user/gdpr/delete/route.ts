import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GDPR Art.17 軟刪：標記 profile.deleted_at + 建立 7 天硬刪請求。
 * 使用者 7 天內可登入呼叫 /cancel 取消、超過 7 天 admin 手動硬刪。
 */
export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("gdpr_soft_delete_self");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 立刻登出此 session（client 端會再 signOut）
  return NextResponse.json({
    ok: true,
    request_id: data,
    message: "帳號已標記刪除、7 天內可登入取消、超過 7 天將永久刪除",
  });
}
